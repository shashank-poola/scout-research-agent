import asyncio
from typing import Optional

# per-session: {queue, events list, done flag}
_sessions: dict[int, dict] = {}


def init(session_id: int) -> None:
    _sessions[session_id] = {"queue": asyncio.Queue(), "events": [], "done": False}


async def emit(session_id: int, event: dict) -> None:
    s = _sessions.get(session_id)
    if s:
        s["events"].append(event)
        await s["queue"].put(event)


async def finish(session_id: int, event: dict) -> None:
    s = _sessions.get(session_id)
    if s:
        done_event = {**event, "done": True}
        s["events"].append(done_event)
        s["done"] = True
        await s["queue"].put(done_event)


def get(session_id: int) -> Optional[dict]:
    return _sessions.get(session_id)


def cleanup(session_id: int) -> None:
    _sessions.pop(session_id, None)
