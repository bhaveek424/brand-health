---
status: complete
priority: p1
issue_id: "017"
tags: [actions, drafts, handoff, approval-mode]
dependencies: ["016"]
---

# Generate Approval-Mode Action Drafts

## What to build

Create action drafts from a completed GTM analysis so the user can see the operational handoff layer.

The system should generate ready-for-approval drafts, not actually send messages to external systems.

## Acceptance Criteria

- [x] Database table exists for `action_drafts`.
- [x] Backend generates at least three action drafts per completed run.
- [x] Supported draft types include supplier escalation email, brand partner update, listing update brief, internal Slack/Teams update, customer reply, and ops ticket.
- [x] Each draft stores type, target system, status, title, body, payload, and evidence IDs.
- [x] Backend exposes `GET /runs/{run_id}/actions`.
- [x] `/gtm-workbench` renders action draft cards with cited evidence.
- [x] Drafts are persisted and reload after refresh.
- [x] Draft generation emits workflow events.

## Blocked by

- 016

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- The product should convert insight into operational action artifacts.

### 2026-05-07 - Implementation

**By:** Claude

**Actions:**
- Added `backend/migrations/005_add_action_drafts.sql`:
  - `action_drafts` table: id, run_id (FK runs), analysis_id (FK analyses nullable), draft_type, target_system, status, title, body, payload JSONB, evidence_ids JSONB, created_at, updated_at.
  - Indexes on run_id, analysis_id, status.
- Added `backend/services/action_drafts.py`:
  - `generate_drafts(analysis, analysis_id)` — deterministic from analysis dict, no external calls.
  - Produces up to 6 drafts: `supplier_escalation` (email), `listing_update_brief` (content_team), `brand_partner_update` (email), `internal_ops_update` (slack), `customer_reply` (marketplace_reviews, only when review_snippet citations exist), `ops_ticket` (jira, only when systemic risks or listing QA < 60).
  - Always at least 4 drafts (supplier_escalation, listing_update_brief, brand_partner_update, internal_ops_update).
  - Every draft has `status="draft"`, a non-empty body, and evidence_ids from analysis citations/risks.
- Updated `backend/models.py`: Added `ActionDraft` SQLAlchemy model.
- Updated `backend/schemas.py`: Added `ActionDraftResponse` Pydantic schema.
- Updated `backend/main.py`:
  - Added `_build_draft_response` helper.
  - Added `POST /runs/{run_id}/actions/generate`: loads latest analysis, checks for existing drafts (idempotent per analysis), calls `generate_drafts`, persists ActionDraft rows, emits events.
  - Added `GET /runs/{run_id}/actions`: returns drafts for latest analysis, reload-safe.
  - Workflow events: `action_drafts_started`, `action_drafts_created`, `action_drafts_failed`.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Added `ActionDraft` type.
  - Added `drafts`, `generatingDrafts`, `draftsError`, `expandedDraft` state.
  - Added `loadDrafts` callback; called on page init (refresh-safe).
  - Added `handleGenerateDrafts` callback.
  - "Generate Action Drafts" button (teal) shown when analysis exists.
  - Drafts error banner in teal.
  - Action Drafts card: approval badges ("Draft only", "Approval required", "Not sent"), expandable draft rows showing type badge, target system, status, title, body (preformatted), cited evidence IDs, approval reminder footer.
- Updated `backend/README.md`: action draft endpoints, draft types, idempotency, workflow events.
- Updated root `README.md`: action endpoints, migration step.
- Updated `AI_GTM_COPILOT_PRD.md`: action_drafts table, new endpoints, issue 017 completion summary.
- Renamed `todos/017-ready-...md` → `todos/017-complete-...md`.

**Files changed:**
- `backend/migrations/005_add_action_drafts.sql` (new)
- `backend/services/action_drafts.py` (new)
- `backend/models.py`
- `backend/schemas.py`
- `backend/main.py`
- `src/app/gtm-workbench/page.tsx`
- `backend/README.md`
- `README.md`
- `AI_GTM_COPILOT_PRD.md`
- `todos/017-complete-p1-generate-approval-mode-action-drafts.md` (renamed)

**Idempotency decision:**
`POST /runs/{run_id}/actions/generate` returns existing drafts without regenerating if drafts already exist for the current analysis_id. If the run is re-analyzed (new Analysis row), new drafts are generated for the new analysis. Previous drafts remain in the DB but are not returned by `GET /runs/{run_id}/actions` (which always scopes to the latest analysis).

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean.
- Backend smoke test:
  - 6 drafts generated from representative analysis with review evidence.
  - All drafts have required fields (draft_type, target_system, status, title, body, payload, evidence_ids).
  - All drafts have `status="draft"` and non-empty evidence_ids.
  - `customer_reply` present when review_snippet citations in analysis.
  - No external send/integration calls (grep for requests/httpx/smtp/sendgrid — none found).
- DB not available during validation; live end-to-end not run.
- Real analysis-to-drafts flow: not run (no live DB).
