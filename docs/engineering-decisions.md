# Engineering Decisions

## Decision 1 — LangGraph for the AI Workflow

### What we chose
A 5-node LangGraph `StateGraph` with shared typed state, conditional routing, and a quality-gated retry loop.

### Alternatives considered

| Option | Why we didn't choose it |
|--------|------------------------|
| Single LLM call with a mega-prompt | Lower quality output, no per-step observability, no retry logic, no way to stream intermediate progress |
| Manual sequential `await` chain | Workable but no built-in state, no conditional routing, harder to add/remove nodes later |
| Celery task chain | Mature but heavy requires Redis + separate worker process for a 3-day build |

### Why LangGraph
- **Shared typed state** (`ResearchState` TypedDict) means every node reads and writes a single source of truth — no parameter threading
- **Conditional routing** enables the quality retry loop without any custom orchestration code
- **Node-level events** map directly to SSE progress messages — clean separation between the workflow and the streaming layer
- **Extensible** — adding a new node (e.g., a competitor deep-dive) is one `add_node` + `add_edge` call

### Tradeoff
LangGraph adds abstraction over raw Python control flow. Debugging a graph execution is harder than reading a linear function chain. Stack traces go through LangGraph internals before reaching your code.

---

## Decision 2 — SQLite for Persistence

### What we chose
SQLite via SQLModel (which wraps SQLAlchemy + Pydantic in a single model definition).

### Alternatives considered

| Option | Why we didn't choose it |
|--------|------------------------|
| PostgreSQL | Production-grade, concurrent writes, connection pooling, but requires Docker or a hosted service. Adds setup friction for a local assignment. |
| MongoDB | Flexible schema but no relational joins and no clear advantage for this use case. |
| No persistence (in-memory) | Simplest but loses all sessions on server restart. |

### Why SQLite
Zero infrastructure. Everything lives in a single file (`scout.db`). For one concurrent user on a local machine, the single-writer limitation never triggers.

### Tradeoff
SQLite serializes concurrent writes - two simultaneous workflow runs would queue at the database layer. Migrating to PostgreSQL later is a one-line change (`DATABASE_URL=postgresql://...`) because SQLAlchemy abstracts the dialect.

---

## Decision 3 — SSE for Real-Time Progress (not WebSockets)

### What we chose
Server-Sent Events via FastAPI `StreamingResponse` with an append-only in-memory event store and index-based consumer tracking.

### Alternatives considered

| Option | Why we didn't choose it |
|--------|------------------------|
| WebSockets | Bidirectional, lower latency — but requires connection upgrade, more complex client management, and we don't need client → server push during streaming |
| HTTP polling | Simple to implement but adds 1–5 second lag per update and wastes requests |
| Long-polling | Single open request but complex timeout/reconnect handling |

### Why SSE
Progress events are strictly server → client. SSE is HTTP-native, auto-reconnects in browsers, works through proxies and load balancers without special config, and requires no extra library on either side.

The append-only event store design means late-connecting clients (e.g., page refresh mid-research) automatically replay all past events from the beginning — no missed updates, no queue deduplication bugs.

### Tradeoff
SSE is unidirectional. Any future need for bidirectional workflow control (pause, cancel, inject feedback mid-run) would require a separate REST call alongside the stream, or a full switch to WebSockets.

---

## Top Technical Debt Items

**1. In-memory progress store**
`services/progress.py` uses a plain Python dict. State is lost on server restart. Running two Uvicorn workers would mean SSE consumers on worker B never see events emitted by worker A.
Fix: replace with Redis pub/sub or a DB-backed event log.

**2. No chat history truncation**
`chat.py` loads all chat messages + the full `report_content` into every LLM request. A long conversation on a large report will exceed the model's context window.
Fix: sliding window (keep last N messages) or vector search over report chunks.

**3. No retry on Exa search failures**
`exa_client.py` catches exceptions and returns an empty list silently. A failed search produces a thinner report with no user-visible indication.
Fix: exponential backoff retry (2–3 attempts), surface partial failure in progress events.

**4. No tests**
Zero unit or integration tests. Any refactor risks silent regressions across 5 graph nodes and 4 API route modules.
Fix: pytest + HTTPX async client for API tests; mock Exa + Groq for unit tests on nodes.

**5. BackgroundTasks for workflow execution**
FastAPI `BackgroundTasks` runs in the same process as the API server. A server restart kills all in-flight workflows permanently — session stays stuck at `status=running` with no recovery.
Fix: ARQ (async Redis queue) or Celery with LangGraph `SqliteSaver` checkpoints for resume.

---

## Biggest Technical Risk

**In-memory progress state + single-process workflow execution.**

If the server crashes or restarts mid-workflow:
- The session stays at `status=running` forever with no automatic recovery
- The SSE client reconnects but finds no active progress state and receives an error
- There is no mechanism to resume from the last completed node

The root cause is that workflow execution and progress state both live inside the Python process with no external durability. LangGraph natively supports checkpointing via `SqliteSaver` and `PostgresSaver` — adding this would make the workflow resumable across restarts. Combined with a proper task queue (ARQ + Redis), this risk is fully mitigated.

---

## What I Would Improve with 2 More Weeks

| Priority | Improvement |
|----------|------------|
| 1 | **Durable task queue** - ARQ + Redis for workflow execution + LangGraph `SqliteSaver` for checkpoint/resume |
| 2 | **Streaming LLM output** - stream tokens from Groq during the Analyzer node so users see the report being written in real time |
| 3 | **Inline source citations** - pass Exa URLs through the analyzer prompt, cite `[1]`, `[2]`, append a Sources section to the PDF |
| 4 | **Test suite** - pytest + HTTPX async client for all routes; mock Groq + Exa for node unit tests |
| 5 | **Auth** - simple API key or JWT so sessions are user-scoped rather than global |
