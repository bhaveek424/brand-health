---
status: complete
priority: p1
issue_id: "008"
tags: [workbench, csv, workflow, genai-product-builder]
dependencies: ["001", "002"]
---

# Build Review-to-Action Workbench CSV Workflow

## Problem Statement

The current prototype still feels dashboard-led. For the GenAI Product Builder role, the next slice must feel like a workflow tool that turns messy CSV/Excel review exports into structured AI-assisted action.

## Findings

- The target role values messy workflow transformation more than polished static dashboards.
- CSV upload maps directly to Excel-and-Slack-driven operations.
- This slice should not depend on SerpApi, NVIDIA, Gemini, Apify, or live marketplace scraping.
- Existing seeded analysis and drafting modules can be reused where practical.

## Proposed Solutions

### Option 1: Build CSV Workbench First

**Approach:** Add `/workbench` with CSV upload, flexible column mapping, validation preview, normalized rows, deterministic analysis, action drafts, and engineering handoff.

**Pros:**
- Strongest fit for the role.
- Works without paid keys.
- Demonstrates rapid prototyping with messy business data.

**Cons:**
- Less flashy than live URL fetch until Slice 2.

**Effort:** 4-6 hours

**Risk:** Low

---

### Option 2: Build Live Amazon First

**Approach:** Start with SerpApi Amazon reviews and hosted AI provider.

**Pros:**
- More obviously live.

**Cons:**
- Depends on credentials and external API reliability.
- Less directly tied to Excel/Slack workflow transformation.

**Effort:** 6-10 hours

**Risk:** Medium

## Recommended Action

Build the CSV workbench first. Keep existing dashboard pages working.

## Technical Details

**Affected files:**
- `src/app/workbench/page.tsx`
- `src/lib/workbench/*`
- `src/components/DashboardLayout.tsx`
- `todos/008-*`

**Related components:**
- CSV parser
- Column alias mapper
- Validation preview
- Normalized review model
- Workbench analysis
- Action draft generator
- Engineering handoff generator

**Database changes:**
- None.

## Resources

- PRD: `REVIEW_TO_ACTION_WORKBENCH_PRD.md`

## Acceptance Criteria

- [x] `/workbench` page exists.
- [x] User can upload a `.csv` review export.
- [x] Parser supports flexible column aliases.
- [x] UI shows mapping and validation preview.
- [x] Missing required columns produce clear errors.
- [x] Accepted rows are normalized.
- [x] Analysis produces sentiment split, issue themes, evidence, and top risks.
- [x] Workflow generates customer replies, supplier note, Slack summary, listing recommendations, and action brief.
- [x] Engineering Handoff section includes input schema, normalized schema, business rules, human approval checkpoints, edge cases, and production requirements.
- [x] Existing pages still work.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Created todo from Review-to-Action Workbench PRD.

**Learnings:**
- CSV path should be built before live marketplace adapters because it best matches the GenAI Product Builder role.

### 2026-05-04 - Built CSV Workbench Workflow

**By:** OpenCode

**Actions:**
- Created `src/lib/workbench/csv-parser.ts` with CSV parsing and quoted comma support.
- Created `src/lib/workbench/column-mapper.ts` with flexible alias mapping for all required fields.
- Created `src/lib/workbench/normalizer.ts` to normalize rows and validate ratings / review body.
- Created `src/lib/workbench/analysis.ts` for deterministic sentiment split, theme detection, and risk ranking.
- Created `src/lib/workbench/drafting.ts` for customer replies, supplier note, Slack summary, listing recommendations, and action brief.
- Created `src/lib/workbench/engineering-handoff.ts` with input schema, normalized schema, business rules, approval checkpoints, edge cases, production requirements, and suggested integrations.
- Created `src/app/workbench/page.tsx` with full workflow UI wrapped in DashboardLayout.
- Added `/workbench` nav link to `DashboardLayout`.
- Verified `npm run lint` and `npm run build` pass without errors.

**Learnings:**
- Deterministic keyword-based theme detection works well for a Slice 1 prototype without AI provider dependencies.
- Keeping normalization and validation explicit makes engineering handoff easier.
- Existing Card / Badge / ProgressBar components from SharedUI reused cleanly.
- Need to ensure proper escaping of quotes inside JS strings to avoid parsing errors.

### 2026-05-05 - Cleanup and Polish Before Calling 008 Complete

**By:** OpenCode

**Actions:**
- Renamed todo file to `008-complete-p1-build-workbench-csv-workflow.md`.
- Updated `DashboardLayout.tsx` to be context-aware:
  - `/workbench` sidebar subtitle -> "Review-to-Action Workbench".
  - `/workbench` footer -> "CSV Workflow Mode".
  - `/workbench` top header -> shows workbench title and workflow pipeline instead of Tower Cookware / SKU.
  - Existing dashboard pages keep old Tower context.
- Improved validation preview in `src/app/workbench/page.tsx`:
  - Mapping step now shows preview table of first 5 parsed rows.
  - Normalization step shows accepted/rejected counts.
  - Shows rejected row errors with row number, field, message.
  - Blocks progression to analysis if all rows rejected.
- Improved Engineering Handoff in `src/lib/workbench/engineering-handoff.ts`:
  - Added `ObservedData` with total uploaded rows, accepted rows, rejected rows.
  - Added markets seen, marketplaces seen, SKUs seen, validation errors found.
  - UI renders observed data before static specs.
- No SerpApi, NVIDIA GLM, Gemini, Apify, or live Amazon added.
- `npm run lint` passes.
- `npm run build` passes.

**Learnings:**
- Context-aware layout prevents workbench from feeling like a bolt-on to the dashboard.
- Showing observed data in handoff makes the spec feel generated from real upload, not static boilerplate.
- Preview table before analysis gives user confidence before committing normalization.
