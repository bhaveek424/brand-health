---
status: complete
priority: p2
issue_id: "010"
tags: [ai-provider, nvidia, glm, structured-output]
dependencies: ["008"]
---

# Add NVIDIA GLM-5.1 AI Provider

## Problem Statement

The workbench needs a real hosted AI provider to move beyond deterministic analysis while preserving a sample fallback.

## Findings

- NVIDIA GLM-5.1 is accessible through hosted API docs and fits agentic workflow positioning.
- Provider abstraction keeps the prototype portable.
- The UI should show the model/provider used.
- Structured JSON is required for reliable UI rendering.

## Proposed Solutions

### Option 1: Provider Abstraction Plus NVIDIA GLM

**Approach:** Add `AiAnalysisProvider`, `SampleAnalysisProvider`, and `NvidiaGlmProvider`. Use strict structured JSON prompt and validate response shape.

**Pros:**
- Real AI call.
- Stronger interview signal.
- Keeps fallback reliable.

**Cons:**
- Requires `NVIDIA_API_KEY`.
- Model JSON can fail without validation.

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

Implement provider abstraction with NVIDIA GLM as optional live provider and sample provider as fallback.

## Technical Details

**Affected files:**
- `src/lib/live/providers.ts`
- `src/lib/live/nvidia-glm.ts`
- `src/lib/live/sample-provider.ts`
- `src/lib/live/schema.ts`
- `src/app/api/workbench/analyze/route.ts`
- `src/app/workbench/page.tsx`

**Database changes:**
- None.

## Resources

- PRD: `REVIEW_TO_ACTION_WORKBENCH_PRD.md`

## Acceptance Criteria

- [x] `AiAnalysisProvider` interface exists.
- [x] `SampleAnalysisProvider` works without keys.
- [x] `NvidiaGlmProvider` uses `NVIDIA_API_KEY`.
- [x] `NVIDIA_MODEL` defaults to `z-ai/glm-5.1`.
- [x] AI response uses strict structured JSON.
- [x] Invalid model response falls back gracefully or returns clear error.
- [x] UI calls `/api/workbench/analyze` and uses returned `analysis`.
- [x] Provider/model metadata shown; `fallbackFrom` and `fallbackReason` rendered if present.
- [x] API failure gracefully falls back to deterministic `analyzeWorkbench(a)` with honest badges.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Created NVIDIA GLM provider todo from pivot PRD.

**Learnings:**
- Hosted AI provider should be optional until CSV workflow is stable.

### 2026-05-05 - Implementation

**By:** OpenCode

**Actions:**
- Created `src/lib/live/schema.ts` with `AiAnalysisProvider` interface, `ProviderMetadata`, and `AiAnalysisResult`.
- Created `src/lib/live/sample-provider.ts` with `SampleAnalysisProvider` implementing deterministic local analysis, no API keys needed.
- Created `src/lib/live/nvidia-glm.ts` with `NvidiaGlmProvider` calling NVIDIA OpenAI-compatible chat completions endpoint.
  - Defaults to `z-ai/glm-5.1` via `process.env.NVIDIA_MODEL`.
  - Returns clear error when `NVIDIA_API_KEY` is missing.
  - Uses `response_format: { type: "json_object" }` for structured output.
  - Validates top-level shape and nested theme/risk arrays strictly.
- Created `src/lib/live/providers.ts` with `getProvider()` and `analyzeWithFallback()`
  - Falls back to `SampleAnalysisProvider` if NVIDIA returns invalid JSON, validation failure, or API error.
- Created `src/lib/live/index.ts` for clean barrel exports.
- Created `src/app/api/workbench/analyze/route.ts` as POST handler returning JSON with HTTP status mapped to success.
- Updated `src/app/workbench/page.tsx`:
  - `acceptMapping` is now `async` and calls `POST /api/workbench/analyze` with `{ reviews: acceptedRows }`.
  - Uses returned `analysis`, `metadata.provider`, `metadata.model`, `metadata.fallbackFrom`, `metadata.fallbackReason`.
  - On API failure, catches error, falls back to deterministic `analyzeWorkbench(a)`, and sets provider badges to `sample/deterministic` with `fallbackFrom: "api"` and `fallbackReason`.
  - Added `isAnalyzing` state and disabled button during request.
  - Reset `providerMeta` on reset.

**Files changed:**
- `src/lib/live/schema.ts` (new)
- `src/lib/live/sample-provider.ts` (new)
- `src/lib/live/nvidia-glm.ts` (new)
- `src/lib/live/providers.ts` (new)
- `src/lib/live/index.ts` (new)
- `src/app/api/workbench/analyze/route.ts` (new)
- `src/app/workbench/page.tsx` (modified)

**Verification:**
- `npm run lint` passes
- `npm run build` passes (includes `/api/workbench/analyze` dynamic route)

### 2026-05-05 - UI Integration Fix

**By:** OpenCode

**Actions:**
- Fixed duplicate `acceptMapping`/`reset` definitions caused by overlapping edits.
- Verified brace balance and lint/build pass.
- Renamed todo from `010-ready-p2-add-nvidia-glm-provider.md` to `010-complete-p2-add-nvidia-glm-provider.md` and updated frontmatter `status: complete`.

