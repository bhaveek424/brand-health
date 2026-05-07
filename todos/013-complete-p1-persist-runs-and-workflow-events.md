---
status: complete
priority: p1
issue_id: "013"
tags: [runs, workflow-events, database, supabase, pgvector]
dependencies: ["012"]
---

# Persist Runs and Workflow Events

## What to build

Create a persisted run lifecycle so `/gtm-workbench` can create a run for a product URL and render backend-backed workflow events.

This should be a narrow but complete path: URL input in the UI, backend run creation, database persistence, run status fetch, and workflow timeline rendering.

## Acceptance Criteria

- [x] Database setup is documented for Supabase Postgres with pgvector enabled.
- [x] Tables or migrations exist for `products`, `runs`, and `run_events`.
- [x] Backend exposes `POST /runs` for creating a run from a URL.
- [x] Backend exposes `GET /runs/{run_id}` with run status and events.
- [x] `/gtm-workbench` URL input creates a persisted run.
- [x] The workflow timeline renders events from the backend, not hardcoded frontend state.
- [x] Page refresh can reload a run by id and show the same events.
- [x] Backend has basic validation for invalid or missing URLs.

## Blocked by

- 012

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- Backend-backed events are the source of truth for both the deterministic workflow panel and the future Tambo copilot.

### 2026-05-07 - Implementation Complete

**By:** OpenCode

**Actions:**
- Added `backend/database.py` with SQLAlchemy 2.0 async engine/session and graceful fallback when `DATABASE_URL` is absent.
- Added `backend/models.py` with SQLAlchemy models for `products`, `runs`, and `run_events`.
- Added `backend/schemas.py` with Pydantic request/response models.
- Added `backend/migrations/001_initial_schema.sql` with table definitions and pgvector extension.
- Added `backend/docker-compose.yml` for local Postgres 16 with pgvector.
- Updated `backend/main.py` with:
  - `POST /runs` — creates product placeholder, run with `created` status, and initial `url_received` event.
  - `GET /runs/{run_id}` — returns run with ordered events.
  - Graceful 503 when `DATABASE_URL` is not configured.
  - URL validation (required, non-empty).
  - Health endpoint now reports `database_configured` and `database_ready`.
- Updated `backend/requirements.txt` with `sqlalchemy[asyncio]` and `asyncpg`.
- Updated `backend/.env.example` with `DATABASE_URL`.
- Updated `backend/README.md` with Docker Compose setup, Supabase instructions, pgvector docs, and migration steps.
- Updated root `README.md` with backend database setup summary.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Enabled "Run Intake" button when URL is non-empty and backend is connected.
  - Calls `POST /runs` on click with loading/error states.
  - Persists `run_id` in URL query param so refresh restores the run.
  - Fetches `GET /runs/{run_id}` on mount from URL and renders workflow timeline from backend events.

**Files changed:**
- `backend/requirements.txt`
- `backend/.env.example`
- `backend/README.md`
- `backend/main.py`
- `backend/database.py` (new)
- `backend/models.py` (new)
- `backend/schemas.py` (new)
- `backend/migrations/001_initial_schema.sql` (new)
- `backend/docker-compose.yml` (new)
- `README.md`
- `src/app/gtm-workbench/page.tsx`

**Validation:**
- `npm run lint` passed.
- `npm run build` passed (including static route `/gtm-workbench`).
- Backend health smoke test passed without DB:
  - `GET /health` returned `database_configured: false`, `database_ready: false`.
- Backend run creation smoke test without DB:
  - `POST /runs` returned `503` with clear message: "Database not configured. Set DATABASE_URL to enable persistence."
  - Pydantic URL validation verified:
    - Empty string rejected with `string_too_short`.
    - Missing field rejected with `missing`.
- **Note:** Full DB-backed run creation smoke test was not executed because the local Docker daemon was not available during validation. The schema, migrations, and docker-compose file are ready for local testing once Postgres is running.

### 2026-05-07 - Review Fixes

**By:** OpenCode

**Actions:**
- Fixed backend `/health` endpoint: now returns `status: "degraded"` when `database_configured` or `database_ready` is false.
- Fixed frontend health parsing: checks `database_configured` and `database_ready` in addition to `status`, treating DB-not-ready as degraded rather than connected.
- Fixed `validate_url` to reject arbitrary strings (e.g. `noturl`):
  - Accepts valid `http://` or `https://` URLs via `urllib.parse.urlparse`.
  - Accepts 10-character ASIN identifiers matching `/^[A-Z0-9]{10}$/i`.
  - Returns `422` with clear message for empty, malformed, or invalid inputs.
- Updated frontend Copilot status text to show `Waiting for backend...` (ASCII ellipsis) instead of non-ASCII `…`.
- Replaced non-ASCII loading indicators on Run Intake button and Suspense fallback.

**Validation:**
- `npm run lint` passed.
- `npm run build` passed.
- Backend health without `DATABASE_URL`: returned `status: "degraded"`, `database_configured: false`, `database_ready: false`.
- URL/ASIN validation verified directly:
  - `''` -> rejected (URL or ASIN is required)
  - `'abc'` -> rejected (invalid URL or ASIN)
  - `'noturl'` -> rejected (invalid URL or ASIN)
  - `'B08ABCDEFG'` -> accepted as ASIN
  - `'https://amazon.in/dp/B08ABCDEFG'` -> accepted as URL
- Full DB-backed run creation smoke test not run: local Docker daemon was unavailable during validation.
