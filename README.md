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
SCRAPEGRAPH_LLM_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=your_openai_key
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
playwright install chromium
```

Run the backend:

```bash
uvicorn main:app --reload --port 8000
```

The backend requires Postgres (with pgvector) for run persistence. Quick local option:

```bash
cd backend
docker compose up -d
psql postgresql://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot -f migrations/001_initial_schema.sql
psql postgresql://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot -f migrations/002_add_extraction_runs.sql
psql postgresql://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot -f migrations/003_add_evidence_chunks.sql
psql postgresql://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot -f migrations/004_add_analyses.sql
psql postgresql://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot -f migrations/005_add_action_drafts.sql
psql postgresql://gtmcopilot:gtmcopilot@localhost:5432/gtmcopilot -f migrations/006_add_action_audit_log.sql
```

For full backend setup details, see `backend/README.md`.

The backend exposes:
- `GET /health`
- `POST /runs`
- `GET /runs/{run_id}`
- `POST /runs/{run_id}/extract` - Live product evidence extraction via open-source ScrapeGraphAI; also creates evidence chunks and embeddings
- `GET /runs/{run_id}/evidence` - Fetch extracted evidence for a run
- `GET /runs/{run_id}/evidence/chunks` - Fetch all evidence chunks for a run
- `POST /runs/{run_id}/evidence/search` - Search evidence chunks (vector search or text fallback)
- `POST /runs/{run_id}/analyze` - Generate persisted GTM risk analysis from evidence chunks
- `GET /runs/{run_id}/analysis` - Fetch the latest analysis for a run
- `POST /runs/{run_id}/actions/generate` - Generate approval-mode action drafts from the latest analysis
- `GET /runs/{run_id}/actions` - Fetch persisted action drafts for the run
- `POST /actions/{action_id}/approve` - Approve a draft (draft → approved); persists audit log
- `POST /actions/{action_id}/simulate-send` - Simulate send (approved → simulated_sent); no external connector called

The extraction path uses the open-source `scrapegraphai` Python library locally inside our FastAPI backend. It does not call ScrapeGraphAI Cloud and does not require a ScrapeGraphAI platform API key. The backend still needs an LLM provider key or a local model such as Ollama.

Evidence chunk embeddings use OpenAI `text-embedding-3-small` (1536 dims) if `OPENAI_API_KEY` is set. Without a key, chunks are stored without embeddings (`embedding_status: "missing_provider"`) and search falls back to text matching.

GTM risk analysis (`POST /runs/{run_id}/analyze`) reads stored evidence chunks and uses OpenAI (`ANALYSIS_MODEL`, default `gpt-4o-mini`) for AI analysis. Without `OPENAI_API_KEY`, a deterministic rule-based fallback is used and clearly labeled in the response and UI.

Action draft generation (`POST /runs/{run_id}/actions/generate`) produces approval-mode drafts from the latest completed analysis. Status transitions: `draft → approved → simulated_sent`. `POST /actions/{action_id}/approve` moves a draft to approved and writes an audit log row. `POST /actions/{action_id}/simulate-send` marks the draft as simulated_sent, returns a payload preview, and logs the event — no external connector is called. Invalid transitions (e.g. approving an already-approved draft) return 409. Drafts cover supplier escalation email, listing update brief, brand partner update, internal ops update (Slack/Teams), customer reply (when review evidence exists), and ops/engineering ticket. All drafts have `status: "draft"` and require explicit user approval — nothing is sent automatically. The endpoint is idempotent per analysis: re-calling returns existing drafts.

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
