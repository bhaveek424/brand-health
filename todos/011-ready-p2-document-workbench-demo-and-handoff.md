---
status: ready
priority: p2
issue_id: "011"
tags: [documentation, demo, handoff]
dependencies: ["008", "009", "010"]
---

# Document Workbench Demo and Engineering Handoff

## Problem Statement

The pivot needs docs that explain why this prototype fits the GenAI Product Builder role and how engineering could productionize it.

## Findings

- Existing docs focus on the Brand Health dashboard.
- The new pitch is Review-to-Action Workbench.
- The role values validated prototypes and handoff specs.

## Proposed Solutions

### Option 1: Update README and Add Demo Script

**Approach:** Document setup, CSV workflow, live Amazon mode, AI provider options, env vars, demo script, and production handoff.

**Pros:**
- Strong interview artifact.
- Makes role fit obvious.
- Helps engineering evaluate production path.

**Cons:**
- Must stay aligned with implementation.

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

Update README after slices 008-010 are complete.

## Technical Details

**Affected files:**
- `README.md`
- `REVIEW_TO_ACTION_WORKBENCH_PRD.md`
- `todos/011-*`

**Database changes:**
- None.

## Resources

- PRD: `REVIEW_TO_ACTION_WORKBENCH_PRD.md`

## Acceptance Criteria

- [ ] README explains GenAI Product Builder positioning.
- [ ] README explains CSV workflow.
- [ ] README explains live Amazon mode.
- [ ] README explains NVIDIA GLM provider.
- [ ] README documents env vars.
- [ ] README includes five-minute demo script.
- [ ] README includes productionization handoff notes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Created documentation todo from pivot PRD.

**Learnings:**
- Docs should sell the workflow and handoff, not just setup commands.

