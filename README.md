# Scout AI — AI Research Copilot

Scout AI researches a company and generates a structured PDF briefing in under 2 minutes. Built with a 5-node LangGraph workflow: plan → research → analyze → quality check → report.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.13+ |
| Node.js | 18+ |
| uv | latest |

API keys required:
- [Groq](https://console.groq.com) — LLM (free tier works)
- [Exa](https://exa.ai) — web search

---

## Setup

### 1. Clone

```bash
git clone <repo-url>
cd zylabs
```

### 2. Backend

```bash
cd backend
cp .env.example .env       # fill in your API keys
uv sync
```

`.env` file:

```env
GROQ_API_KEY=your_groq_key_here
EXA_API_KEY=your_exa_key_here
DATABASE_URL=sqlite:///./scout.db
STORAGE_DIR=storage/reports
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:5173"]
```

### 3. Frontend

```bash
cd frontend
npm install
```

---

## Running

Open two terminals.

**Terminal 1 — Backend:**

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

App opens at `http://localhost:5173`. Backend API at `http://localhost:8000`.

---

## How It Works

1. Enter a company name (and optionally website + research objective)
2. LangGraph workflow runs: generates search queries → fetches web results via Exa → analyzes with Llama 3.3 70B → quality checks → generates PDF
3. Live progress streams via SSE
4. PDF report opens inline; chat with the report context

---

## Project Structure

```
zylabs/
├── backend/
│   ├── main.py                  # FastAPI app + lifespan
│   ├── core/                    # config, database, logging
│   ├── api/routes/              # sessions, workflow, report, chat
│   ├── graph/                   # LangGraph nodes, edges, state, workflow
│   ├── models/                  # SQLModel tables (session, chat)
│   ├── services/                # llm, exa_client, pdf_generator, prompts, progress
│   └── storage/reports/         # generated PDF files
├── frontend/
│   └── src/
│       ├── components/          # Dashboard, ResearchChat, Sidebar, etc.
│       ├── routes/              # API call wrappers
│       └── lib/                 # types, http client
└── docs/
    ├── architecture.md
    ├── engineering-decisions.md
    └── product-improvements.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create research session |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/{id}` | Get session |
| DELETE | `/api/sessions/{id}` | Delete session |
| POST | `/api/sessions/{id}/run` | Start workflow |
| GET | `/api/sessions/{id}/stream` | SSE progress stream |
| GET | `/api/sessions/{id}/report` | Get report JSON |
| GET | `/api/sessions/{id}/report/pdf` | View PDF |
| GET | `/api/sessions/{id}/report/download` | Download PDF |
| POST | `/api/sessions/{id}/chat` | Send chat message |
| GET | `/api/sessions/{id}/chat/history` | Get chat history |
| GET | `/health` | Health check |
