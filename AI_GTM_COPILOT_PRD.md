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

Persistence:

- `products`
- `runs`
- `run_events`
- `extraction_runs`

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
