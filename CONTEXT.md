# Context

## Terms

### AI GTM Copilot

The product-grade command center for marketplace GTM operations. It accepts a product URL, creates a persisted run, extracts live product evidence, analyzes GTM risk, supports evidence-grounded copilot questions, and prepares approval-mode handoffs.

### Product Evidence Extraction

The act of collecting structured product-page facts from a marketplace or brand URL: title, brand, price, rating, review count, availability, seller, images, bullets, description, specifications, warranty/returns, visible review snippets, summary, and extraction quality.

### ScrapeGraphAI OSS

The open-source `scrapegraphai` Python library run inside our FastAPI backend with our own browser and LLM configuration. This is different from ScrapeGraphAI Cloud/API. The project should not require `SCRAPEGRAPHAI_API_KEY` for milestone 1 extraction.

### Workflow Event

A persisted backend event attached to a run, such as `url_received`, `extraction_started`, `extraction_completed`, or `extraction_failed`. The frontend timeline renders these events as source-of-truth workflow state.

### Approval-Mode Connector

A simulated execution path for generated actions. The user can approve or simulate sending an email, Slack update, ticket, or marketplace reply without connecting real external systems yet.

## Decisions

- Use the open-source ScrapeGraphAI Python library locally for issue 014. Do not call ScrapeGraphAI Cloud/API.
- FastAPI owns extraction, persistence, workflow events, and future action connector APIs.
- Next.js owns the polished operator UI and Tambo copilot surface.
- Supabase/Postgres with pgvector is the persistence and retrieval substrate.
- Live extraction requires Playwright and an LLM provider or local model.
