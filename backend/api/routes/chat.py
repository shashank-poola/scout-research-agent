from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from core.database import get_session
from models.session import ResearchSession
from models.chat import ChatMessage
from services.llm import get_llm
from services.prompts import CHAT_SYSTEM_PROMPT
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

router = APIRouter(prefix="/sessions", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    role: str
    content: str


@router.post("/{session_id}/chat", response_model=ChatResponse)
async def chat(session_id: int, body: ChatRequest, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "done":
        raise HTTPException(status_code=400, detail="Research not complete yet")
    if not session.report_content:
        raise HTTPException(status_code=400, detail="No report content available")

    history = db.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()

    system_prompt = CHAT_SYSTEM_PROMPT.format(
        company_name=session.company_name,
        report_content=session.report_content,
    )

    messages = [SystemMessage(content=system_prompt)]
    for m in history:
        if m.role == "user":
            messages.append(HumanMessage(content=m.content))
        else:
            messages.append(AIMessage(content=m.content))
    messages.append(HumanMessage(content=body.message))

    llm = get_llm()
    response = await llm.ainvoke(messages)

    db.add(ChatMessage(session_id=session_id, role="user", content=body.message))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=response.content))
    db.commit()

    return ChatResponse(role="assistant", content=response.content)


@router.get("/{session_id}/chat/history", response_model=list[ChatResponse])
async def chat_history(session_id: int, db: Session = Depends(get_session)):
    messages = db.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()
    return [ChatResponse(role=m.role, content=m.content) for m in messages]
