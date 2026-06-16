# Product Improvements

## 1. Five Weaknesses in the Current Product

**1. No source citations**
The report contains synthesized analysis but no links back to the original Exa sources. Users cannot verify a claim or read the source material. This is the single biggest trust gap.

**2. Chat has no memory limit**
Every chat message re-injects the full report content + full conversation history into the LLM context. After 15–20 exchanges on a large report, this will exceed the model's context window and fail.

**3. Research retry uses the same queries**
When quality check scores below 0.7, the workflow loops back to Researcher with the same 6 queries from Planner. A second pass with identical queries rarely yields new information — the retry rarely improves the score.

**4. No report comparison**
Users can research multiple companies but cannot compare them. A side-by-side view is the most natural next step for sales use cases (evaluating two vendors, two prospects).

**5. No CRM integration**
The output is a PDF. Sales reps need to get this into HubSpot or Salesforce to be useful. Without an export path, the workflow ends at download — it doesn't integrate into how sales teams actually work.

---

## 2. Top 3 Improvements to Build Next

### 1. Inline Source Citations
Every factual claim in the report should link to a source URL. This is the most important trust-building feature and directly addresses the biggest weakness.

Implementation:
- Pass source URLs + titles through the Analyzer prompt
- Instruct the LLM to cite inline as `[1]`, `[2]`, etc.
- Append a Sources section at the end of the report
- Make URLs clickable in both the PDF and the in-browser chat

### 2. Smarter Retry Queries
When quality check fails, the Planner should generate new queries based on the quality feedback — not re-run the same ones.

Implementation:
- Pass `quality_feedback` back into Planner on retry
- Planner prompt: "The previous research scored low on [feedback]. Generate 6 new queries targeting the gaps."
- Cap retries at 2 to prevent infinite loops

### 3. Streaming LLM Output During Analysis
The UX currently shows a static "Analyzing..." step for 45–90 seconds. Streaming tokens to the frontend during the Analyzer node would show the report being written in real time.

Implementation:
- Switch Analyzer from `llm.ainvoke()` to `llm.astream()`
- Emit token chunks as SSE events alongside node progress events
- Frontend renders incoming tokens progressively in the chat panel

---

## 3. Who Buys, Who Uses, Why They Pay

**Buyer:** Sales managers and revenue leaders at B2B SaaS companies. They control tools budgets and care about pipeline velocity.

**User:** Account executives and SDRs preparing for discovery calls. Currently they spend 20–40 minutes manually googling a prospect. Scout AI does it in 2 minutes with a structured, consistent output format.

**Why they pay:** Time savings maps directly to more calls per day. A rep who preps for 5 calls instead of 3 generates measurably more pipeline. The ROI conversation is straightforward for a sales manager.

**Pricing signal:** $30–60/user/month. Competes with Clearbit, ZoomInfo Copilot, Gong Engage. Core market: B2B SaaS teams of 5–50 reps.

---

## 4. Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| Report generation time | < 90s (p95) | Core value prop — speed |
| Quality score (avg) | ≥ 0.80 | Report completeness |
| Reports per user per week | ≥ 5 | Habit formation |
| Chat messages per session | ≥ 3 | Report engagement depth |
| 30-day retention | ≥ 60% | Product-market fit signal |
| Time saved per rep per week | ≥ 2 hours (surveyed) | Business impact |

---

## 5. Four-Week AI Roadmap

| Week | Deliverable |
|------|-------------|
| **Week 1** | Inline source citations · Smarter retry queries · Fix session creation flow (website + objective required) |
| **Week 2** | Streaming LLM output during Analyzer · LangGraph checkpoint persistence (survive restarts) |
| **Week 3** | Company comparison view (two sessions side-by-side) · Report sections as interactive cards in browser |
| **Week 4** | HubSpot / Salesforce export · Email delivery of PDF on completion · User auth (JWT) |

---

## 6. Biggest Cost, Scaling, and Reliability Risks

**Cost**
Each research run = ~6 Exa queries + 3 Groq LLM calls (Planner, Analyzer, Quality Check). At scale:
- Exa: ~$0.02–0.05/query × 6 = ~$0.12–0.30/run
- 1,000 reports/day = $120–300/day in search costs alone
- Mitigation: cache Exa results per (company, query) pair with a 24-hour TTL

**Scaling**
SQLite + in-memory SSE state + FastAPI BackgroundTasks cannot scale beyond one process. A second Uvicorn worker breaks SSE streaming immediately. Must migrate to Postgres + Redis before any real load.

**Reliability**
Groq free tier has no SLA. Exa uptime is not guaranteed. A single failed API call currently produces a degraded report silently. Need:
- Retry with exponential backoff on both Groq and Exa calls
- Circuit breakers to fail fast when an API is down
- Explicit partial-failure states surfaced in the progress UI

---

## 7. Feature to Remove

**`ResearchProgress.tsx`** — a standalone progress component that is dead code. The progress experience is fully handled inside `ResearchChat`. It adds confusion during onboarding and maintenance overhead with no user benefit. Remove it.

---

## 8. Feature to Add

**Saved Research Templates**

Let users save common research objectives (e.g., "Pre-call discovery for enterprise SaaS prospect", "Competitive analysis for a new market entry") and apply them with one click from the session creation modal.

Why this matters:
- A specific objective produces a dramatically better report than a generic company name
- Sales teams have 3–5 recurring research patterns — templates eliminate repetitive typing
- Low implementation cost: a simple CRUD table + dropdown in the modal

---

## 9. First 90-Day Roadmap

| Days | Goal |
|------|------|
| **1–30** | Core quality: source citations, smarter retry, streaming output, fix tech debt (Postgres, Redis, task queue, tests) |
| **31–60** | Growth: user auth (JWT), usage analytics, HubSpot integration, 10 paid beta customers |
| **61–90** | Monetization: Stripe billing, team workspaces, report sharing via link, onboarding flow |

---

## 10. What I Would Change First

**Make website and research objective required inputs — not optional.**

The current primary flow accepts a plain text query and auto-generates both the website field (empty) and the research objective ("Comprehensive research on X"). This produces generic, lower-quality reports.

The quality of the output is directly proportional to the specificity of the input. A user who provides `openai.com` as the website and "understand their developer tool strategy before a partnership call" as the objective gets a dramatically more targeted report than one who types "OpenAI" into a search box.

This is a one-day change (the modal already exists — it just needs to be the required entry point, which it now is). The impact on report quality is immediate and significant.
