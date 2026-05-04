---
status: complete
priority: p1
issue_id: "002"
tags: [data, analysis, ai-pipeline]
dependencies: ["001"]
---

# Build Seeded Data and Analysis Pipeline

## Problem Statement

The demo needs realistic marketplace review data and deterministic analysis outputs so the five-minute story works without live marketplace scraping or API keys.

## Findings

- The core demo story depends on a handle-breakage spike for the Tower 24cm pan.
- Required demo marketplaces are Amazon India, Flipkart India, Noon UAE, and Noon KSA.
- Required languages are English, Hindi/Hinglish, and Arabic, with Bahasa Indonesia represented as a future-ready extension.
- The PRD requires pluggable ingestion, normalized schema, sentiment, themes, spike detection, and a documented Brand Risk Score.

## Proposed Solutions

### Option 1: Static Fixtures Plus Deterministic Analysis

**Approach:** Store seeded review, product, brand, theme, trend, and response data in TypeScript or JSON fixtures. Implement deterministic analysis helpers for sentiment, issue trends, and risk scoring.

**Pros:**
- Reliable demo with no API dependency.
- Easy to inspect in interview.
- Supports production-shaped seams without overbuilding.

**Cons:**
- Less impressive than live data if not documented honestly.

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 2: Live LLM Analysis on Seed Data

**Approach:** Use OpenAI or another model provider to classify, cluster, and summarize fixture reviews at runtime.

**Pros:**
- Shows live AI behavior.
- Closer to eventual production flow.

**Cons:**
- Demo can fail due to keys, latency, quota, or inconsistent output.
- Requires eval and fallback work.

**Effort:** 5-8 hours

**Risk:** Medium

## Recommended Action

Use static fixtures plus deterministic analysis as the default path. Add provider interfaces or clear function boundaries for future embeddings, translation, and generation.

## Technical Details

**Affected files:**
- `src/data/brands.*`
- `src/data/products.*`
- `src/data/reviews.*`
- `src/lib/schema.*`
- `src/lib/analysis/*`

**Related components:**
- Review ingestion adapter interface
- Sentiment classification
- Theme assignment
- Spike detection
- Brand Risk Score calculation

**Database changes:**
- None for prototype.

## Resources

- PRD sections: Review Ingestion, Multilingual Review Normalization, Sentiment and Theme Analysis, Emerging Issue Detection, Brand Risk Score.

## Acceptance Criteria

- [x] Seeded reviews include Amazon India, Flipkart India, Noon UAE, and Noon KSA.
- [x] Seeded reviews include English, Hindi/Hinglish, and Arabic examples.
- [x] Data model includes Brand, Product, Review, Theme, IssueTrend, DraftResponse, and WeeklyBrief equivalents.
- [x] Handle breakage baseline share is represented as 2%.
- [x] Handle breakage current share is represented as 12%.
- [x] Analysis helpers produce deterministic outputs.
- [x] Brand Risk Score is explainable and documented in code or README.
- [x] Ingestion interface makes live marketplace adapters a future extension.

## Work Log

### 2026-05-04 - Review Fixes Applied

**By:** Codex

**Actions:**
- **Fixed response queue source data** (`src/lib/demo-data.ts`): `demoDraftResponses` now prioritizes current-period handle-breakage reviews (the spike story) first, then other current negatives, then baseline. Sorted to show English → Hindi/Hinglish → Arabic for the demo narrative.
- **Fixed localized draft generation** (`src/lib/drafting.ts`):
  - Replaced hardcoded `language_match: true` with per-language detection (`checkLanguageMatch`).
  - Replaced hardcoded English support path with localized `SUPPORT_PATH` per language (EN/HI/AR/ID) including the email domain.
  - Made `mentions_exact_issue` language-aware: Arabic checks for `المقبض`, Hindi checks for `handle`/`हैंडल`, English checks for `handle`/`coating`.
  - Kept forbidden-phrase checks against brand config and expanded over-admission list with "guaranteed replacement" / "automatic refund".
  - Drafts remain brand-safe; no "recall", "defective batch", "our fault", or guaranteed refund/replacement language.
- **Fixed weekly brief evidence count** (`src/lib/weekly-brief.ts`): Replaced hardcoded "7 customer reviews" with dynamic `evidenceCount` from `trends[0].affected_review_ids.length`. Percentages and counts now match Issue Trends screen.
- **Reparsed todo file renamed** from `ready` to `complete` to match frontmatter.
- Repaired broken `eslint` binary; cleaned up unused imports/parameters (`Review`, `_lang`, `reviews`); ran `npm run lint` (0 errors, 0 warnings) and `npm run build` (passes).

**Files changed in review:**
- `src/app/layout.tsx`
- `src/lib/demo-data.ts`
- `src/lib/drafting.ts`
- `src/lib/weekly-brief.ts`

**Commands run:**
```bash
npm install eslint@^9 eslint-config-next@16.2.4
npm run lint   # 0 errors, 0 warnings
npm run build  # passes with static prerendering
```

**Verification:**
- `/responses` shows handle-breakage reviews from Noon UAE (EN, AR) and Amazon India (EN, HI) prioritized at the top.
- Each draft response includes localized support path in reviewer's language.
- Quality checklist items reflect actual detection, not hardcoded `true`.
- `/brief` shows "Evidence: 4 customer reviews" matching the current spike.
- `/brief` shows "spiked from 2% to 12%" dynamically.

### 2026-05-04 - Implementation Complete

**By:** Codex

**Actions:**
- Defined full TypeScript schema (`src/lib/schema.ts`) with Brand, Product, Review, Theme, IssueTrend, DraftResponse, WeeklyBrief, and BrandRiskScore.
- Created seeded brand config (`src/data/brands.ts`) for Tower with locale rules, forbidden phrases, and warranty/support policies.
- Created seeded products (`src/data/products.ts`) defaulting to Tower 24cm pan across Amazon India, Flipkart, Noon UAE, Noon KSA.
- Built 100 baseline + 33 current seeded reviews in English, Hindi/Hinglish, Arabic, and Bahasa Indonesia (`src/data/reviews.ts`).
- Tightened theme keyword signatures to avoid false positives (e.g., removed standalone Arabic "مقبض" which matched positive handle mentions).
- Implemented deterministic analysis pipeline (`src/lib/analysis.ts`): sentiment, theme assignment, spike detection, Brand Risk Score with documented formula.
- Created deterministic response draft engine (`src/lib/drafting.ts`) with brand guardrails and quality checklist.
- Created weekly brief generator (`src/lib/weekly-brief.ts`) with supplier escalation draft and function-specific actions.
- Exposed `IngestionAdapter` interface as a clear seam for live marketplace adapters.
- Verified handle breakage is exactly 2% baseline (2/100) and ~12% current (4/33), concentrated on Noon UAE and Amazon India.

**Files changed:**
- `src/lib/schema.ts`
- `src/lib/analysis.ts`
- `src/lib/drafting.ts`
- `src/lib/weekly-brief.ts`
- `src/lib/demo-data.ts`
- `src/data/brands.ts`
- `src/data/products.ts`
- `src/data/themes.ts`
- `src/data/reviews.ts`

**Verification:**
- `npx next build` passes with zero TypeScript errors.
- `npm run dev` renders all four screens correctly.
- `/` shows Brand Risk Score, Handle Breakage as top issue, marketplace/language breakdowns.
- `/issues` shows spike from 2% to 12% with multilingual evidence (EN, HI, AR).
- `/responses` shows 8 AI-drafted responses in reviewer languages with quality checklist.
- `/brief` shows executive summary with 2%→12% spike, supplier escalation draft, and 5 function-specific actions.

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD data and AI-pipeline requirements into a ready implementation issue.

**Learnings:**
- Demo reliability requires precomputed or deterministic outputs as the primary path.

