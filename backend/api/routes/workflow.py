from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from datetime import datetime
from core.database import get_session
from models.session import ResearchSession
from graph.workflow import workflow

router = APIRouter(prefix="/workflow", tags=["workflow"])


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

    background_tasks.add_task(_execute_workflow, session_id)
    return {"message": "Workflow started", "session_id": session_id}


async def _execute_workflow(session_id: int) -> None:
    from core.database import engine
    from sqlmodel import Session as DBSession

    with DBSession(engine) as db:
        session = db.get(ResearchSession, session_id)
        if not session:
            return
        try:
            result = await workflow.ainvoke({
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
            })
            session.status = "done" if not result.get("error") else "error"
            session.report_path = result.get("report_path")
        except Exception as e:
            session.status = "error"
        finally:
            session.updated_at = datetime.utcnow()
            db.add(session)
            db.commit()
