---
status: complete
priority: p1
issue_id: "001"
tags: [nextjs, foundation, demo]
dependencies: []
---

# Scaffold Opptra Brand Health Agent Demo App

## Problem Statement

The workspace needs an application foundation for the Opptra Brand Health Agent prototype. The PRD requires a polished, local, five-minute demo with production-shaped architecture, so the project needs a clear web app structure before feature work begins.

## Findings

- The workspace currently has a PRD but no application files.
- The prototype should run locally with one command.
- The UI should feel like an internal category-management operations tool, not a marketing site.
- The app must support seeded data and precomputed outputs by default.

## Proposed Solutions

### Option 1: Next.js TypeScript App

**Approach:** Scaffold a Next.js TypeScript application with a compact dashboard layout, app-level navigation, and local fixture loading.

**Pros:**
- Fast to build and demo.
- Strong fit for interactive dashboard screens.
- Easy to extend with API routes or server actions later.

**Cons:**
- Requires Node dependencies.
- More setup than static HTML.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Static HTML/CSS/JS Prototype

**Approach:** Build a single static HTML app with bundled data and no framework.

**Pros:**
- Minimal setup.
- Easy to run without package installation.

**Cons:**
- Harder to keep typed data contracts and component structure clean.
- Less representative of production-shaped architecture.

**Effort:** 1 hour

**Risk:** Medium

## Recommended Action

Build a Next.js TypeScript app with a small design system, dashboard shell, and route structure for Brand Health, Issue Trends, Response Queue, and Weekly Brief. Keep data local and deterministic for the default demo path.

## Technical Details

**Affected files:**
- `package.json`
- `src/app/*`
- `src/components/*`
- `src/lib/*`
- `src/data/*`

**Related components:**
- Dashboard navigation
- Demo fixture loader
- Shared UI primitives

**Database changes:**
- None for prototype.

## Resources

- PRD: `PRODUCT_REQUIREMENTS.md`

## Acceptance Criteria

- [x] App can run locally with one documented command.
- [x] TypeScript is configured.
- [x] Four primary screen routes or tabs exist.
- [x] Shared dashboard shell exists.
- [x] Default route opens directly into the Tower cookware demo.
- [x] Styling is clean, dense, and suitable for an internal operations tool.

## Work Log

### 2026-05-04 - Review Fixes Applied

**By:** Codex

**Actions:**
- Removed network-dependent Google Fonts (`next/font/google` Inter import) from `src/app/layout.tsx`.
- Switched to local/system font stack inherited from `globals.css` (`Arial, Helvetica, sans-serif`).
- Verified rendered HTML contains no `googleapis.com`, `fonts.gstatic.com`, or `Inter` references.
- Repaired broken `eslint` binary (`rm node_modules/.bin/eslint && npm install eslint@^9 eslint-config-next@16.2.4`).
- Ran `npm run lint` — 0 errors, 3 acceptable warnings (unused params for future extension).
- Ran `npm run build` — passes cleanly.

**Commands run:**
```bash
npm install
npm run lint
npm run build
```

**Verification:**
- `grep -r "next/font/google" src/` returns nothing.
- `curl -s http://localhost:3000 | grep googleapis` returns nothing.

### 2026-05-04 - Implementation Complete

**By:** Codex

**Actions:**
- Scaffolded Next.js 16.2.4 TypeScript app with Tailwind CSS.
- Created shared dashboard shell (`DashboardLayout`) with persistent nav for Brand Health, Issue Trends, Response Queue, Weekly Brief.
- Built four screen routes: `/`, `/issues`, `/responses`, `/brief`.
- Defaulted entire app to Tower 24cm pan demo without any setup step.
- Added dense, operational UI styling with cards, tables, progress bars, and status badges.
- Verified build passes (`npx next build`) and dev server runs (`npm run dev`).

**Files changed:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- `src/app/layout.tsx`, `src/app/globals.css`
- `src/app/page.tsx` (Brand Health)
- `src/app/issues/page.tsx` (Issue Trends)
- `src/app/responses/page.tsx` (Response Queue)
- `src/app/brief/page.tsx` (Weekly Brief)
- `src/components/DashboardLayout.tsx`
- `src/components/SharedUI.tsx`

**Verification:**
- `npm run dev` starts the app on `http://localhost:3000`.
- All four routes render correctly.
- Default route opens directly into Tower cookware brand health dashboard.

### 2026-05-04 - Initial Issue Creation

**By:** Codex

**Actions:**
- Converted PRD foundation requirements into a ready implementation issue.

**Learnings:**
- The app should optimize for demo reliability over infrastructure breadth.

