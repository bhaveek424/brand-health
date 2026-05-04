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

- [ ] Response Queue shows negative reviews requiring attention.
- [ ] At least three drafts are shown in the customer's language.
- [ ] Drafts mention the exact issue.
- [ ] Each draft includes checklist results.
- [ ] Forbidden phrase checks are visible.
- [ ] Approve, edit, and reject states exist.
- [ ] UI clearly states drafts are not auto-published.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD agent workflow requirements into a ready implementation issue.

**Learnings:**
- Human approval is part of the product value, not a limitation.

