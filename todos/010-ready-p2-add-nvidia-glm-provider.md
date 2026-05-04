---
status: ready
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

- [ ] `AiAnalysisProvider` interface exists.
- [ ] `SampleAnalysisProvider` works without keys.
- [ ] `NvidiaGlmProvider` uses `NVIDIA_API_KEY`.
- [ ] `NVIDIA_MODEL` defaults to `z-ai/glm-5.1`.
- [ ] AI response uses strict structured JSON.
- [ ] Invalid model response falls back gracefully or returns clear error.
- [ ] UI shows provider/model badge.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.

## Work Log

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Created NVIDIA GLM provider todo from pivot PRD.

**Learnings:**
- Hosted AI provider should be optional until CSV workflow is stable.

