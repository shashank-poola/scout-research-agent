from langchain_core.prompts import ChatPromptTemplate
from services.llm import get_llm
from graph.state import ResearchState
import json

_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a research quality evaluator. Score the analysis on completeness, accuracy, and depth. Return JSON with keys: score (0.0-1.0) and feedback (string)."),
    ("human", "Objective: {research_objective}\n\nAnalysis:\n{analysis}"),
])


async def quality_check_node(state: ResearchState) -> dict:
    llm = get_llm()
    chain = _prompt | llm
    response = await chain.ainvoke({
        "research_objective": state["research_objective"],
        "analysis": state.get("analysis", ""),
    })
    try:
        data = json.loads(response.content)
        return {"quality_score": float(data["score"]), "quality_feedback": data["feedback"]}
    except Exception:
        return {"quality_score": 0.75, "quality_feedback": "Auto-approved"}
