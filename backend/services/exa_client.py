"""Exa web search client. Wraps the synchronous Exa SDK in a thread executor."""

import asyncio
from typing import Any
from exa_py import Exa
from core.config import settings

_client: Exa | None = None


def _get_exa() -> Exa:
    global _client
    if _client is None:
        _client = Exa(api_key=settings.exa_api_key)
    return _client


def _sync_search(query: str, num_results: int) -> list[dict[str, Any]]:
    """Synchronous Exa call — must be run in a thread executor."""
    response = _get_exa().search_and_contents(
        query,
        num_results=num_results,
        text=True,
        highlights=True,
    )
    return [
        {
            "url": r.url,
            "title": r.title or "",
            "text": r.text or "",
            "highlights": r.highlights or [],
        }
        for r in response.results
    ]


async def search_web(query: str, num_results: int = 5) -> list[dict[str, Any]]:
    """Async wrapper — runs the blocking Exa SDK call off the event loop."""
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(None, _sync_search, query, num_results)
    except Exception:
        return []
