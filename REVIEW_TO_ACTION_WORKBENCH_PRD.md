# PRD: Review-to-Action Workbench

## 1. Product Summary

Review-to-Action Workbench is a GenAI workflow prototype for Opptra category and merchandising teams.

It turns messy marketplace review exports or live Amazon product URLs into structured issue intelligence, action drafts, and engineering handoff specs.

This is not a dashboard-first product. It is a rapid workflow prototype for the GenAI Product Builder role: observe messy operations, add AI leverage, prove value with real data, and hand engineering a clear production spec.

## 2. Target Role Fit

The target role is GenAI Product Builder: part product manager, part embedded AI consultant, part rapid prototyper.

This prototype should prove the candidate can:

- Work with messy Excel/CSV-style business data.
- Build simple API and GenAI integrations.
- Convert unstructured operational work into a repeatable process.
- Keep humans in approval for brand-sensitive actions.
- Produce clear specs for engineering productionization.

## 3. Target User

Primary user: Opptra category or merchandising operator managing a brand/SKU across marketplaces.

Secondary users:

- Support lead reviewing customer response drafts.
- Content/marketplace ops lead improving listings.
- Supplier or sourcing manager receiving escalation evidence.
- Engineering team receiving production handoff.

## 4. Problem

Today, a category manager may need to:

- Export reviews from marketplaces.
- Paste data into Excel or Google Sheets.
- Manually scan review text.
- Summarize issues in Slack.
- Draft customer replies.
- Escalate quality issues to suppliers.
- Ask engineering later to productionize the workflow.

This is slow, inconsistent, and hard to audit.

## 5. Product Goal

Build a working prototype that shows a 10x better workflow:

```text
Upload review CSV or paste Amazon URL
-> normalize messy review data
-> run AI issue analysis
-> generate action drafts
-> produce engineering handoff
-> human approves next steps
```

## 6. MVP Scope

### Slice 1: CSV Workbench

Build first.

Capabilities:

- New `/workbench` page.
- CSV upload.
- Flexible column alias mapping.
- Validation preview.
- Review normalization.
- AI-style analysis using deterministic or sample provider.
- Action drafts.
- Engineering handoff output.

### Slice 2: Live Amazon Adapter

Build after Slice 1.

Capabilities:

- Amazon URL or ASIN input.
- ASIN parser.
- SerpApi adapter for Amazon reviews.
- Captured sample mode if keys missing.
- Cache live runs for rehearsal.

### Slice 3: Hosted AI Provider

Build after Slice 2.

Capabilities:

- AI provider abstraction.
- NVIDIA GLM-5.1 provider.
- Strict structured JSON response.
- Sample provider fallback.
- Visible model/provider badge.

### Slice 4: Docs and Demo Script

Build last.

Capabilities:

- README repositioned for GenAI Product Builder.
- Setup and env var docs.
- Five-minute demo script.
- Engineering handoff explanation.

## 7. Non-Goals

- Do not build browser scraping first.
- Do not build full marketplace publishing.
- Do not auto-send customer replies.
- Do not auto-email suppliers.
- Do not implement auth or role permissions.
- Do not build complex data warehouse infrastructure.
- Do not replace the existing seeded dashboard immediately.

## 8. Inputs

### CSV Upload

Minimum accepted fields:

```csv
marketplace,market,product_name,sku,rating,title,review,date,language
```

Supported aliases:

- Marketplace: `marketplace`, `platform`, `source`
- Market: `market`, `country`, `region`
- Product: `product`, `product_name`, `item_name`, `title`
- SKU: `sku`, `asin`, `product_id`
- Rating: `rating`, `stars`, `score`
- Review text: `review`, `review_text`, `body`, `comment`
- Date: `date`, `review_date`, `created_at`
- Language: `language`, `lang`

### Amazon URL or ASIN

Supported later:

- Raw ASIN.
- Amazon product URL containing `/dp/<ASIN>`.
- Amazon product URL containing `/gp/product/<ASIN>`.

## 9. Outputs

### Operator View

- Total rows processed.
- Rows accepted and rejected.
- Product/SKU breakdown.
- Rating distribution.
- Sentiment split.
- Top issue themes.
- Representative evidence.
- Recommended next actions.

### AI Work Products

- Customer response drafts.
- Supplier escalation note.
- Listing/content improvement recommendations.
- Weekly Slack update summary.
- Category manager action brief.

### Engineering Handoff

- Input schema observed.
- Normalized schema.
- Business rules used.
- Human approval checkpoints.
- Edge cases found.
- Productionization requirements.
- Suggested integrations and API boundaries.

## 10. AI Provider Plan

Slice 1 may use deterministic/sample AI behavior so the CSV workflow can be built quickly.

Slice 3 adds a provider abstraction:

```ts
interface AiAnalysisProvider {
  analyzeReviews(input: {
    product: LiveProduct;
    reviews: NormalizedReview[];
    brandPolicy: BrandPolicy;
  }): Promise<LiveAnalysisResult>;
}
```

Provider order:

1. `SampleAnalysisProvider`
2. `NvidiaGlmProvider`
3. Future: `GeminiProvider`

Recommended env vars:

```bash
SERPAPI_API_KEY=...
NVIDIA_API_KEY=...
NVIDIA_MODEL=z-ai/glm-5.1
```

## 11. Live Data Plan

Use free-first options:

- Amazon: SerpApi free tier where available.
- Flipkart/Noon: Apify free credits later, adapter-ready only.
- AI: NVIDIA GLM-5.1 hosted API or sample provider fallback.

The UI must label run mode:

- `Live API run`
- `Captured sample`
- `Seeded fallback`
- `CSV workflow mode`

## 12. Human Approval Model

AI can:

- Normalize rows.
- Analyze themes.
- Draft replies.
- Draft supplier escalation notes.
- Draft Slack summaries.
- Draft engineering handoff.

Human must approve:

- Public review replies.
- Refunds or replacements.
- Supplier emails.
- Listing changes.
- Production workflow deployment.

## 13. Success Criteria

The pivot succeeds if a hiring manager can see:

- The prototype accepts messy review data.
- The workflow produces useful business outputs.
- The outputs are editable and approval-based.
- The prototype can work with live data later.
- The candidate understands API constraints and production handoff.
- The workflow maps directly to the GenAI Product Builder role.

## 14. Five-Minute Demo Path

1. Open `/workbench`.
2. Upload a messy marketplace review CSV.
3. Show column mapping and validation.
4. Run analysis.
5. Show issue themes and evidence.
6. Show customer reply drafts.
7. Show supplier escalation and Slack update.
8. Show Engineering Handoff.
9. Explain live Amazon and NVIDIA GLM provider as next slices.

