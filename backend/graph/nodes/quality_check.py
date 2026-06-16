"""Quality check node — scores the analysis and decides whether to retry research."""

import json
import re
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from services.llm import get_llm
from services.prompts import QUALITY_SYSTEM, QUALITY_HUMAN
from graph.state import ResearchState

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> dict:
    """Robustly extract a JSON object from LLM output (handles markdown fences)."""
    # Direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Extract first {...} block
    match = re.search(r"\{[\s\S]*?\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return {}


async def quality_check_node(state: ResearchState) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=QUALITY_SYSTEM),
        HumanMessage(content=QUALITY_HUMAN.format(
            research_objective=state["research_objective"],
            analysis=state.get("analysis", ""),
        )),
    ]
    response = await llm.ainvoke(messages)
    data = _extract_json(response.content)

    if not data:
        logger.warning("Quality check JSON parse failed for '%s' — defaulting to score=0.0", state["company_name"])

    score = float(data.get("score", 0.0))
    feedback = data.get("feedback", "Parse failed — requires retry")

    logger.info(
        "Quality check score=%.2f for '%s': %s",
        score,
        state["company_name"],
        feedback,
    )
    return {"quality_score": score, "quality_feedback": feedback}
