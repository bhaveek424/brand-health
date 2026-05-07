---
status: complete
priority: p1
issue_id: "018"
tags: [actions, connectors, audit-log, simulated-send]
dependencies: ["017"]
---

# Approve and Simulate Action Handoff

## What to build

Add approval-mode action execution so users can approve a generated draft and simulate sending it to the target system.

This proves the future connector layer without requiring Gmail, Slack, marketplace, or ticketing auth in milestone 1.

## Acceptance Criteria

- [x] Backend exposes `POST /actions/{action_id}/approve`.
- [x] Backend exposes `POST /actions/{action_id}/simulate-send`.
- [x] Action statuses move through draft, approved, and simulated_sent.
- [x] Status changes are persisted and audited.
- [x] Workflow events are emitted for approval and simulated send.
- [x] `/gtm-workbench` shows action status changes immediately after approval/simulation.
- [x] Simulated send displays target system and payload preview.
- [x] Failed or invalid transitions return clear errors.

## Blocked by

- 017

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- Approval mode is the safest impressive demo before real connectors.

### 2026-05-07 - Implementation

**By:** Claude

**Actions:**
- Added `backend/migrations/006_add_action_audit_log.sql`:
  - `action_audit_log` table: id, action_id (FK action_drafts), run_id (FK runs), event_type, from_status, to_status, target_system, payload JSONB, created_at.
  - Indexes on action_id and run_id.
  - Immutable: no updated_at, no soft deletes.
- Updated `backend/models.py`: Added `ActionAuditLog` SQLAlchemy model.
- Updated `backend/schemas.py`:
  - Added `ActionAuditLogResponse`.
  - Added `SimulatedSendPreview` (target_system, payload, message).
  - Added `ActionTransitionResponse` (action, audit, simulated_send optional).
- Updated `backend/main.py`:
  - Added `_build_audit_response` helper.
  - Added `_load_draft(action_id, db)` shared helper (UUID parse + 404).
  - Added `POST /actions/{action_id}/approve`:
    - Rejects non-`draft` status with 409 and descriptive message.
    - Transitions to `approved`, writes `ActionAuditLog`, emits `action_approved` event.
    - Returns `ActionTransitionResponse` with `simulated_send=None`.
  - Added `POST /actions/{action_id}/simulate-send`:
    - Rejects `draft` status (must approve first) with 409.
    - Rejects `simulated_sent` (already done) with 409.
    - Transitions to `simulated_sent`, writes `ActionAuditLog`, emits `action_simulated_sent`.
    - Returns `ActionTransitionResponse` with `SimulatedSendPreview` containing full payload and "Simulated only. No external message was sent."
    - No external API calls; no connector credentials needed.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Added `SimulatedSendPreview` and `ActionTransitionResponse` types.
  - Added `draftPending`, `draftErrors`, `simulatedPreviews` state (keyed by draft id).
  - Added `handleApproveDraft(draftId)` callback: POST approve, update draft in list.
  - Added `handleSimulateSend(draftId)` callback: POST simulate-send, update draft in list, store preview, auto-expand card.
  - Both per-draft callbacks disabled while in-flight; error shown inline per draft.
  - Draft card: status badge reflects draft/approved/simulated_sent with distinct colours.
  - Action buttons row: Approve (blue, draft-only), Simulate Send (teal, approved-only), completion badge (simulated_sent).
  - Simulated send preview panel (green): target system label, payload JSON, "Simulated only" message.
  - Footer label per status: "Requires approval" / "Approved — ready to simulate" / "Simulation only — no external connector called".
  - `handleAnalyze` and `handleCreateRun` both clear `draftPending`, `draftErrors`, `simulatedPreviews` on reset.
- Updated `backend/README.md`: transition table (draft→approved→simulated_sent), new endpoints, audit log, workflow events.
- Updated root `README.md`: new endpoints, migration step, transition description.
- Updated `AI_GTM_COPILOT_PRD.md`: new endpoints, action_audit_log table, issue 018 completion summary.
- Renamed `todos/018-ready-...md` → `todos/018-complete-...md`.

**Valid transitions documented:**
```
draft → approved        (POST /actions/{id}/approve)
approved → simulated_sent   (POST /actions/{id}/simulate-send)
```
Any other transition returns 409 with a clear message.

**Files changed:**
- `backend/migrations/006_add_action_audit_log.sql` (new)
- `backend/models.py`
- `backend/schemas.py`
- `backend/main.py`
- `src/app/gtm-workbench/page.tsx`
- `backend/README.md`
- `README.md`
- `AI_GTM_COPILOT_PRD.md`
- `todos/018-complete-p1-approve-and-simulate-action-handoff.md` (renamed)

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean.
- Backend smoke tests (no DB required):
  - approve draft → approved: OK
  - approve already-approved → ValueError with "approved" in message: OK
  - approve simulated_sent → ValueError: OK
  - simulate on draft → ValueError with "draft" in message: OK
  - simulate approved → simulated_sent: OK
  - simulate already-sent → ValueError with "already": OK
  - simulated send payload includes target_system, body_preview ≤200 chars: OK
  - No external network calls in action_drafts service: OK
- Live end-to-end (DB + frontend): not run — no live database available.
