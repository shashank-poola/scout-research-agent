import re
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
async def download_report(session_id: int, download: bool = False, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status != "done" or not session.report_path:
        raise HTTPException(status_code=404, detail="Report not ready")

    path = Path(session.report_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file missing")

    # ASCII-safe slug — em-dashes and non-ASCII chars break Content-Disposition headers
    raw = session.company_name.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^\w\s]", "", raw.lower())
    slug = re.sub(r"\s+", "_", slug).strip("_")[:40] or "report"

    if path.suffix == ".html":
        disposition = f'attachment; filename="scout_{slug}.html"' if download else "inline"
        return FileResponse(
            path=str(path),
            media_type="text/html",
            headers={"Content-Disposition": disposition},
        )

    # Real PDF
    if download:
        return FileResponse(
            path=str(path),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="scout_{slug}.pdf"'},
        )
    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )
