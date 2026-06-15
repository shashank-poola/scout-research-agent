from typing import Any
from exa_py import Exa
from core.config import settings

_client: Exa | None = None


def get_exa() -> Exa:
    global _client
    if _client is None:
        _client = Exa(api_key=settings.exa_api_key)
    return _client


async def search_web(query: str, num_results: int = 5) -> list[dict[str, Any]]:
    exa = get_exa()
    response = exa.search_and_contents(
        query,
        num_results=num_results,
        text=True,
        highlights=True,
    )
    return [
        {
            "url": r.url,
            "title": r.title,
            "text": r.text or "",
            "highlights": r.highlights or [],
        }
        for r in response.results
    ]
