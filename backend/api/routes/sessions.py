from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from core.database import get_session
from models.session import ResearchSession

router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    company_name: str
    website: str
    research_objective: str


@router.post("/", response_model=ResearchSession)
async def create_session(body: CreateSessionRequest, db: Session = Depends(get_session)):
    session = ResearchSession(**body.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=ResearchSession)
async def get_session_by_id(session_id: int, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/", response_model=list[ResearchSession])
async def list_sessions(db: Session = Depends(get_session)):
    return db.exec(select(ResearchSession).order_by(ResearchSession.created_at.desc())).all()
