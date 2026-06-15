from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from core.database import get_session
from models.session import ResearchSession
from models.chat import ChatMessage
from services.llm import get_llm
from langchain_core.messages import HumanMessage, SystemMessage

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    role: str
    content: str


@router.post("/{session_id}", response_model=ChatResponse)
async def chat(session_id: int, body: ChatRequest, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "done":
        raise HTTPException(status_code=400, detail="Report not ready yet")

    history = db.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()

    # Persist user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=body.message)
    db.add(user_msg)

    # Build LLM messages
    llm = get_llm()
    messages = [
        SystemMessage(content=(
            f"You are an AI assistant that answers questions about {session.company_name}. "
            "Answer ONLY based on the research report content. If the answer is not in the report, say so."
        )),
        *[
            HumanMessage(content=m.content) if m.role == "user"
            else SystemMessage(content=m.content)
            for m in history
        ],
        HumanMessage(content=body.message),
    ]

    response = await llm.ainvoke(messages)
    assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=response.content)
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(role="assistant", content=response.content)


@router.get("/{session_id}/history", response_model=list[ChatResponse])
async def chat_history(session_id: int, db: Session = Depends(get_session)):
    messages = db.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()
    return [ChatResponse(role=m.role, content=m.content) for m in messages]
