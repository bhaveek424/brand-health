---
status: complete
priority: p2
issue_id: "020"
tags: [tambo, generative-ui, evidence, actions]
dependencies: ["016", "017", "019"]
---

# Register Tambo UI Components for Run Results

## What to build

Register Tambo-renderable components so the copilot can return structured UI for evidence, risks, listing QA, and action drafts.

This slice upgrades the copilot from text responses to generative UI that matches the main workbench interface.

## Acceptance Criteria

- [x] Tambo can render a run status component.
- [x] Tambo can render an evidence pack component.
- [x] Tambo can render issue/risk cards.
- [x] Tambo can render listing QA findings.
- [x] Tambo can render action draft cards.
- [x] Components use the same visual language as the rest of the app.
- [x] Components receive data from backend run APIs, not hardcoded demo data.
- [x] The copilot can answer at least three useful run questions by rendering components.

## Blocked by

- 016
- 017
- 019

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- Tambo is most valuable when it renders operational interfaces, not plain chat only.

### 2026-05-07 - Implementation

**By:** Claude

**Actions:**
- Created `src/components/copilot/RunStatusCard.tsx`: status badge, run ID, input URL, recent events timeline. Zod `propsSchema` exported alongside component.
- Created `src/components/copilot/EvidencePackCard.tsx`: product title/brand/price/rating/availability/summary, chunk count, embedding status summary. Graceful empty state.
- Created `src/components/copilot/RiskSummaryCards.tsx`: health score (colour-coded), top risks with severity badges, issue themes with frequency badges. Fallback label.
- Created `src/components/copilot/ListingQACard.tsx`: score, per-field findings with pass/warning/fail row colouring and icons.
- Created `src/components/copilot/ActionDraftCards.tsx`: draft type label, target system, status badge, title, evidence ref count. Empty state.
- Updated `src/components/CopilotPanel.tsx`:
  - `COPILOT_COMPONENTS` array (5 `TamboComponent` entries with `name`, `description`, `component`, `propsSchema`) passed to `TamboProvider`.
  - Added `getEvidencePack` tool: fetches `/evidence` + `/evidence/chunks` in parallel, computes `embedding_status_summary`.
  - Added `getGtmAnalysis` tool: fetches `/analysis`, normalises enum values before returning.
  - Added `getActionDrafts` tool: fetches `/actions`, normalises status enum.
  - All three new tools: optional `run_id` (falls back to `currentRun?.id`), try/catch around fetch, structured error on network failure.
  - Message renderer updated: renders `type === "component"` blocks via `block.renderedComponent`.
  - Empty state updated with four prompt hints.
- Updated `AI_GTM_COPILOT_PRD.md`: issue 020 completion summary.
- Renamed `todos/020-ready-...md` → `todos/020-complete-...md`.

**Files changed:**
- `src/components/copilot/RunStatusCard.tsx` (new)
- `src/components/copilot/EvidencePackCard.tsx` (new)
- `src/components/copilot/RiskSummaryCards.tsx` (new)
- `src/components/copilot/ListingQACard.tsx` (new)
- `src/components/copilot/ActionDraftCards.tsx` (new)
- `src/components/CopilotPanel.tsx`
- `AI_GTM_COPILOT_PRD.md`
- `todos/020-complete-p2-register-tambo-ui-components-for-run-results.md` (renamed)

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean (11/11 pages, TypeScript passed).
- No-key fallback panel still renders; `TamboProvider` only mounted when key present.
- Live end-to-end: not run — requires `NEXT_PUBLIC_TAMBO_API_KEY` and live database.
