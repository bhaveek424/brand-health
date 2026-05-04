---
status: ready
priority: p1
issue_id: "004"
tags: [frontend, analysis, issue-trends]
dependencies: ["002"]
---

# Build Issue Trends Screen

## Problem Statement

The demo needs an evidence-backed issue investigation view that proves the handle-breakage spike is real and operationally actionable.

## Findings

- The PRD requires clustered themes, spike detection, representative multilingual reviews, affected SKUs, marketplace concentration, and confidence evidence.
- The interviewer is likely to challenge multilingual AI reliability.
- The screen must expose enough evidence to avoid feeling like a black-box sentiment dashboard.

## Proposed Solutions

### Option 1: Theme Investigation View

**Approach:** Show theme clusters with current vs baseline share, confidence, affected reviews, languages, and marketplaces. Selecting handle breakage reveals representative reviews and evidence.

**Pros:**
- Strong proof of AI workflow credibility.
- Directly supports the five-minute demo story.
- Makes model confidence and evidence visible.

**Cons:**
- Requires careful layout to avoid crowding.

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 2: Chart-Heavy Trends View

**Approach:** Focus on time-series charts and trend visuals for all themes.

**Pros:**
- Looks analytical.

**Cons:**
- Risks becoming generic BI and hiding the operational story.

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

Build a theme investigation view focused on the handle-breakage spike, with representative reviews and a confidence/evidence panel.

## Technical Details

**Affected files:**
- `src/app/issues/*`
- `src/components/issue-trends/*`
- `src/lib/analysis/issue-trends.*`

**Related components:**
- Theme list
- Current vs baseline comparison
- Representative review cards
- Evidence/confidence panel
- Market/language breakdown

**Database changes:**
- None.

## Resources

- PRD sections: Issue Trends, Emerging Issue Detection, AI and Evaluation Requirements.

## Acceptance Criteria

- [ ] Handle breakage shows a 2% baseline and 12% current share.
- [ ] Affected marketplaces include Noon UAE and Amazon India.
- [ ] Representative reviews include English, Hindi/Hinglish, and Arabic.
- [ ] Evidence panel includes review count, languages, marketplaces, baseline period, current period, and confidence.
- [ ] Theme clusters are readable and severity-ranked.
- [ ] The view makes clear which action should happen next.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD Issue Trends requirements into a ready implementation issue.

**Learnings:**
- Evidence visibility is the main defense against skepticism about multilingual AI accuracy.

