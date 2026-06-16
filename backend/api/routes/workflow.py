"""Workflow execution and SSE progress streaming."""

import copy
import json
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from core.database import engine, get_session
from models.session import ResearchSession
from graph.workflow import workflow
import services.progress as progress

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["workflow"])

_SSE_PING_INTERVAL = 25.0   # seconds between keepalive pings
_SSE_POLL_INTERVAL = 0.25   # seconds between event-list polls


@router.post("/{session_id}/run")
async def run_workflow(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "running":
        raise HTTPException(status_code=409, detail="Workflow already running")

    session.status = "running"
    session.updated_at = datetime.now(timezone.utc)
    db.add(session)
    db.commit()

    progress.init(session_id)
    background_tasks.add_task(_execute_workflow, session_id)
    return {"message": "Workflow started", "session_id": session_id}


@router.get("/{session_id}/stream")
async def stream_progress(session_id: int):
    """
    SSE endpoint for live workflow progress.

    Uses an index into the append-only events list so:
    - Late-connecting clients automatically replay all past events
    - No queue duplication bugs
    - Multiple simultaneous consumers work correctly
    """
    async def event_generator():
        state = progress.get(session_id)
        if state is None:
            yield _sse({"error": "No active workflow for this session"})
            return

        idx = 0
        last_ping = asyncio.get_event_loop().time()

        while True:
            # Drain any new events
            events = state["events"]
            while idx < len(events):
                yield _sse(events[idx])
                if events[idx].get("done"):
                    return
                idx += 1

            # If workflow finished and we've sent everything, close
            if state["done"] and idx >= len(events):
                return

            # Keepalive ping
            now = asyncio.get_event_loop().time()
            if now - last_ping >= _SSE_PING_INTERVAL:
                yield _sse({"ping": True})
                last_ping = now

            await asyncio.sleep(_SSE_POLL_INTERVAL)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _execute_workflow(session_id: int) -> None:
    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        if not session:
            return

        initial_state = {
            "session_id": session_id,
            "company_name": session.company_name,
            "website": session.website,
            "research_objective": session.research_objective,
            "search_queries": [],
            "raw_results": [],
            "analysis": "",
            "quality_score": 0.0,
            "quality_feedback": "",
            "report_html": "",
            "report_path": None,
            "error": None,
        }

        final_state = copy.deepcopy(initial_state)
        try:
            async for chunk in workflow.astream(initial_state):
                node_name = next(iter(chunk))
                final_state.update(chunk[node_name])
                progress.emit(session_id, {
                    "node": node_name,
                    "status": "complete",
                    "quality_score": final_state.get("quality_score"),
                })
                logger.debug("Node '%s' complete for session %d", node_name, session_id)

            if final_state.get("error"):
                session.status = "error"
            else:
                session.status = "done"
                session.report_path = final_state.get("report_path")
                session.report_content = final_state.get("analysis")
                session.quality_score = final_state.get("quality_score")

            progress.finish(session_id, {
                "node": "done",
                "status": session.status,
            })
            logger.info(
                "Workflow complete for session %d — status=%s quality=%.2f",
                session_id,
                session.status,
                session.quality_score or 0,
            )

        except Exception as exc:
            logger.exception("Workflow error for session %d", session_id)
            session.status = "error"
            progress.finish(session_id, {
                "node": "error",
                "status": "error",
                "message": str(exc),
            })
        finally:
            session.updated_at = datetime.now(timezone.utc)
            db.add(session)
            db.commit()
