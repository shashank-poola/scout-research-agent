"""Planner node — generates targeted search queries from the research objective."""

import logging
from langchain_core.messages import SystemMessage, HumanMessage
from services.llm import get_llm
from services.prompts import PLANNER_SYSTEM, PLANNER_HUMAN
from graph.state import ResearchState

logger = logging.getLogger(__name__)


async def planner_node(state: ResearchState) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=PLANNER_SYSTEM),
        HumanMessage(content=PLANNER_HUMAN.format(
            company_name=state["company_name"],
            website=state["website"],
            research_objective=state["research_objective"],
        )),
    ]
    response = await llm.ainvoke(messages)
    queries = [
        line.strip()
        for line in response.content.strip().splitlines()
        if line.strip()
    ][:6]

    logger.info("Planner generated %d queries for '%s'", len(queries), state["company_name"])
    return {"search_queries": queries}
