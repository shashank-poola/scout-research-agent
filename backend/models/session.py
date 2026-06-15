from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class ResearchSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_name: str
    website: str
    research_objective: str
    status: str = "pending"  # pending | running | done | error
    report_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
