from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="researchsession.id")
    role: str  # user | assistant
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
