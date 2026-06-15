from langchain_core.prompts import ChatPromptTemplate
from services.llm import get_llm
from graph.state import ResearchState

_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a research planner. Generate 5 targeted search queries to research the given company."),
    ("human", "Company: {company_name}\nWebsite: {website}\nObjective: {research_objective}\n\nReturn exactly 5 search queries, one per line, no numbering."),
])


async def planner_node(state: ResearchState) -> dict:
    llm = get_llm()
    chain = _prompt | llm
    response = await chain.ainvoke({
        "company_name": state["company_name"],
        "website": state["website"],
        "research_objective": state["research_objective"],
    })
    queries = [q.strip() for q in response.content.strip().split("\n") if q.strip()]
    return {"search_queries": queries[:5]}
