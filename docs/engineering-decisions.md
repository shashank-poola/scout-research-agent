# Engineering Decisions

## Decision 1: LangGraph for AI Workflow

**What:** Used LangGraph StateGraph instead of a single chained LLM call.

**Alternatives considered:**
- Single LLM call with a mega-prompt — simple but produces lower quality, no retry logic, no observability per step
- Celery task chain — mature queue system but heavy infrastructure (Redis + worker processes) for a 3-day build
- Manual async pipeline (sequential `await` calls) — workable but no built-in state, no conditional routing, harder to extend

**Decision:** LangGraph gives shared typed state across nodes, conditional routing (retry loop on low quality score), and node-level progress events — all with minimal infrastructure.

**Tradeoff:** LangGraph adds a learning curve and abstracts away raw Python control flow. Debugging graph execution is harder than debugging a simple function chain.

---

## Decision 2: SQLite for Persistence

**What:** Used SQLite via SQLModel instead of a hosted database.

**Alternatives considered:**
- PostgreSQL — production-grade, concurrent writes, connection pooling. Requires Docker or a hosted service, adds setup friction
- MongoDB — flexible schema but introduces a second dependency with no clear advantage for this use case
- In-memory (no persistence) — simplest but loses all sessions on restart

**Decision:** SQLite requires zero infrastructure and stores everything in a single file. For a 3-day assignment with one concurrent user, it is the right tradeoff.

**Tradeoff:** SQLite has a single writer lock — concurrent workflow runs on multiple sessions would serialize at the DB layer. Migrating to PostgreSQL later is straightforward with SQLAlchemy (change `DATABASE_URL`, adjust `create_engine` config).

---

## Decision 3: SSE for Real-Time Progress (not WebSockets)

**What:** Used Server-Sent Events (SSE) via FastAPI `StreamingResponse` instead of WebSockets.

**Alternatives considered:**
- WebSockets — bidirectional, lower latency, but requires a separate connection upgrade and more complex client management
- HTTP polling — simple but wastes requests and adds 1–5 second lag per update
- Long-polling — single open request but complex timeout/reconnect handling

**Decision:** Progress updates are strictly server → client (node completions, quality scores). SSE is HTTP-native, auto-reconnects in browsers, works through proxies, and requires no extra library on either side.

**Tradeoff:** SSE cannot receive messages from the client — any future need for bidirectional workflow control (pause, cancel) would require a separate REST call alongside the SSE stream, or a switch to WebSockets.

---

## Top Technical Debt Items

1. **In-memory progress store** — `services/progress.py` uses a plain dict. Lost on server restart; breaks if running multiple Uvicorn workers. Should be Redis or DB-backed.

2. **No chat history truncation** — `chat.py` loads all messages and the full report content into every request. Long conversations will exceed model context limits.

3. **No retry logic on Exa search** — `exa_client.py` returns an empty list on exception. A failed search silently produces a worse report with no indication to the user.

4. **No tests** — zero unit or integration tests. Any refactor risks silent regressions.

5. **BackgroundTasks for workflow** — FastAPI `BackgroundTasks` runs in the same process. A crash or restart kills in-flight workflows with no recovery. Should use a proper task queue (ARQ + Redis or Celery).

---

## Biggest Technical Risk

**In-memory progress state + single-process workflow execution.**

If the server restarts mid-workflow, the session is stuck at `status=running` forever with no recovery path. The client SSE stream would reconnect but find no active progress state, returning an error. There is no mechanism to resume or re-run from the last completed node.

Mitigation path: persist workflow checkpoints to the database (LangGraph supports this natively with `SqliteSaver` or `PostgresSaver`), and move execution to a durable task queue.

---

## What I Would Improve with 2 More Weeks

1. **Durable workflow execution** — switch BackgroundTasks → ARQ (async Redis queue) + LangGraph `SqliteSaver` for checkpoint/resume. Sessions survive server restarts.

2. **Streaming LLM output** — stream tokens from Groq to the frontend during analysis, so users see the report being written in real-time instead of waiting for the full response.

3. **Test suite** — pytest + HTTPX async client for API integration tests; mock Exa + Groq for unit tests on graph nodes.

4. **Better report UI** — render the markdown analysis directly in the browser alongside the PDF panel, with section anchors and collapsible sections.

5. **Auth** — simple JWT auth (FastAPI-Users or a single API key header) so sessions are user-scoped rather than global.
