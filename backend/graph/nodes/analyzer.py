from langchain_core.prompts import ChatPromptTemplate
from services.llm import get_llm
from graph.state import ResearchState

_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a business analyst. Synthesize the research results into a structured analysis covering: company overview, products/services, market position, recent news, and strategic insights."),
    ("human", "Company: {company_name}\nObjective: {research_objective}\n\nResearch data:\n{research_data}"),
])


async def analyzer_node(state: ResearchState) -> dict:
    llm = get_llm()
    results = state.get("raw_results", [])
    research_data = "\n\n".join(
        f"[Source: {r.get('url', 'unknown')}]\n{r.get('text', '')[:1000]}"
        for r in results[:20]
    )
    chain = _prompt | llm
    response = await chain.ainvoke({
        "company_name": state["company_name"],
        "research_objective": state["research_objective"],
        "research_data": research_data,
    })
    return {"analysis": response.content}
