# Opptra Voice-of-Customer Intelligence Demo

An AI-assisted product review workbench for turning marketplace reviews into category-manager actions.

The demo is designed for Opptra-style brand operations: paste an Amazon product URL or upload review data, then produce brand health signals, issue themes, response drafts, and an engineering/supplier handoff.

## What It Shows

- Live Amazon product review ingestion through SerpApi
- AI review analysis through NVIDIA's OpenAI-compatible API
- Deterministic fallback analysis when live AI is unavailable
- CSV upload with column mapping and row validation
- Brand health, issue trends, response queue, weekly brief, and workbench views
- Locally persisted latest workbench run with refresh and new-run controls
- Review-to-action artifacts: customer replies, supplier escalation, Slack-style update, and engineering handoff

## Demo Flow

1. Open `/workbench`.
2. Paste an Amazon URL or ASIN.
3. Run the live scan.
4. Review the generated themes, risks, drafts, and handoff.
5. Navigate to Brand Health, Issue Trends, or Response Queue for the polished dashboard views.
6. Return to Workbench; the latest run is restored from browser storage.

For a CSV demo, upload a file with review-like columns such as product, SKU, marketplace, rating, review text, date, market, and language. The app maps columns, validates rows, then runs the same analysis pipeline.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- SerpApi Amazon Product API
- NVIDIA API Catalog / NIM-compatible chat completions

## Environment Variables

Create `.env` or `.env.local` in the project root:

```bash
SERPAPI_API_KEY=your_serpapi_key
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

`NVIDIA_MODEL` is optional. The app defaults to `meta/llama-3.1-8b-instruct` for faster demos. Use `z-ai/glm-5.1` when quality matters more than latency.

`NEXT_PUBLIC_BACKEND_URL` is optional and defaults to `http://localhost:8000`.

Do not commit `.env` files. They are already ignored by git.

## Local Setup

### Frontend

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

### Backend (AI GTM Copilot)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend exposes a health endpoint at `http://localhost:8000/health`.

## Useful Routes

- `/` - Brand Health dashboard
- `/issues` - Issue trends
- `/responses` - Response queue
- `/brief` - Weekly brief
- `/workbench` - Live review intelligence run
- `/gtm-workbench` - AI GTM Copilot command center

## Validation

Run these before committing or deploying:

```bash
npm run lint
npm run build
```

## Deployment

Vercel is the recommended deployment target for this demo.

1. Push the repo to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add the environment variables in Vercel Project Settings:

```bash
SERPAPI_API_KEY=...
NVIDIA_API_KEY=...
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
```

4. Deploy.

The API keys are only read by server-side API routes and should not be exposed with `NEXT_PUBLIC_`.

## Live Data Notes

The Amazon adapter uses SerpApi's `amazon_product` response. Depending on the product, SerpApi may return individual author reviews, other-country reviews, review insight examples, or no usable review rows. The app normalizes all supported review shapes it receives.

The live fetch is cached in server memory by marketplace and ASIN for the lifetime of the running server process. Restarting the dev server clears that cache. The latest completed Workbench run is also saved in browser `localStorage` so navigation and refresh do not lose the demo state.

## Project Structure

```text
backend/                    Python FastAPI backend for AI GTM Copilot
src/app/
  api/live-amazon/          Server route for live Amazon review lookup
  api/workbench/analyze/    Server route for AI analysis
  workbench/                Review intelligence run UI
  gtm-workbench/            AI GTM Copilot command center
  issues/                   Issue trends dashboard
  responses/                Response queue dashboard
  brief/                    Weekly brief dashboard

src/lib/live/               Live provider adapters and schemas
src/lib/workbench/          CSV parsing, normalization, analysis, drafts, handoff
src/components/             Shared dashboard layout and UI primitives
```

## Positioning

This is not meant to be a production review platform. It is a product-builder prototype: a compact proof that messy marketplace review workflows can become structured, AI-assisted operating processes for merchandising, category, content, support, and supplier teams.
