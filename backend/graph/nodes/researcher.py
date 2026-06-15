"""Researcher node — runs all search queries in parallel via Exa."""

import asyncio
import logging
from services.exa_client import search_web
from graph.state import ResearchState

logger = logging.getLogger(__name__)

_MAX_RESULTS_PER_QUERY = 5


async def researcher_node(state: ResearchState) -> dict:
    queries = state.get("search_queries", [])
    existing = state.get("raw_results", [])

    # Run all queries concurrently — each is already async (thread-offloaded)
    tasks = [search_web(q, num_results=_MAX_RESULTS_PER_QUERY) for q in queries]
    results_per_query = await asyncio.gather(*tasks, return_exceptions=True)

    new_results: list[dict] = []
    for i, result in enumerate(results_per_query):
        if isinstance(result, Exception):
            logger.warning("Search failed for query %d: %s", i, result)
            continue
        new_results.extend(result)

    logger.info(
        "Researcher collected %d results from %d queries",
        len(new_results),
        len(queries),
    )
    return {"raw_results": existing + new_results}
