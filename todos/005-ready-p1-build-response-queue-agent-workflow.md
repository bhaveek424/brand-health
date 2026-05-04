---
status: ready
priority: p1
issue_id: "005"
tags: [agent, frontend, responses, guardrails]
dependencies: ["002"]
---

# Build Response Queue Agent Workflow

## Problem Statement

The prototype needs a concrete agent workflow that drafts brand-safe localized responses to negative reviews while keeping public action under human approval.

## Findings

- The killer feature is not generic generation; it is controlled, localized, brand-safe drafting.
- Opptra cares about brand equity, so the workflow must show approval controls and policy checks.
- Drafts need to match customer language and avoid legally risky phrases.

## Proposed Solutions

### Option 1: Precomputed Drafts with Visible Guardrail Checks

**Approach:** Use seeded draft responses for representative negative reviews and evaluate them against a visible checklist.

**Pros:**
- Reliable demo.
- Shows the workflow clearly.
- Avoids live generation failures.

**Cons:**
- Less dynamic unless optional regeneration is added later.

**Effort:** 3-4 hours

**Risk:** Low

---

### Option 2: Live Draft Generation

**Approach:** Generate review responses at runtime through an LLM provider.

**Pros:**
- More visibly AI-powered.

**Cons:**
- Higher demo risk.
- Requires stronger eval and fallback behavior.

**Effort:** 5-8 hours

**Risk:** Medium

## Recommended Action

Build a response queue with precomputed localized drafts, visible quality checks, and approve/edit/reject states. Keep an optional generation interface for future API-backed regeneration.

## Technical Details

**Affected files:**
- `src/app/responses/*`
- `src/components/response-queue/*`
- `src/lib/agent/*`
- `src/lib/evals/*`

**Related components:**
- Brand tone configuration
- Forbidden phrase checks
- Locale rules
- Approval status persistence
- Draft response cards

**Database changes:**
- None. Use local storage for prototype approval state if persistence is needed.

## Resources

- PRD sections: Response Drafting Agent, Response Quality Checklist, Human Approval Model.

## Acceptance Criteria

- [x] Response Queue shows negative reviews requiring attention.
- [x] At least three drafts are shown in the customer's language.
- [x] Drafts mention the exact issue.
- [x] Each draft includes checklist results.
- [x] Forbidden phrase checks are visible.
- [x] Approve, edit, and reject states exist.
- [x] UI clearly states drafts are not auto-published.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD agent workflow requirements into a ready implementation issue.

**Learnings:**
- Human approval is part of the product value, not a limitation.

### 2026-05-04 - Polish Response Queue Workflow

**By:** OpenCode

**Actions:**
- Added `forbidden_phrase_hits: string[]` to `ChecklistResult` in schema.
- Updated `drafting.ts` to populate `forbidden_phrase_hits` with matched brand-violating phrases.
- Reworked `src/app/responses/page.tsx`:
  - Added blue banner: "Drafts are not auto-published."
  - Added visible guardrails section: shows full `forbidden_phrases` list + per-draft hit detection (red box for hits, green box for clean).
  - Added quality pass-rate badge to checklist header (e.g., 86% passed).
  - Editing a draft resets status back to `draft` so re-approval is required.
  - Improved edited-state text to warn that checklist reflects the original draft.
- Verified order: current-period handle-breakage spike reviews render first, covering EN / HI / AR, satisfying ≥3 localized drafts.
- Verified drafts include localized issue word (`handle`, `المقبض`, etc.) and support path.

**Learnings:**
- Visible checklist + guardrails sell the agent's value better than raw text.
- Editing should invalidate prior approval; UI must make that obvious.

