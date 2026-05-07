# AI GTM Copilot - Backend

Python FastAPI backend for the AI GTM Copilot workbench.

## Local Setup

### 1. Python environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

### 2. Database (optional but recommended)

The backend works without a database, but run persistence requires Postgres with pgvector.

**Option A: Docker Compose (quickest)**

```bash
cd backend
docker compose up -d
```

This starts Postgres 16 with pgvector on port `5432`.

**Option B: Supabase (cloud)**

1. Create a project at [https://supabase.com](https://supabase.com).
2. In Database → Extensions, enable `vector`.
3. Copy the connection string (Database Settings → Connection string → URI) and set it as `DATABASE_URL`.

**Option C: Existing Postgres**

Ensure the `pgvector` extension is installed. On most systems:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment variables

Create `.env` in the `backend/` directory (do not commit it):

```bash
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql+asyncpg://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot
SCRAPEGRAPH_LLM_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=your_openai_key
OLLAMA_BASE_URL=http://localhost:11434
```

- `FRONTEND_URL` - CORS origin for the Next.js frontend.
- `DATABASE_URL` - Async Postgres connection string. If omitted, the backend starts but run persistence returns 503.
- `SCRAPEGRAPH_LLM_MODEL` - Model used by the open-source ScrapeGraphAI local graph.
- `OPENAI_API_KEY` - Used for ScrapeGraphAI extraction, evidence chunk embeddings (`text-embedding-3-small`, 1536 dims), and GTM risk analysis (`ANALYSIS_MODEL`). If omitted, extraction still works, chunks get `embedding_status: "missing_provider"`, and analysis uses the deterministic fallback.
- `ANALYSIS_MODEL` - OpenAI model for GTM risk analysis. Default: `gpt-4o-mini`.
- `OLLAMA_BASE_URL` - Optional local model endpoint if using an Ollama model.

### 4. Run migrations

If using Docker Compose or an empty database, apply the schema migrations in order:

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_add_extraction_runs.sql
psql $DATABASE_URL -f migrations/003_add_evidence_chunks.sql
psql $DATABASE_URL -f migrations/004_add_analyses.sql
psql $DATABASE_URL -f migrations/005_add_action_drafts.sql
psql $DATABASE_URL -f migrations/006_add_action_audit_log.sql
```

Migration 001 enables the `vector` pgvector extension. Migration 003 creates the `evidence_chunks` table with a `vector(1536)` embedding column. Migration 005 creates the `action_drafts` table. Migration 006 creates the `action_audit_log` table.

(For Supabase, use the SQL Editor to run each migration file in order.)

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Extraction (Open-Source ScrapeGraphAI)

Live product evidence extraction runs the open-source `scrapegraphai` Python library inside this FastAPI backend. It does not call ScrapeGraphAI Cloud and does not use `SCRAPEGRAPHAI_API_KEY`.

- Extraction requires the database to be configured and ready.
- Extraction requires Playwright browser dependencies.
- Extraction requires an LLM configuration, such as OpenAI or Ollama.
- Raw responses are stored for auditing.
- Normalized evidence is returned in a stable schema (title, brand, price, rating, availability, seller, images, bullets, description, specifications, warranty/returns, review snippets, summary, and extraction quality).

## Endpoints

- `GET /health` - Service status, version, and database readiness.
- `POST /runs` - Create a persisted run from a product URL.
- `GET /runs/{run_id}` - Fetch run status and workflow events.
- `POST /runs/{run_id}/extract` - Run live product evidence extraction via local open-source ScrapeGraphAI. Also creates evidence chunks and generates embeddings.
- `GET /runs/{run_id}/evidence` - Fetch the latest extraction result for a run.
- `GET /runs/{run_id}/evidence/chunks` - Fetch all evidence chunks for a run.
- `POST /runs/{run_id}/evidence/search` - Search evidence chunks. Body: `{"query": "...", "limit": 10}`. Uses vector similarity when embeddings exist, otherwise falls back to text search.
- `POST /runs/{run_id}/analyze` - Generate a persisted GTM risk analysis from stored evidence chunks.
- `GET /runs/{run_id}/analysis` - Fetch the latest analysis for a run.
- `POST /runs/{run_id}/actions/generate` - Generate approval-mode action drafts from the latest analysis. Idempotent per analysis.
- `GET /runs/{run_id}/actions` - Fetch persisted action drafts for the latest analysis of a run.
- `POST /actions/{action_id}/approve` - Approve a draft (draft → approved). Persists audit log row and emits `action_approved` event. Returns `ActionTransitionResponse`.
- `POST /actions/{action_id}/simulate-send` - Simulate send (approved → simulated_sent). No external connector. Persists audit log, emits `action_simulated_sent`, returns `ActionTransitionResponse` with `simulated_send` preview. Invalid transitions return 409.

## Extraction Flow

1. Create a run with `POST /runs`.
2. Trigger extraction with `POST /runs/{run_id}/extract`.
3. The backend runs `SmartScraperGraph` locally for the product URL.
4. Raw response and normalized fields are stored in `extraction_runs`.
5. Workflow events (`extraction_started`, `extraction_completed`, `extraction_failed`) are emitted.
6. On success, evidence is chunked into retrievable units and stored in `evidence_chunks`.
7. If `OPENAI_API_KEY` is set, embeddings are generated via `text-embedding-3-small` (1536 dims) and stored in the pgvector column. Workflow events: `evidence_chunking_started`, `evidence_chunks_created`, `embedding_started`, `embedding_completed` / `embedding_skipped` / `embedding_failed`.
8. Fetch evidence with `GET /runs/{run_id}/evidence` or chunks with `GET /runs/{run_id}/evidence/chunks`.

## Evidence Chunks and Embeddings

Evidence chunks are human-readable citation units derived from each extraction:

- `product_summary` - title, brand, price, rating, availability, seller
- `bullet` - one chunk per product bullet point
- `description` - full product description
- `specifications` - all spec key/value pairs
- `warranty_returns` - warranty or returns text
- `review_snippet` - one chunk per review snippet
- `summary` - AI-generated summary
- `extraction_quality` - missing fields and warnings

**Embedding provider**: OpenAI `text-embedding-3-small`, 1536 dimensions.

**Fallback behavior**: If `OPENAI_API_KEY` is not set, chunks are stored with `embedding_status: "missing_provider"` and no vector is saved. The search endpoint falls back to text (ILIKE) matching. This behavior is logged and visible in the UI and timeline.

**pgvector**: The `evidence_chunks` table requires the `vector` extension (enabled in migration 001). The `pgvector` Python package (`>= 0.3.0`) provides the SQLAlchemy `Vector` column type.

## GTM Risk Analysis

After evidence chunks are created, trigger analysis with `POST /runs/{run_id}/analyze`. The analyzer reads stored `evidence_chunks` (not the original URL) and returns a structured GTM report.

**Analysis output:**
- `health_score` (0–100) — overall GTM health
- `top_risks` — 3–5 risks with severity and evidence citations
- `issue_themes` — 2–4 recurring patterns from the evidence
- `listing_quality` — per-field checklist (title, brand, price, bullets, description, specs, warranty)
- `recommended_actions` — prioritized actions with evidence citations
- `citations` — chunk IDs and excerpts for every reference

**Provider env vars:**
- `OPENAI_API_KEY` — used for OpenAI chat completions (JSON mode). Required for AI analysis.
- `ANALYSIS_MODEL` — OpenAI model. Default: `gpt-4o-mini`.

**Fallback**: If `OPENAI_API_KEY` is absent or the model call fails, a deterministic rule-based analysis is generated from the chunk content. Labeled `provider: "deterministic_fallback"` in the DB response and clearly shown in the UI. Never silently substituted.

**Workflow events**: `analysis_started`, `analysis_completed`, `analysis_fallback_used`, `analysis_failed`.

## Action Draft Generation

After analysis is complete, call `POST /runs/{run_id}/actions/generate` to produce approval-mode action drafts. No external messages are sent.

**Draft types generated:**
- `supplier_escalation` — email to supplier/manufacturer flagging high-severity risks
- `listing_update_brief` — content team brief for listing content fixes
- `brand_partner_update` — brand partner or agency status email
- `internal_ops_update` — Slack/Teams-style internal update with urgency level
- `customer_reply` — review response template (only generated when review_snippet evidence exists)
- `ops_ticket` — Jira-style engineering/ops remediation ticket (only generated when systemic risks or low listing QA score)

**All drafts:**
- Have `status: "draft"` — approval required before any action
- Include `evidence_ids` citing the chunks that support the draft content
- Are deterministic from the saved analysis — no additional AI calls

**Idempotency**: Calling `POST /runs/{run_id}/actions/generate` multiple times for the same analysis returns the existing drafts without duplicating. If the run is re-analyzed, new drafts are generated for the new analysis.

**Workflow events**: `action_drafts_started`, `action_drafts_created`, `action_drafts_failed`.

## Action Status Transitions

```
draft → approved → simulated_sent
```

- `POST /actions/{action_id}/approve`: `draft` → `approved`. 409 if not in `draft`.
- `POST /actions/{action_id}/simulate-send`: `approved` → `simulated_sent`. 409 if in `draft` (must approve first) or already `simulated_sent`. No external send.

Every transition writes one row to `action_audit_log` with `from_status`, `to_status`, `target_system`, and a payload snapshot. Workflow events `action_approved` and `action_simulated_sent` are emitted on the run's event stream.
