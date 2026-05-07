---
status: complete
priority: p1
issue_id: "016"
tags: [analysis, gtm-risks, ai, evidence]
dependencies: ["015"]
---

# Analyze Stored Evidence into GTM Risks

## What to build

Generate a persisted GTM analysis from stored evidence chunks.

The analysis should turn product evidence into a brand/GTM health score, issue themes, listing quality findings, top risks, recommendations, and evidence citations.

## Acceptance Criteria

- [x] Database table exists for `analyses`.
- [x] Backend exposes `POST /runs/{run_id}/analyze`.
- [x] Analysis reads stored evidence chunks, not only the original URL.
- [x] Analysis output includes health score, top risks, issue themes, listing QA findings, recommended actions, and cited evidence IDs.
- [x] Backend persists the analysis and emits workflow events.
- [x] `/gtm-workbench` renders risk cards, issue themes, listing QA checklist, and citations from the analysis.
- [x] Analysis failures fall back to a clearly labeled deterministic/sample analysis where possible.
- [x] Refreshing the page reloads the saved analysis.

## Blocked by

- 015

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- The product should analyze launch/GTM risk, not only review sentiment.

### 2026-05-07 - Implementation

**By:** OpenCode

**Actions:**
- Added `backend/migrations/004_add_analyses.sql`:
  - `analyses` table: id, run_id, status, provider, model, health_score, top_risks JSONB, issue_themes JSONB, listing_quality JSONB, recommended_actions JSONB, citations JSONB, raw_response JSONB, created_at, updated_at.
- Added `backend/services/analyzer.py`:
  - `analyze_chunks(chunks)` — loads evidence chunk dicts, calls OpenAI chat completions with JSON mode if `OPENAI_API_KEY` present.
  - System prompt produces `health_score`, `top_risks`, `issue_themes`, `listing_quality`, `recommended_actions`, `citations`.
  - Every risk/theme/action cites evidence chunk IDs.
  - Deterministic fallback (`_deterministic_fallback`) used when key absent or call fails.
  - Fallback labeled `provider="deterministic_fallback"`, never silent.
  - `ANALYSIS_MODEL` env var (default: `gpt-4o-mini`).
- Updated `backend/models.py`: Added `Analysis` SQLAlchemy model.
- Updated `backend/schemas.py`: Added `RiskItem`, `IssueTheme`, `ListingFinding`, `ListingQuality`, `RecommendedAction`, `AnalysisCitation`, `AnalysisResponse`.
- Updated `backend/main.py`:
  - Added `_build_analysis_response` helper.
  - Added `POST /runs/{run_id}/analyze`: loads chunks, calls analyzer, persists `Analysis`, emits events.
  - Added `GET /runs/{run_id}/analysis`: returns latest analysis or null.
  - Workflow events: `analysis_started`, `analysis_completed`, `analysis_fallback_used`, `analysis_failed`.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Added Analysis types: `RiskItem`, `IssueTheme`, `ListingFinding`, `ListingQuality`, `RecommendedAction`, `AnalysisCitation`, `Analysis`.
  - Added `analysis`, `analyzing`, `analyzeError` state; `loadAnalysis` + `handleAnalyze` callbacks.
  - Loads saved analysis on page init (refresh-safe).
  - "Analyze GTM Risk" button appears when chunks exist.
  - GTM Analysis section renders: health score (color-coded), provider badge, summary stats (risks/themes/QA score), 4-panel grid (Risks, Listing QA, Issue Themes, Recommended Actions), Citations card.
  - Placeholder grid shown only when no analysis exists; updated placeholder text prompts the user to click Analyze.
- Updated `backend/README.md`: added analysis endpoints, ANALYSIS_MODEL env var, fallback behavior docs.
- Updated root `README.md`: added analyze endpoints, migration step.
- Updated `AI_GTM_COPILOT_PRD.md`: added analyses table, new endpoints, issue 016 completion summary.

**Files changed:**
- `backend/migrations/004_add_analyses.sql` (new)
- `backend/services/analyzer.py` (new)
- `backend/models.py`
- `backend/schemas.py`
- `backend/main.py`
- `src/app/gtm-workbench/page.tsx`
- `backend/README.md`
- `README.md`
- `AI_GTM_COPILOT_PRD.md`
- `todos/016-complete-p1-analyze-stored-evidence-into-gtm-risks.md` (renamed)

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean.
- Backend import smoke test: passed (see below).
- Deterministic fallback verified without OPENAI_API_KEY.
- DB not available during validation; live end-to-end not run.

**What was not run and why:**
- End-to-end DB test (create run → extract → analyze → verify analysis): no live database.
- Real OpenAI analysis call: no OPENAI_API_KEY set.
- Verified fallback: `analyze_chunks` with no key returns `provider="deterministic_fallback"`, health_score derived from chunk content.

### 2026-05-07 - Review Fixes

**By:** Claude

**Actions:**
- Fixed `GET /runs/{run_id}/analysis` in `backend/main.py`: added `.limit(1)` to the query before `scalar_one_or_none()` — prevents `MultipleResultsFound` when a run has been analyzed more than once.
- Added `_validate_and_normalize_llm_result(parsed, valid_chunk_ids)` to `backend/services/analyzer.py`:
  - Validates `health_score` is int 0-100 (coerces float, rejects otherwise).
  - Validates `severity`/`frequency`/`priority` enums in `{"high","medium","low"}`.
  - Validates `listing_quality.findings[*].status` in `{"pass","warning","fail"}`.
  - Strips `cited_chunk_ids` to only IDs present in input chunks.
  - Strips `citations` to only entries whose `chunk_id` is in valid set.
  - On `ValueError`: falls back to deterministic, sets `provider="deterministic_fallback"`, includes `validation_error` and original `response_text` in `raw_response`.
- Wired validator in `analyze_chunks` between `json.loads` and `return` on the OpenAI path.

**Files changed:**
- `backend/main.py`
- `backend/services/analyzer.py`

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean.
- Smoke tests: bad severity rejected; unknown chunk IDs stripped from risks/themes/findings/citations; deterministic fallback health_score computed; `analyze_chunks` returns `provider="deterministic_fallback"` without API key.

### 2026-05-07 - Validator Missing-Field Fix

**By:** Claude

**Actions:**
- Added `_required_str(obj, key, path)` helper in `backend/services/analyzer.py` — raises `ValueError` when field is absent, not a string, or blank after strip.
- Applied `_required_str` to all Pydantic-required string fields:
  - `top_risks[*]`: title, description
  - `issue_themes[*]`: theme, description
  - `listing_quality.findings[*]`: field, note
  - `recommended_actions[*]`: action, description
- Citations: now validates `source_type` non-empty string, `excerpt` non-empty string (truncated to 120 chars), in addition to chunk_id validity check.
- Any missing/blank required field raises `ValueError` → `analyze_chunks` falls back to `deterministic_fallback` with `validation_error` in `raw_response`.

**Files changed:**
- `backend/services/analyzer.py`

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean.
- Smoke test: malformed object (missing description/field/note in all sections, citations missing source_type+excerpt) → `ValueError: top_risks[0].description missing or blank`.
- Smoke test: valid object with FAKE IDs → passes, FAKE IDs stripped, excerpt truncated to 120.
- Smoke test: blank (whitespace-only) description → rejected.
