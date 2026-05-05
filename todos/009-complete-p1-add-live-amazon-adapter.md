---
status: complete
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
- `src/app/api/live-amazon/route.ts`
- `src/app/workbench/page.tsx`

**Database changes:**
- None.

## Resources

- PRD: `REVIEW_TO_ACTION_WORKBENCH_PRD.md`

## Acceptance Criteria

- [x] User can paste Amazon URL or ASIN.
- [x] ASIN parser handles `/dp/<ASIN>` and `/gp/product/<ASIN>`.
- [x] Server route calls SerpApi only when `SERPAPI_API_KEY` exists.
- [x] Missing key returns clear error or captured sample option.
- [x] Live reviews normalize into workbench review schema.
- [x] UI labels run mode as `Live API run` or `Captured sample`.
- [x] Cache prevents repeated calls for same product during rehearsal.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Created live Amazon adapter todo from pivot PRD.

**Learnings:**
- Live Amazon should follow CSV workflow, not precede it.

### 2026-05-05 - Implementation & Verification

**By:** OpenCode

**Actions:**
- Created `src/lib/live/asin.ts` to parse raw ASIN, `/dp/<ASIN>`, `/gp/product/<ASIN>`.
- Created `src/lib/live/cache.ts` with 24-hour TTL in-memory cache keyed by marketplace + ASIN.
- Created `src/lib/live/amazon-serpapi.ts` adapter that:
  - Reads `SERPAPI_API_KEY` server-side.
  - Calls SerpApi `amazon_product` engine.
  - Normalizes `reviews_information.authors_reviews` into `NormalizedReview[]`.
  - Falls back to captured sample mode when key is missing.
- Created `src/app/api/live-amazon/route.ts` POST handler to accept URL/ASIN and return normalized reviews + runMode label.
- Added minimal live Amazon UI to `src/app/workbench/page.tsx`:
  - Input field + "Run Live" button on upload step.
  - Run mode badge (`Live API run` / `Captured sample`) displayed on analysis step.
  - Reused existing analysis/drafting/handoff pipeline for live data.
- Kept existing CSV workflow untouched.

**Verification:**
- `npm run lint` passes.
- `npm run build` passes.
- Route correctly registered as dynamic: `ƒ /api/live-amazon`.

**Files changed:**
- `src/lib/live/asin.ts` (new)
- `src/lib/live/cache.ts` (new)
- `src/lib/live/amazon-serpapi.ts` (new)
- `src/app/api/live-amazon/route.ts` (new)
- `src/app/workbench/page.tsx` (modified)

