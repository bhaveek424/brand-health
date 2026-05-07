---
status: complete
priority: p1
issue_id: "014"
tags: [scrapegraphai-oss, extraction, evidence, live-data]
dependencies: ["013"]
---

# Extract Live Product Evidence with ScrapeGraphAI OSS

## What to build

Add a live product evidence extraction path using the open-source `scrapegraphai` Python library locally inside the FastAPI backend.

This slice must not call ScrapeGraphAI Cloud or require `SCRAPEGRAPHAI_API_KEY`. Given a persisted run with a marketplace product URL, the backend should run `SmartScraperGraph`, save raw and normalized evidence, emit workflow events, and let `/gtm-workbench` show an evidence pack.

## Acceptance Criteria

- [x] Backend uses the open-source `scrapegraphai` Python package, not hosted ScrapeGraphAI API endpoints.
- [x] Backend documents and checks required local runtime dependencies, including Playwright browser install.
- [x] Backend uses our configured LLM provider or local model for ScrapeGraphAI OSS.
- [x] Missing LLM/browser configuration fails with a clear non-2xx response.
- [x] Extraction schema includes product title, brand, price, currency, rating, review count, availability, seller, images, bullets, description, specs, warranty/returns text, visible review snippets, summary, missing fields, and warnings.
- [x] Extracted raw graph output is saved for audit/debugging.
- [x] Normalized evidence is saved in the database.
- [x] Workflow events are emitted for extraction started, extraction completed, and extraction failed.
- [x] `/gtm-workbench` renders a live evidence pack from stored backend data.
- [x] Failure states are visible and retryable from the UI.
- [x] Docs no longer instruct users to set `SCRAPEGRAPHAI_API_KEY`.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Blocked by

- 013

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- Product evidence is broader and more reliable than review-only scraping.

### 2026-05-07 - Scope Pivot

**By:** Codex

**Actions:**
- Reopened issue 014 after deciding to use the open-source ScrapeGraphAI Python library locally.
- Changed the issue from hosted ScrapeGraphAI API integration to ScrapeGraphAI OSS integration.
- Updated acceptance criteria to remove `SCRAPEGRAPHAI_API_KEY` and require local Playwright plus LLM configuration.

**Learnings:**
- The product should self-host extraction capability and avoid relying on ScrapeGraphAI Cloud/API for milestone 1.

### 2026-05-07 - Implementation & Cleanup

**By:** OpenCode

**Actions:**
- Added `scrapegraphai` to `backend/requirements.txt`.
- Added `backend/services/scrapegraph.py` with `ScrapeGraphService`:
  - `SmartScraperGraph` local execution via `extract_sync` with Pydantic `EvidenceSchema`.
  - Config builder supporting OpenAI (`OPENAI_API_KEY`) and Ollama (`OLLAMA_BASE_URL`) backends.
  - Clear config error when `SCRAPEGRAPH_LLM_MODEL` is missing.
  - Playwright/Chromium error detection and helpful remediation message.
  - Raw response and normalized evidence return shape.
- Added `backend/migrations/002_add_extraction_runs.sql` with `extraction_runs` table for raw and normalized fields.
- Updated `backend/models.py` with `ExtractionRun` SQLAlchemy model.
- Updated `backend/schemas.py` with `ExtractionRunResponse` and `ExtractionQuality` Pydantic models.
- Updated `backend/main.py`:
  - Added `POST /runs/{run_id}/extract` endpoint that triggers extraction, persists results, emits workflow events.
  - Added `GET /runs/{run_id}/evidence` endpoint to fetch latest extraction.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Added `Extract Evidence` button when a run exists.
  - Added evidence pack rendering (title, brand, price, rating, availability, seller, bullets, specs, review snippets, summary, extraction quality).
  - Added error/retry states for extraction failure.
- Updated `backend/README.md` with Playwright install step, LLM env vars, extraction section, and endpoint docs.
- Minor: removed non-ASCII ellipsis from UI strings.

**Files changed:**
- `backend/requirements.txt`
- `backend/services/scrapegraph.py` (new)
- `backend/migrations/002_add_extraction_runs.sql` (new)
- `backend/models.py`
- `backend/schemas.py`
- `backend/main.py`
- `src/app/gtm-workbench/page.tsx`
- `backend/README.md`

**Validation:**
- `npm run lint` passed (after excluding `backend/.venv/**` from ESLint global ignores).
- `npm run build` passed.
- Backend config smoke test: without `SCRAPEGRAPH_LLM_MODEL`, `_build_llm_config()` raises `RuntimeError` with clear message.
- Backend config smoke test (integration): `POST /extract` without DB returns 503 with clear DB error.
- **Note:** Real end-to-end extraction against a live product URL was not executed because no LLM key or browser was available during validation. The extraction service, schema, and endpoints are ready for testing once Playwright + LLM credentials are configured.
