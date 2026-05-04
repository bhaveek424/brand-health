---
status: ready
priority: p2
issue_id: "006"
tags: [brief, reporting, workflow]
dependencies: ["002", "003", "004", "005"]
---

# Build Weekly Brief and Escalation Output

## Problem Statement

The demo needs to close the loop from issue detection to operational action by producing a weekly category-manager brief and supplier escalation draft.

## Findings

- The PRD requires recommended actions for category, support, marketplace, and supplier teams.
- This screen is the strongest proof that the product is more than a sentiment dashboard.
- The brief should be generated from the same seeded issue and response data used elsewhere.

## Proposed Solutions

### Option 1: Structured Weekly Brief Screen

**Approach:** Build a screen with executive summary, top risks, evidence, recommended actions, and supplier escalation draft.

**Pros:**
- Strong demo ending.
- Turns analysis into business action.
- Easy to inspect and discuss.

**Cons:**
- Requires thoughtful copywriting to feel realistic.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Markdown Export Only

**Approach:** Generate a Markdown file from the data without a dedicated UI.

**Pros:**
- Fast.
- Useful as a technical artifact.

**Cons:**
- Less compelling in a live demo.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Build the Weekly Brief as a dedicated screen first. Add Markdown export only if the core demo path is already solid.

## Technical Details

**Affected files:**
- `src/app/brief/*`
- `src/components/weekly-brief/*`
- `src/lib/brief/*`

**Related components:**
- Executive summary
- Recommended actions
- Supplier escalation draft
- Marketplace listing recommendation
- Support and warranty recommendation

**Database changes:**
- None.

## Resources

- PRD sections: Weekly Brief Generation, Five-Minute Demo Path, Success Criteria.

## Acceptance Criteria

- [ ] Weekly Brief summarizes brand health for the current period.
- [ ] Brief identifies handle breakage as the top emerging issue.
- [ ] Brief includes representative evidence and marketplace concentration.
- [ ] Brief includes estimated commercial exposure.
- [ ] Brief recommends support, marketplace, supplier, and category actions.
- [ ] Supplier escalation draft is visible.
- [ ] Output can be discussed as a weekly category-manager artifact.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD Weekly Brief requirements into a ready implementation issue.

**Learnings:**
- The final screen should demonstrate actionability, not just reporting.

