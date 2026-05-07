# AI GTM Copilot - Backend

Python FastAPI backend for the AI GTM Copilot workbench.

## Local Setup

### 1. Python environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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
```

- `FRONTEND_URL` - CORS origin for the Next.js frontend.
- `DATABASE_URL` - Async Postgres connection string. If omitted, the backend starts but run persistence returns 503.

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

## Endpoints

- `GET /health` - Service status, version, and database readiness.
- `POST /runs` - Create a persisted run from a product URL.
- `GET /runs/{run_id}` - Fetch run status and workflow events.
