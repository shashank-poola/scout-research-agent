# Architecture

## System Overview

```
Browser (React + Vite)
        │
        │  REST + SSE
        ▼
FastAPI (Python 3.13)
        │
        ├── SQLite (SQLModel)       — sessions, chat history
        ├── Storage (disk)          — PDF files
        └── LangGraph Workflow
                │
                ├── Groq API        — LLM (Llama 3.3 70B)
                └── Exa API         — web search
```

---

## LangGraph Workflow

```
[Planner] ──► [Researcher] ──► [Analyzer] ──► [Quality Check]
                   ▲                                   │
                   │                     score < 0.7   │  score ≥ 0.7
                   └───────────────────────────────────┤
                                                       ▼
                                              [Report Generator]
                                                       │
                                                      END
```

### Node Responsibilities

| Node | Input | Output |
|------|-------|--------|
| **Planner** | company_name, website, objective | 6 search queries |
| **Researcher** | search_queries | raw_results (Exa, parallel) |
| **Analyzer** | raw_results | 8-section markdown analysis |
| **Quality Check** | analysis, objective | quality_score (0–1), feedback |
| **Report Generator** | analysis | PDF file + HTML string |

Quality threshold: `0.7`. Below threshold loops back to Researcher with original queries for a second pass.

---

## Data Flow

### New Research Session

```
1. POST /api/sessions          → create DB row (status=pending)
2. POST /api/sessions/{id}/run → set status=running, start BackgroundTask
3. GET  /api/sessions/{id}/stream → SSE: client receives node events live
4. [workflow runs in background]
5. status → "done" | "error", report_path saved to DB
6. GET /api/sessions/{id}/report/pdf → serve PDF from disk
```

### Chat

```
1. POST /api/sessions/{id}/chat
2. Load full chat history from DB → build LangChain message list
3. Inject report_content as system prompt context
4. LLM responds strictly from report content
5. Save user + assistant messages to DB
```

---

## Key Components

### Backend

```
backend/
├── main.py                   FastAPI app, lifespan, middleware
├── core/
│   ├── config.py             Pydantic Settings (env-driven)
│   ├── database.py           SQLAlchemy engine, session factory
│   └── logging_config.py     Structured logging setup
├── api/routes/
│   ├── sessions.py           CRUD for ResearchSession
│   ├── workflow.py           run + SSE stream
│   ├── report.py             JSON + PDF + download
│   └── chat.py               Q&A against report context
├── graph/
│   ├── state.py              ResearchState TypedDict
│   ├── workflow.py           StateGraph builder
│   ├── edges.py              route_after_quality_check()
│   └── nodes/                planner, researcher, analyzer,
│                             quality_check, report_generator
├── models/
│   ├── session.py            ResearchSession SQLModel table
│   └── chat.py               ChatMessage SQLModel table
└── services/
    ├── llm.py                get_llm() with lru_cache
    ├── exa_client.py         async Exa web search
    ├── pdf_generator.py      ReportLab PDF builder
    ├── prompts.py            all LLM prompts (centralized)
    └── progress.py           in-memory SSE event store
```

### Frontend

```
frontend/src/
├── App.tsx                   top-level routing (home | chat view)
├── components/
│   ├── dashboard/            Dashboard (search bar + report cards)
│   ├── chat-interface/       ResearchChat (progress + chat + PDF panel)
│   ├── research-agent/       NewResearchModal, ResearchProgress
│   └── sidebar/              Sidebar, CommandPalette (Ctrl+K)
├── routes/                   typed API call wrappers
└── lib/
    ├── api.ts                SSE stream helper
    ├── http.ts               fetch wrapper with error handling
    └── types.ts              shared TypeScript interfaces
```

---

## Database Schema

### `researchsession`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| company_name | TEXT | |
| website | TEXT | |
| research_objective | TEXT | |
| status | TEXT | pending / running / done / error |
| report_path | TEXT | relative path to PDF |
| report_content | TEXT | raw markdown analysis |
| quality_score | FLOAT | 0.0 – 1.0 |
| created_at | DATETIME | UTC |
| updated_at | DATETIME | UTC |

### `chatmessage`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| session_id | INTEGER FK | → researchsession |
| role | TEXT | user / assistant |
| content | TEXT | |
| created_at | DATETIME | UTC |

---

## Technology Choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| AI Workflow | LangGraph | stateful graph, conditional routing, retry loops |
| LLM | Groq / Llama 3.3 70B | fast inference, free tier, strong reasoning |
| Web Search | Exa AI | semantic neural search, better than keyword APIs |
| PDF | ReportLab | pure Python, no system dependencies |
| Backend | FastAPI | async-native, automatic OpenAPI docs, typed |
| ORM | SQLModel | combines SQLAlchemy + Pydantic, type-safe |
| Frontend | React 19 + Vite 8 | latest ecosystem, fast HMR |
| Streaming | SSE | unidirectional, HTTP-native, simpler than WebSockets |
