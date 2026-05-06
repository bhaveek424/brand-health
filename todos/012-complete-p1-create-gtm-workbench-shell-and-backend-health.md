---
status: complete
priority: p1
issue_id: "012"
tags: [gtm-workbench, backend, frontend, vertical-slice]
dependencies: []
---

# Create GTM Workbench Shell and Backend Health Path

## What to build

Create the first end-to-end `/gtm-workbench` slice: a polished Next.js page that can reach a Python FastAPI backend health endpoint and show whether the backend is available.

This slice establishes the new product surface without replacing the existing dashboard or workbench pages.

## Acceptance Criteria

- [x] A Python FastAPI backend exists with a documented local run command.
- [x] Backend exposes a health endpoint returning service status and version.
- [x] Next.js exposes a new `/gtm-workbench` route.
- [x] `/gtm-workbench` renders a polished command-center layout with main canvas and right sidebar placeholders.
- [x] The page calls the backend health endpoint and shows connected/degraded state.
- [x] Existing routes continue to work.
- [x] Frontend `npm run lint` passes.
- [x] Frontend `npm run build` passes.

## Blocked by

None - can start immediately.

## Work Log

### 2026-05-06 - Issue Creation

**By:** Codex

**Actions:**
- Created from AI GTM Copilot vertical-slice plan.

**Learnings:**
- First slice must prove Next.js and FastAPI can talk before adding scraping, storage, or Tambo.

### 2026-05-06 - Implementation Complete

**By:** OpenCode

**Actions:**
- Added `backend/` with FastAPI skeleton (`main.py`), `requirements.txt`, `README.md`, and `.env.example`.
- Implemented `GET /health` returning `{status, version, service}`.
- Added `NEXT_PUBLIC_BACKEND_URL` env var (defaults to `http://localhost:8000`).
- Added `/gtm-workbench` route with command-center layout: URL input, run header, main canvas placeholders (Evidence, Risks, Listing QA, Action Drafts), and right sidebar placeholders (AI Copilot, Workflow Timeline).
- Added client-side health polling with connected/degraded/offline badge.
- Updated `DashboardLayout` nav, header, and sidebar labels for the new route.
- Updated root `README.md` with backend setup instructions and new route.
- Updated `.gitignore` to exclude Python backend artifacts while allowing `backend/.env.example`.

**Files changed:**
- `backend/main.py`
- `backend/requirements.txt`
- `backend/README.md`
- `backend/.env.example`
- `.gitignore`
- `.env`
- `README.md`
- `src/lib/backend.ts`
- `src/components/DashboardLayout.tsx`
- `src/app/gtm-workbench/page.tsx`

**Validation:**
- `npm run lint` passed.
- `npm run build` passed (including static route `/gtm-workbench`).
- Existing routes (`/`, `/issues`, `/responses`, `/brief`, `/workbench`) verified.
- Backend health endpoint verified locally at `http://localhost:8000/health`.
- CORS verified from frontend origin.
