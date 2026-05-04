---
status: ready
priority: p1
issue_id: "009"
tags: [workbench, amazon, serpapi, live-data]
dependencies: ["008"]
---

# Add Live Amazon Adapter

## Problem Statement

After the CSV workflow exists, the prototype needs a live data path that proves simple API integration with real marketplace data.

## Findings

- Amazon official PA-API is not suitable for review text.
- SerpApi can expose Amazon review information.
- Free-tier usage should be protected with caching.
- Live mode must be honest when credentials are missing.

## Proposed Solutions

### Option 1: SerpApi Amazon Adapter

**Approach:** Accept Amazon URL or ASIN, extract ASIN, call SerpApi, normalize returned review data, and feed the workbench analysis.

**Pros:**
- Real live product input.
- Simple API route integration.
- Strong demo moment.

**Cons:**
- Requires `SERPAPI_API_KEY`.
- Review availability varies by product.

**Effort:** 4-6 hours

**Risk:** Medium

---

### Option 2: Browser Scraping

**Approach:** Use Playwright to scrape reviews directly.

**Pros:**
- No third-party API cost.

**Cons:**
- Brittle and risky in demos.
- More anti-bot and legal ambiguity.

**Effort:** 8-12 hours

**Risk:** High

## Recommended Action

Use SerpApi. Add captured sample mode when keys are missing.

## Technical Details

**Affected files:**
- `src/lib/live/amazon-serpapi.ts`
- `src/lib/live/asin.ts`
- `src/lib/live/cache.ts`
- `src/app/api/workbench/analyze/route.ts`
- `src/app/workbench/page.tsx`

**Database changes:**
- None.

## Resources

- PRD: `REVIEW_TO_ACTION_WORKBENCH_PRD.md`

## Acceptance Criteria

- [ ] User can paste Amazon URL or ASIN.
- [ ] ASIN parser handles `/dp/<ASIN>` and `/gp/product/<ASIN>`.
- [ ] Server route calls SerpApi only when `SERPAPI_API_KEY` exists.
- [ ] Missing key returns clear error or captured sample option.
- [ ] Live reviews normalize into workbench review schema.
- [ ] UI labels run mode as `Live API run` or `Captured sample`.
- [ ] Cache prevents repeated calls for same product during rehearsal.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Created live Amazon adapter todo from pivot PRD.

**Learnings:**
- Live Amazon should follow CSV workflow, not precede it.

