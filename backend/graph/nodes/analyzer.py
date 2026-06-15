"""Analyzer node — synthesizes raw research into an 8-section structured analysis."""

import logging
from langchain_core.messages import SystemMessage, HumanMessage
from services.llm import get_llm
from services.prompts import ANALYZER_SYSTEM, ANALYZER_HUMAN
from graph.state import ResearchState

logger = logging.getLogger(__name__)

_MAX_SOURCES = 20
_MAX_CHARS_PER_SOURCE = 1500


def _format_research_data(results: list[dict]) -> str:
    """Format raw Exa results into a clean, token-efficient context block."""
    sections = []
    for i, r in enumerate(results[:_MAX_SOURCES], 1):
        text = (r.get("text") or "").strip()[:_MAX_CHARS_PER_SOURCE]
        highlights = r.get("highlights") or []
        highlight_text = " | ".join(h for h in highlights[:3] if h)

        section = f"[{i}] {r.get('title', 'Untitled')}\nURL: {r.get('url', '')}"
        if highlight_text:
            section += f"\nKey points: {highlight_text}"
        if text:
            section += f"\nContent: {text}"
        sections.append(section)

    return "\n\n---\n\n".join(sections)


async def analyzer_node(state: ResearchState) -> dict:
    llm = get_llm()
    results = state.get("raw_results", [])
    research_data = _format_research_data(results)

    messages = [
        SystemMessage(content=ANALYZER_SYSTEM),
        HumanMessage(content=ANALYZER_HUMAN.format(
            company_name=state["company_name"],
            research_objective=state["research_objective"],
            research_data=research_data,
        )),
    ]
    response = await llm.ainvoke(messages)

    logger.info(
        "Analyzer produced %d chars of analysis for '%s'",
        len(response.content),
        state["company_name"],
    )
    return {"analysis": response.content}
