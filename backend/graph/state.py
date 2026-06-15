from typing import Any, Optional
from typing_extensions import TypedDict


class ResearchState(TypedDict):
    session_id: int
    company_name: str
    website: str
    research_objective: str
    search_queries: list[str]
    raw_results: list[dict[str, Any]]
    analysis: str
    quality_score: float
    quality_feedback: str
    report_html: str
    report_path: Optional[str]
    error: Optional[str]
