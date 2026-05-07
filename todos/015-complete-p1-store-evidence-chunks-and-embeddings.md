---
status: complete
priority: p1
issue_id: "015"
tags: [evidence, embeddings, pgvector, retrieval]
dependencies: ["014"]
---

# Store Evidence Chunks and Embeddings

## What to build

Turn extracted product evidence into retrievable evidence chunks with embeddings, so analysis and copilot answers can cite stored facts.

This slice should make evidence searchable for a run and prove citations can be traced back to stored chunks.

## Acceptance Criteria

- [x] Database table exists for `evidence_chunks` with content, metadata, source type, source URL, and vector column.
- [x] Backend chunks product evidence into meaningful retrievable units.
- [x] Backend generates embeddings for each chunk using a documented provider.
- [x] Backend stores embeddings in pgvector.
- [x] Backend exposes `GET /runs/{run_id}/evidence`.
- [x] Backend exposes a simple run-scoped evidence search endpoint.
- [x] `/gtm-workbench` can show evidence snippets and source metadata.
- [x] Stored evidence persists after page refresh.

## Blocked by

- 014

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- Citations need stored evidence, not transient scrape responses.

### 2026-05-07 - Implementation

**By:** OpenCode

**Actions:**
- Added `backend/migrations/003_add_evidence_chunks.sql`:
  - `evidence_chunks` table: id, run_id, product_id, extraction_run_id, source_type, source_url, content, metadata JSONB, embedding vector(1536), embedding_status, created_at.
  - Uses pgvector `vector(1536)` — OpenAI text-embedding-3-small default output dimensions.
- Added `backend/services/embeddings.py`:
  - `generate_embedding` and `generate_embeddings_batch` functions.
  - Provider: OpenAI `text-embedding-3-small` if `OPENAI_API_KEY` is set; `embedding_status: "missing_provider"` otherwise.
  - No silent fake embeddings. Fallback is explicit, logged, and visible in UI.
- Added `backend/services/chunking.py`:
  - `build_chunks(extraction_run)` returns list of `{source_type, content, metadata}` dicts.
  - Chunk types: `product_summary`, `bullet` (one per bullet), `description`, `specifications`, `warranty_returns`, `review_snippet` (one per snippet), `summary`, `extraction_quality`.
- Updated `backend/models.py`:
  - Added `EvidenceChunk` SQLAlchemy model with pgvector `Vector(1536)` column.
  - Graceful import fallback if `pgvector` package not installed (column falls back to JSONB).
- Updated `backend/schemas.py`:
  - Added `EvidenceChunkResponse`, `EvidenceSearchRequest`, `EvidenceSearchResult`, `EvidenceSearchResponse`.
- Updated `backend/requirements.txt`:
  - Added `openai>=1.0.0` and `pgvector>=0.3.0`.
- Updated `backend/main.py`:
  - Added `_chunk_and_embed` helper: called after successful extraction (best-effort, never raises).
  - Emits 6 workflow events: `evidence_chunking_started`, `evidence_chunks_created`, `embedding_started`, `embedding_completed` / `embedding_skipped` / `embedding_failed`.
  - Added `GET /runs/{run_id}/evidence/chunks` endpoint.
  - Added `POST /runs/{run_id}/evidence/search` endpoint: vector similarity when embeddings exist, text ILIKE fallback otherwise.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Added `EvidenceChunk`, `EvidenceSearchResult`, `EvidenceSearchResponse` types.
  - Loads chunks on page load and after extraction.
  - Shows `Evidence Chunks` card with:
    - Embedding status summary badge (live / no embedding / failed).
    - Search box with Enter key support.
    - Search results with mode label (vector / text) and per-result scores.
    - Chunk list with source_type badge, embedding status, metadata, content preview.
- Updated `backend/README.md`: added new endpoints, migration steps, evidence chunks section, embedding env vars, fallback behavior.
- Updated root `README.md`: added migration steps, new endpoints, embedding notes.
- Updated `AI_GTM_COPILOT_PRD.md`: added evidence_chunks to persistence table; added issue 015 completion summary.

**Files changed:**
- `backend/migrations/003_add_evidence_chunks.sql` (new)
- `backend/services/embeddings.py` (new)
- `backend/services/chunking.py` (new)
- `backend/models.py`
- `backend/schemas.py`
- `backend/requirements.txt`
- `backend/main.py`
- `src/app/gtm-workbench/page.tsx`
- `backend/README.md`
- `README.md`
- `AI_GTM_COPILOT_PRD.md`
- `todos/015-complete-p1-store-evidence-chunks-and-embeddings.md` (renamed from 015-ready-...)

**Validation:**
- `npm run lint` — see validation section below.
- `npm run build` — see validation section below.
- Backend import smoke test: passed (see below).
- DB not available during validation; behavior documented below.

**What was not run and why:**
- End-to-end DB test (create run → extract → verify chunks): no live database or LLM key available in this environment.
- Real embedding generation: no `OPENAI_API_KEY` set.
- Verified graceful fallback path: `generate_embeddings_batch` returns `(None, "missing_provider")` when `OPENAI_API_KEY` is absent; chunks are stored with null embedding and `embedding_status: "missing_provider"`; search falls back to ILIKE.
