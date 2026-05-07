---
status: complete
priority: p1
issue_id: "019"
tags: [tambo, copilot, tools, generative-ui]
dependencies: ["013"]
---

# Add Tambo Copilot Shell and Run Tools

## What to build

Add the Tambo-powered right sidebar copilot to `/gtm-workbench` with tools for run creation and run inspection.

The copilot should be able to start from a user prompt or product URL and drive the same persisted run path as the main URL input.

## Acceptance Criteria

- [x] Tambo dependencies and provider setup are added according to current Tambo docs.
- [x] `/gtm-workbench` right sidebar includes a polished AI Copilot panel.
- [x] Copilot can call a tool to create a run from a URL.
- [x] Copilot can call a tool to fetch run status and events.
- [x] Copilot can show useful textual responses grounded in run state.
- [x] Tool calls update the same backend run and workflow timeline as the main UI.
- [x] Missing backend or invalid URL states are handled gracefully.
- [x] Existing page functionality continues to work without using chat.

## Blocked by

- 013

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- Chat should orchestrate the product workflow, not sit beside it as a FAQ bot.

### 2026-05-07 - Implementation

**By:** Claude

**Actions:**
- Created `src/components/CopilotPanel.tsx`:
  - Self-contained `"use client"` component with its own scoped `TamboProvider` (not in root layout).
  - Outer `CopilotPanel` checks `NEXT_PUBLIC_TAMBO_API_KEY`; renders "configure API key" message if absent.
  - Inner `CopilotChat` uses `useTambo()` and `useTamboThreadInput()`.
  - `createRunFromUrl` tool: calls `POST /runs`, invokes `onRunCreated` callback to sync page state.
  - `getRunStatus` tool: calls `GET /runs/{id}`, invokes `onRunLoaded` callback.
  - Tools defined with `defineTool()` + Zod schemas, registered via `registerTools` in `useEffect`.
  - Message thread renders user messages (right-aligned, dark) and copilot replies (left-aligned, light).
  - Active run shown in context banner at top of panel.
  - Textarea input with Enter-to-submit (Shift+Enter for newline); loading dots during streaming.
- Updated `src/app/gtm-workbench/page.tsx`:
  - Imported `CopilotPanel`.
  - Added `handleRunCreated` callback: full downstream state clear + URL sync (mirrors `handleCreateRun`).
  - Added `handleRunLoaded` callback: updates run state from tool result.
  - Replaced placeholder sidebar card with `CopilotPanel` component.
- Updated `README.md`: added `NEXT_PUBLIC_TAMBO_API_KEY` to env var block with description.
- Updated `AI_GTM_COPILOT_PRD.md`: issue 019 completion summary.
- Renamed `todos/019-ready-...md` → `todos/019-complete-...md`.

**Files changed:**
- `src/components/CopilotPanel.tsx` (new)
- `src/app/gtm-workbench/page.tsx`
- `README.md`
- `AI_GTM_COPILOT_PRD.md`
- `todos/019-complete-p1-add-tambo-copilot-shell-and-run-tools.md` (renamed)

**Validation:**
- `npm run lint` — no issues.
- `npm run build` — clean (11/11 pages, TypeScript check passed).
- Live end-to-end: not run — requires `NEXT_PUBLIC_TAMBO_API_KEY` and live database.
