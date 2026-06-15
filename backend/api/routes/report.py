from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_session
from models.session import ResearchSession

router = APIRouter(prefix="/sessions", tags=["report"])


class ReportResponse(BaseModel):
    session_id: int
    company_name: str
    website: str
    research_objective: str
    analysis: Optional[str]
    quality_score: Optional[float]
    report_path: Optional[str]
    status: str


@router.get("/{session_id}/report", response_model=ReportResponse)
async def get_report_json(session_id: int, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "done":
        raise HTTPException(status_code=400, detail=f"Report not ready — status: {session.status}")
    return ReportResponse(
        session_id=session.id,
        company_name=session.company_name,
        website=session.website,
        research_objective=session.research_objective,
        analysis=session.report_content,
        quality_score=session.quality_score,
        report_path=session.report_path,
        status=session.status,
    )


@router.get("/{session_id}/report/pdf")
async def download_report(session_id: int, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "done" or not session.report_path:
        raise HTTPException(status_code=404, detail="Report not ready")

    path = Path(session.report_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file missing")

    # HTML report — renders natively in browser iframe, no native libs needed
    if path.suffix == ".html":
        return FileResponse(
            path=str(path),
            media_type="text/html",
            headers={"Content-Disposition": "inline"},
        )

    # PDF fallback (if WeasyPrint was used)
    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=f"scout_{session.company_name.lower().replace(' ', '_')}.pdf",
    )
