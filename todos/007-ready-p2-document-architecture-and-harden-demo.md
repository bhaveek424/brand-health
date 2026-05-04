---
status: ready
priority: p2
issue_id: "007"
tags: [documentation, qa, demo]
dependencies: ["003", "004", "005", "006"]
---

# Document Architecture and Harden Five-Minute Demo

## Problem Statement

The finished prototype needs a clear README, documented assumptions, evaluation checks, and a reliable five-minute demo path so it can be shown to Opptra without caveats.

## Findings

- The PRD explicitly requires a README with architecture, schema, guardrails, and production extensions.
- The demo must run without API keys by default.
- The five-minute path should be rehearsable and deterministic.
- The project should honestly frame seeded data and production boundaries.

## Proposed Solutions

### Option 1: README Plus Demo Script

**Approach:** Write a README covering setup, architecture, data model, AI pipeline, evals, limitations, and a five-minute demo script.

**Pros:**
- Strong interview artifact.
- Makes assumptions explicit.
- Shows production-minded judgment.

**Cons:**
- Requires keeping docs aligned with implementation.

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Minimal Setup README

**Approach:** Document only how to run the app and summarize the idea.

**Pros:**
- Fast.

**Cons:**
- Misses the chance to show technical depth.

**Effort:** 30-60 minutes

**Risk:** Medium

## Recommended Action

Create a complete README and demo script. Run build/lint checks and manually verify the full demo path before considering the prototype done.

## Technical Details

**Affected files:**
- `README.md`
- `PRODUCT_REQUIREMENTS.md`
- Any app files requiring final demo fixes

**Related components:**
- Setup instructions
- Architecture diagram or pipeline description
- Data model summary
- Guardrail and eval documentation
- Demo script

**Database changes:**
- None.

## Resources

- PRD sections: Technical Architecture, AI and Evaluation Requirements, Success Criteria, Recommended Defaults.

## Acceptance Criteria

- [ ] README explains the prototype positioning.
- [ ] README documents seeded data and production-readiness boundary.
- [ ] README explains ingestion, analysis, response drafting, and evaluation seams.
- [ ] README includes the five-minute demo script.
- [ ] App runs locally with one documented command.
- [ ] Build or lint command passes, or known blockers are documented.
- [ ] Full demo path works without API keys.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD documentation and demo-hardening requirements into a ready implementation issue.

**Learnings:**
- The README is part of the interview signal, not just project hygiene.

