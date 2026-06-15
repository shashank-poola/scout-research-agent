from services.exa_client import search_web
from graph.state import ResearchState


async def researcher_node(state: ResearchState) -> dict:
    queries = state.get("search_queries", [])
    existing = state.get("raw_results", [])
    new_results = []
    for query in queries:
        results = await search_web(query, num_results=5)
        new_results.extend(results)
    return {"raw_results": existing + new_results}
