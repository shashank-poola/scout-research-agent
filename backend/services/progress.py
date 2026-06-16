"""
In-memory progress tracking for workflow sessions.

Uses an append-only events list + index-based streaming so any number of
SSE consumers can connect at any time without duplicates or missed events.
"""

from typing import Optional, TypedDict


class ProgressState(TypedDict):
    events: list[dict]
    done: bool


_sessions: dict[int, ProgressState] = {}


def init(session_id: int) -> None:
    _sessions[session_id] = {"events": [], "done": False}


def emit(session_id: int, event: dict) -> None:
    s = _sessions.get(session_id)
    if s:
        s["events"].append(event)


def finish(session_id: int, event: dict) -> None:
    s = _sessions.get(session_id)
    if s:
        s["events"].append({**event, "done": True})
        s["done"] = True


def get(session_id: int) -> Optional[ProgressState]:
    return _sessions.get(session_id)


def cleanup(session_id: int) -> None:
    _sessions.pop(session_id, None)
