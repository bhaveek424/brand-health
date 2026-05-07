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
- `OPENAI_API_KEY` - One supported LLM key for local ScrapeGraphAI extraction. Equivalent provider keys can be used if the service maps them into ScrapeGraphAI config.
- `OLLAMA_BASE_URL` - Optional local model endpoint if using an Ollama model.

### 4. Run migrations

If using Docker Compose or an empty database, apply the initial schema:

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

(For Supabase, use the SQL Editor to run the migration file contents.)

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
- `POST /runs/{run_id}/extract` - Run live product evidence extraction via local open-source ScrapeGraphAI.
- `GET /runs/{run_id}/evidence` - Fetch the latest extraction result for a run.

## Extraction Flow

1. Create a run with `POST /runs`.
2. Trigger extraction with `POST /runs/{run_id}/extract`.
3. The backend runs `SmartScraperGraph` locally for the product URL.
4. Raw response and normalized fields are stored in `extraction_runs`.
5. Workflow events (`extraction_started`, `extraction_completed`, `extraction_failed`) are emitted.
6. Fetch evidence with `GET /runs/{run_id}/evidence`.
