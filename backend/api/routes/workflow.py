import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from core.database import get_session
from models.session import ResearchSession
from graph.workflow import workflow
import services.progress as progress

router = APIRouter(prefix="/sessions", tags=["workflow"])


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
    session.updated_at = datetime.utcnow()
    db.add(session)
    db.commit()

    progress.init(session_id)
    background_tasks.add_task(_execute_workflow, session_id)
    return {"message": "Workflow started", "session_id": session_id}


@router.get("/{session_id}/stream")
async def stream_progress(session_id: int):
    async def event_generator():
        state = progress.get(session_id)
        if state is None:
            yield f"data: {json.dumps({'error': 'No active workflow for this session'})}\n\n"
            return

        # replay events already emitted (handles late connections)
        for event in state["events"]:
            yield f"data: {json.dumps(event)}\n\n"

        if state["done"]:
            return

        q: asyncio.Queue = state["queue"]
        # skip already-replayed events
        skip = len(state["events"])
        count = 0
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=60.0)
                count += 1
                if count <= skip:
                    continue
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("done"):
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'ping': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


async def _execute_workflow(session_id: int) -> None:
    from core.database import engine
    from sqlmodel import Session as DBSession

    with DBSession(engine) as db:
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

        final_state = initial_state.copy()
        try:
            async for chunk in workflow.astream(initial_state):
                node_name = list(chunk.keys())[0]
                final_state.update(chunk[node_name])
                await progress.emit(session_id, {
                    "node": node_name,
                    "status": "complete",
                    "quality_score": final_state.get("quality_score"),
                })

            if final_state.get("error"):
                session.status = "error"
            else:
                session.status = "done"
                session.report_path = final_state.get("report_path")
                session.report_content = final_state.get("analysis")
                session.quality_score = final_state.get("quality_score")

            await progress.finish(session_id, {
                "node": "done",
                "status": session.status,
                "report_path": session.report_path,
            })

        except Exception as e:
            session.status = "error"
            await progress.finish(session_id, {"node": "error", "status": "error", "message": str(e)})
        finally:
            session.updated_at = datetime.utcnow()
            db.add(session)
            db.commit()
