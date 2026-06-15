from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session
from core.database import get_session
from models.session import ResearchSession

router = APIRouter(prefix="/report", tags=["report"])


@router.get("/{session_id}/download")
async def download_report(session_id: int, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "done" or not session.report_path:
        raise HTTPException(status_code=404, detail="Report not ready")
    return FileResponse(
        path=session.report_path,
        media_type="application/pdf",
        filename=f"scout_report_{session.company_name.lower().replace(' ', '_')}.pdf",
    )
