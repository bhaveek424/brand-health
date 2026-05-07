# AI GTM Copilot PRD

## Product Statement

Paste any marketplace product URL. The AI GTM Copilot extracts live evidence, stores it, analyzes launch and operating risks, answers questions with citations, and turns findings into approved operational actions.

## Current Milestone

Milestone 1 is a vertical slice through:

1. Persisted run creation.
2. Backend workflow events.
3. Local product evidence extraction.
4. Evidence storage.
5. Risk analysis.
6. Tambo copilot interface.
7. Approval-mode action handoff.

## Extraction Decision

Use the open-source ScrapeGraphAI Python library locally inside the FastAPI backend.

Do not use:

- ScrapeGraphAI Cloud.
- ScrapeGraphAI hosted API endpoints.
- `SCRAPEGRAPHAI_API_KEY`.

Use:

- `scrapegraphai` Python package.
- Playwright browser runtime.
- `SmartScraperGraph`.
- Our own LLM provider key or local model configuration.

## Required Extraction Output

The local extraction service should normalize results into:

- product title
- brand
- price
- currency
- rating
- review count
- availability
- seller
- images
- bullets
- description
- specifications
- warranty or returns text
- visible review snippets
- summary
- extraction quality: confidence, missing fields, warnings

## Backend Shape

FastAPI endpoints:

- `GET /health`
- `POST /runs`
- `GET /runs/{run_id}`
- `POST /runs/{run_id}/extract`
- `GET /runs/{run_id}/evidence`
- `GET /runs/{run_id}/evidence/chunks`
- `POST /runs/{run_id}/evidence/search`
- `POST /runs/{run_id}/analyze`
- `GET /runs/{run_id}/analysis`

Persistence:

- `products`
- `runs`
- `run_events`
- `extraction_runs`
- `evidence_chunks` (pgvector, 1536-dim embeddings via OpenAI text-embedding-3-small)
- `analyses` (GTM risk analysis: health score, risks, themes, listing QA, actions, citations)

## Environment

Backend extraction should support:

```bash
SCRAPEGRAPH_LLM_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=...
```

or local model mode:

```bash
SCRAPEGRAPH_LLM_MODEL=ollama/llama3.2
OLLAMA_BASE_URL=http://localhost:11434
```

## Non-Goals For Issue 014

- Embeddings.
- AI risk analysis.
- Tambo UI.
- Action drafts.
- Real email, Slack, ticket, or marketplace reply connectors.
- Hosted ScrapeGraphAI Cloud integration.

## Completed: Issue 016 - GTM Risk Analysis

Issue 016 adds persisted GTM risk analysis from stored evidence chunks. `POST /runs/{run_id}/analyze` loads `EvidenceChunk` rows for the run, calls OpenAI (`gpt-4o-mini` by default, configurable via `ANALYSIS_MODEL`) with a structured JSON prompt, and persists the result in the `analyses` table. If `OPENAI_API_KEY` is absent or the call fails, a rule-based deterministic analysis is generated and clearly labeled `provider: "deterministic_fallback"`. Workflow events: `analysis_started`, `analysis_completed`, `analysis_fallback_used`, `analysis_failed`. The `/gtm-workbench` UI renders health score, risk cards, issue themes, listing QA checklist, recommended actions, and evidence citations.

## Completed: Issue 015 - Evidence Chunks and Embeddings

After extraction, the backend chunks normalized product evidence into retrievable citation units stored in `evidence_chunks`. Each chunk covers one logical field (summary, bullet, description, spec, warranty, review snippet, quality warnings). Embeddings use OpenAI `text-embedding-3-small` (1536 dims) when `OPENAI_API_KEY` is set. Without a key, chunks are stored with `embedding_status: "missing_provider"` and search falls back to text matching. The `/gtm-workbench` UI shows chunks, embedding status, and a search box.
