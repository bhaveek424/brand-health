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
- `OPENAI_API_KEY` - Used for both ScrapeGraphAI extraction and evidence chunk embeddings (`text-embedding-3-small`, 1536 dims). If omitted, extraction still works but chunks will have `embedding_status: "missing_provider"` and only text search is available.
- `OLLAMA_BASE_URL` - Optional local model endpoint if using an Ollama model.

### 4. Run migrations

If using Docker Compose or an empty database, apply the schema migrations in order:

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_add_extraction_runs.sql
psql $DATABASE_URL -f migrations/003_add_evidence_chunks.sql
```

Migration 001 enables the `vector` pgvector extension. Migration 003 creates the `evidence_chunks` table with a `vector(1536)` embedding column.

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
