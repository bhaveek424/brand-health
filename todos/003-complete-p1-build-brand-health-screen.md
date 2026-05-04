---
status: complete
priority: p1
issue_id: "003"
tags: [frontend, dashboard, brand-health]
dependencies: ["002"]
---

# Build Brand Health Screen

## Problem Statement

The first screen must make the value obvious in under one minute by showing the Tower cookware risk story immediately.

## Findings

- The first screen should default to Tower cookware and surface handle breakage as the top emerging issue.
- The category manager needs to scan risk, rating movement, negative review rate, issue exposure, and marketplace concentration.
- The interface should be dense and operational, not a landing page.

## Proposed Solutions

### Option 1: Operations Dashboard Overview

**Approach:** Build a compact dashboard with risk score, trend cards, top emerging issue, marketplace breakdown, and action entry points.

**Pros:**
- Strong five-minute demo opener.
- Makes business value clear before technical depth.
- Maps directly to the category manager user.

**Cons:**
- Requires careful visual hierarchy to avoid feeling like generic BI.

**Effort:** 3-4 hours

**Risk:** Low

---

### Option 2: Issue-First Home Screen

**Approach:** Make the top issue itself the home screen, with less overall brand context.

**Pros:**
- Very focused on the killer moment.

**Cons:**
- Loses the brand-health framing and commercial context.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

Build an operations dashboard overview that highlights handle breakage as the top risk and gives clear links into Issue Trends, Response Queue, and Weekly Brief.

## Technical Details

**Affected files:**
- `src/app/page.*`
- `src/components/brand-health/*`
- `src/components/charts/*`

**Related components:**
- Brand Risk Score card
- Rating trend
- Negative review rate
- Marketplace breakdown
- Commercial exposure summary

**Database changes:**
- None.

## Resources

- PRD sections: MVP Scope, Five-Minute Demo Path, Brand Risk Score, UI Principles.

## Acceptance Criteria

- [x] Default screen is Brand Health for Tower cookware.
- [x] Brand Risk Score is visible above the fold.
- [x] Handle breakage is clearly marked as the top high-risk issue.
- [x] Rating trend and negative review rate are visible.
- [x] Marketplace concentration identifies Noon UAE and Amazon India.
- [x] Estimated GMV and warranty exposure are visible.
- [x] Calls to action route to Issue Trends, Response Queue, and Weekly Brief.

## Work Log

### 2026-05-04 - Brand Health Screen UI/Demo Improvements

**By:** Codex

**Files changed:**
- `src/app/page.tsx` — Rewrote Brand Health page for operational density and demo impact.
  - Replaced metric grid with explicit 4-row layout (Risk → Issue → Marketplace/Warranty/Metrics → Commercial Summary → CTAs)
  - Made Brand Risk Score first and dominant (large score ring + risk label)
  - Made Handle Breakage unmistakable: 2xl bold title, CRITICAL/HIGH badge, exposed orders/GMV mini-cards
  - Added Marketplace Concentration card with amber highlighting on Noon UAE and Amazon India + CONCENTRATED badge
  - Added Warranty Exposure card with sky theme, exposed orders/GMV derived from current negative warranty reviews
  - Extended Commercial Exposure Summary with warranty row
  - Added clear CTA row (Issue Trends / Response Queue / Weekly Brief) as Link cards with hover state

**Verification:**
- `npm run lint` — clean
- `npm run build` — static export successful for `/`, `/issues`, `/responses`, `/brief`
- Visual walkthrough: Brand Risk Score, Handle Breakage spike, Noon UAE/Amazon India concentration, GMV + warranty exposure, and action links all visible in first viewport scroll.

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD Brand Health requirements into a ready implementation issue.

**Learnings:**
- The opening screen must sell the category-management workflow, not just show analytics.

