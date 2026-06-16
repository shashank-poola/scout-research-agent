# Architecture

## System Overview

```
┌─────────────────────────────────────┐
│          Browser (React 19)         │
│   Dashboard · Chat · PDF Viewer     │
└──────────────┬──────────────────────┘
               │  REST + SSE
               ▼
┌─────────────────────────────────────┐
│        FastAPI (Python 3.13)        │
│  /sessions  /workflow  /report      │
│  /chat      /health    /stream      │
└──────┬──────────────┬───────────────┘
       │              │
       ▼              ▼
  SQLite DB      LangGraph Workflow
  (SQLModel)          │
                      ├──► Groq API  (Llama 3.3 70B)
                      └──► Exa API   (neural web search)
                            │
                            ▼
                      storage/reports/
                      (PDF files on disk)
```

---

## LangGraph Workflow

```
┌─────────┐    ┌────────────┐    ┌──────────┐    ┌───────────────┐
│ Planner │───►│ Researcher │───►│ Analyzer │───►│ Quality Check │
└─────────┘    └────────────┘    └──────────┘    └───────┬───────┘
                    ▲                                     │
                    │  score < 0.7 (retry loop)           │  score ≥ 0.7
                    └─────────────────────────────────────┤
                                                          ▼
                                               ┌──────────────────┐
                                               │ Report Generator │───► END
                                               └──────────────────┘
```

### What Each Node Does

**Planner**
- Receives: `company_name`, `website`, `research_objective`
- Calls Groq LLM to generate exactly 6 search queries
- Each query targets a specific angle: overview, market, competitors, news, financials, technology
- Outputs: `search_queries: list[str]`

**Researcher**
- Receives: `search_queries`
- Runs all 6 queries against Exa in parallel via `asyncio.gather`
- Fetches up to 5 results per query: title, URL, highlights, page content
- Outputs: `raw_results: list[dict]`

**Analyzer**
- Receives: `raw_results` (capped at 10 sources, 600 chars each for token efficiency)
- Calls Groq LLM to synthesize findings into an 8-section structured markdown report
- Sections: Executive Summary, Company Overview, Products & Services, Market Position, Competitive Landscape, Recent Developments, Financial Signals, Risks & Opportunities
- Outputs: `analysis: str`

**Quality Check**
- Receives: `analysis`, `research_objective`
- Calls Groq LLM to score the analysis on 3 dimensions (0.0–1.0 each):
  - `section_coverage` — are all 8 sections present and substantive?
  - `data_specificity` — are concrete numbers and named entities cited?
  - `objective_alignment` — does the analysis address the stated objective?
- Final score = average of 3 dimensions
- Returns JSON: `{"score": 0.85, "feedback": "..."}`
- Outputs: `quality_score: float`, `quality_feedback: str`

**Report Generator**
- Receives: `analysis`
- Parses markdown sections and builds a styled A4 PDF using ReportLab
- Saves PDF to `storage/reports/report_{session_id}.pdf`
- Outputs: `report_path: str`, `report_html: str`

### Routing Logic

```python
if quality_score >= 0.7  →  generate_report
if quality_score < 0.7   →  researcher  (retry)
if error                 →  END
```

---

## Real-Time Streaming (SSE)

```
BackgroundTask starts workflow
         │
         │  emits event per node via progress.emit()
         ▼
In-memory store: { session_id: { events: [...], done: bool } }
         │
         │  GET /sessions/{id}/stream
         ▼
StreamingResponse (text/event-stream)
  - Index-based drain: client replays all past events on connect
  - Keepalive ping every 25s
  - Closes when done=True event is drained
```

Late-connecting clients automatically receive all past events because the store is append-only and the consumer tracks its own index into the list.

---

## Data Flow

### Starting a Research Session

```
1. POST /api/sessions
   → create ResearchSession row (status=pending)
   → return session JSON

2. POST /api/sessions/{id}/run
   → set status=running, updated_at=now
   → progress.init(session_id)
   → add _execute_workflow to BackgroundTasks
   → return immediately

3. GET /api/sessions/{id}/stream   (client opens SSE)
   → streams { node, status, quality_score } per node
   → streams { done: true } on completion

4. Workflow completes
   → status=done, report_path saved to DB

5. GET /api/sessions/{id}/report/pdf
   → serves PDF from disk
```

### Chat Flow

```
POST /api/sessions/{id}/chat  { message: "..." }

1. Load ResearchSession → verify status=done
2. Load full ChatMessage history from DB (ordered by created_at)
3. Build LangChain messages:
   [SystemMessage(report_content)] + [history] + [HumanMessage(new_message)]
4. Call Groq LLM
5. Save user message + assistant response to DB
6. Return { role, content }
```

---

## Database Schema

### `researchsession`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key, auto-increment |
| company_name | TEXT | |
| website | TEXT | |
| research_objective | TEXT | |
| status | TEXT | `pending` / `running` / `done` / `error` |
| report_path | TEXT | Relative path to PDF on disk |
| report_content | TEXT | Raw markdown analysis (used for chat context) |
| quality_score | FLOAT | 0.0 – 1.0 |
| created_at | DATETIME | UTC |
| updated_at | DATETIME | UTC |

### `chatmessage`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | Primary key |
| session_id | INTEGER | Foreign key → researchsession |
| role | TEXT | `user` / `assistant` |
| content | TEXT | |
| created_at | DATETIME | UTC |

---

## Folder Structure

```
backend/
├── main.py                    FastAPI app, lifespan, CORS, router registration
├── core/
│   ├── config.py              Pydantic Settings — all config from .env
│   ├── database.py            SQLAlchemy engine, init_db(), get_session()
│   └── logging_config.py      Structured stdout logging
├── api/routes/
│   ├── sessions.py            CRUD: create, list, get, delete session
│   ├── workflow.py            POST run, GET stream (SSE)
│   ├── report.py              GET report JSON, GET PDF, GET download
│   └── chat.py                POST chat message, GET chat history
├── graph/
│   ├── state.py               ResearchState TypedDict (shared across all nodes)
│   ├── workflow.py            StateGraph builder — wires nodes + edges
│   ├── edges.py               route_after_quality_check() conditional
│   └── nodes/
│       ├── planner.py
│       ├── researcher.py
│       ├── analyzer.py
│       ├── quality_check.py
│       └── report_generator.py
├── models/
│   ├── session.py             ResearchSession SQLModel table
│   └── chat.py                ChatMessage SQLModel table
└── services/
    ├── llm.py                 get_llm() with @lru_cache
    ├── exa_client.py          async Exa search (thread-offloaded SDK call)
    ├── pdf_generator.py       ReportLab PDF builder
    ├── prompts.py             All LLM prompts centralized
    └── progress.py            In-memory SSE event store (ProgressState TypedDict)

frontend/src/
├── App.tsx                    Top-level view routing (home | chat)
├── components/
│   ├── dashboard/             Dashboard — search bar + session history cards
│   ├── chat-interface/        ResearchChat — progress + Q&A + PDF panel
│   ├── research-agent/        NewResearchModal (session creation), ResearchProgress
│   └── sidebar/               Sidebar, CommandPalette (Ctrl+K / ⌘K)
├── routes/                    Typed API call wrappers (sessions, workflow, report, chat)
└── lib/
    ├── api.ts                 streamProgress() SSE helper
    ├── http.ts                fetch wrapper with base URL + error handling
    └── types.ts               TypeScript interfaces (Session, ProgressEvent, etc.)
```
