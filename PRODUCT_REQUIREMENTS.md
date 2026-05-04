# Demo Prototype PRD: Opptra Brand Health Agent

## 1. Product Summary

Opptra Brand Health Agent is an AI category-management workflow that detects emerging product issues from multilingual marketplace reviews and turns them into brand-safe customer responses, supplier escalations, and weekly action briefs.

This PRD defines a demo prototype with production-shaped architecture, not a production MVP. The prototype is designed as a hiring-team demo for Opptra. It is not a generic sentiment dashboard. It demonstrates how an AI-native GTM partner could help a category manager protect brand equity, reduce warranty exposure, and improve marketplace execution across Asian markets.

## 2. Target User

Primary user: Opptra category manager responsible for one brand across multiple Asian marketplaces.

The category manager needs to understand product health, marketplace perception, emerging quality issues, response coverage, warranty risk, and the operational actions required across support, listings, suppliers, and inventory.

## 3. Demo Scenario

Default demo brand: Tower cookware.

Default demo SKU: Tower 24cm pan.

Core story:

Handle breakage complaints on the Tower 24cm pan increased from 2% last month to 12% this week, concentrated on Noon UAE and Amazon India. The agent detects the spike, shows multilingual evidence from English, Hindi/Hinglish, and Arabic reviews, drafts customer replies in the reviewer's language, and generates a weekly action brief for category, support, marketplace, and supplier teams.

## 4. Product Positioning

One-line pitch:

An AI category-management workflow that detects emerging product issues from multilingual marketplace reviews and turns them into brand-safe customer responses, supplier escalations, and weekly action briefs.

Interview framing:

Based on Opptra's public positioning around AI-native GTM, marketplace execution, customer sentiment, and proactive warranty management, this prototype is a thin slice of a workflow a category manager might need. Seeded data is used where marketplace access would be brittle, while the ingestion and AI layers are designed so real data sources can be swapped in.

## 5. Goals

- Help a category manager spot emerging product-quality issues before they damage ratings, returns, warranty costs, and sell-through.
- Convert fragmented marketplace feedback into evidence-backed operational actions.
- Draft brand-safe, localized responses to negative reviews while keeping humans in approval.
- Demonstrate an extensible AI workflow architecture with pluggable data ingestion and evaluation checks.
- Make the full value obvious in a five-minute demo.

## 6. Non-Goals

- Build production marketplace scraping as the primary path.
- Publish public review responses automatically.
- Implement full authentication, teams, or permissions.
- Integrate with ERP, WMS, CRM, warranty, or marketplace APIs.
- Build a general-purpose chatbot.
- Build dozens of charts or a generic BI dashboard.
- Implement real-time streaming.
- Support many brands and categories in the first demo.

## 7. Production Readiness Boundary

The prototype should feel credible as the first slice of a production workflow, but it does not need production operations.

Production-shaped in scope:

- Pluggable ingestion interface
- Normalized review schema
- Clear analysis pipeline
- Documented scoring formulas
- Brand policy guardrails
- Human approval workflow
- Evaluation checks for generated responses
- README notes for production extensions

Explicitly out of scope for prototype:

- Production data contracts
- Marketplace publishing permissions
- Authentication and role-based access control
- Background job orchestration
- Observability dashboards
- Audit-grade compliance logging
- Vendor SLAs
- Automated refunds, warranty approvals, or supplier emails

## 8. MVP Scope

The MVP includes four screens:

1. Brand Health
   - Brand Risk Score
   - Rating trend
   - Negative review rate
   - Top emerging issue
   - Market and marketplace breakdown
   - Estimated GMV and warranty exposure

2. Issue Trends
   - Clustered complaint themes
   - Spike detection against a baseline period
   - Representative multilingual reviews
   - Affected SKUs and marketplaces
   - Confidence and evidence panel

3. Response Queue
   - Negative reviews requiring attention
   - AI-drafted response in the customer's language
   - Brand-tone checklist
   - Approve, edit, and reject states
   - Human approval requirement before any public action

4. Weekly Brief
   - Executive/category-manager summary
   - Top risks
   - Recommended actions by function
   - Supplier escalation draft
   - Marketplace listing recommendation
   - Support and warranty recommendation

## 9. Five-Minute Demo Path

1. Open Brand Health for Tower cookware.
2. Show that handle breakage is the top high-risk issue.
3. Open Issue Trends and show the spike from 2% to 12%.
4. Show multilingual evidence from English, Hindi/Hinglish, and Arabic reviews.
5. Open Response Queue and review three AI-drafted replies.
6. Point out the brand-tone and policy checklist.
7. Open Weekly Brief and show recommended category, support, marketplace, and supplier actions.
8. Briefly show the README architecture and eval checks.

## 10. Core Requirements

### 9.1 Review Ingestion

The system must support seeded marketplace reviews through a pluggable ingestion interface.

Required marketplaces for demo:

- Amazon India
- Flipkart India
- Noon UAE
- Noon KSA

Optional future marketplaces:

- Lazada
- Shopee
- Namshi

The ingestion layer must normalize reviews into a common schema.

### 9.2 Multilingual Review Normalization

The system must store the original review language and support analysis across:

- English
- Hindi/Hinglish
- Arabic
- Bahasa Indonesia as a future-ready Southeast Asian language option

For the MVP, seeded reviews may include precomputed language labels and normalized English summaries. The code should keep a clear translation/normalization interface for production use.

### 9.3 Sentiment and Theme Analysis

The system must classify each review by sentiment:

- Positive
- Neutral
- Negative

The system must group negative or mixed reviews into complaint themes such as:

- Handle breakage
- Coating peeling
- Late delivery
- Wrong item received
- Packaging damage
- Size or expectation mismatch
- Warranty or support friction

Theme clustering may use embeddings when API access is available and a deterministic keyword fallback for local demo reliability.

### 9.4 Emerging Issue Detection

The system must compare the current period against a baseline period.

Required fields:

- Current theme share
- Baseline theme share
- Absolute delta
- Relative change
- Number of affected reviews
- Affected marketplaces
- Affected languages
- Confidence score

The Tower 24cm pan demo must show:

- Handle breakage baseline share: 2%
- Handle breakage current share: 12%
- Concentration: Noon UAE and Amazon India

### 9.5 Brand Risk Score

The system must expose a Brand Risk Score from 0 to 100.

The score should be explainable and based on:

- Negative review rate
- Rating trend
- Issue spike severity
- Review volume
- Marketplace concentration
- Estimated affected order volume
- Warranty or refund-intent mentions

The score does not need to be statistically perfect in the MVP, but the formula must be documented and deterministic.

### 9.6 Response Drafting Agent

The agent must draft responses to negative reviews in the customer's language.

Drafts must follow brand configuration:

- Brand voice
- Forbidden phrases
- Warranty policy
- Support escalation path
- Marketplace character limit
- Approved example responses
- Locale-specific tone guidance

Drafts must not be published automatically.

### 9.7 Response Quality Checklist

Every draft response must include a visible quality checklist:

- Same language as customer
- Mentions the exact issue
- Uses empathetic tone
- Avoids prohibited claims
- Includes support path
- Stays within character limit
- Avoids over-admitting legal or product fault

### 9.8 Weekly Brief Generation

The Weekly Brief must summarize:

- Overall brand health
- Top emerging product issues
- Marketplaces most affected
- Representative evidence
- Estimated commercial exposure
- Recommended support actions
- Recommended marketplace listing actions
- Recommended supplier or quality actions
- Draft supplier escalation brief

## 11. Human Approval Model

The agent may autonomously:

- Ingest and normalize reviews
- Detect sentiment and themes
- Detect emerging issue spikes
- Generate weekly summaries
- Draft review responses
- Draft supplier/category escalation briefs
- Recommend actions

Human approval is required for:

- Publishing public review responses
- Issuing refunds, replacements, or warranty approvals
- Sending supplier escalation emails
- Changing listing copy, pricing, claims, or product detail pages

## 12. Data Model

### Brand

- id
- name
- category
- brand_voice
- forbidden_phrases
- warranty_policy
- support_policy
- locale_rules
- approved_response_examples

### Product

- id
- brand_id
- sku
- name
- category
- launch_date
- market
- marketplace_ids
- estimated_recent_orders
- estimated_gmv

### Review

- id
- product_id
- marketplace
- market
- language
- rating
- title
- body
- date
- verified_purchase
- helpful_count
- normalized_summary
- sentiment
- theme_ids

### Theme

- id
- label
- description
- severity
- keyword_signature
- centroid_id optional

### IssueTrend

- id
- product_id
- theme_id
- current_period
- baseline_period
- current_share
- baseline_share
- delta
- affected_review_ids
- confidence
- estimated_order_exposure
- estimated_gmv_exposure

### DraftResponse

- id
- review_id
- language
- generated_text
- checklist_results
- status
- edited_text optional
- approved_by optional
- approved_at optional

### WeeklyBrief

- id
- brand_id
- period
- executive_summary
- top_risks
- recommended_actions
- supplier_escalation_draft
- generated_at

## 13. Technical Architecture

Recommended MVP stack:

- Next.js
- TypeScript
- Tailwind or CSS modules
- JSON fixtures or SQLite
- OpenAI API optional for generation and embeddings
- Deterministic local fallback for analysis and response drafting
- Markdown export for weekly brief

Pipeline:

Seeded marketplace reviews -> normalized reviews -> language/sentiment/theme analysis -> issue trend detection -> brand risk scoring -> response drafting -> weekly brief generation -> dashboard.

Production extension points:

- Marketplace APIs or compliant ingestion partners
- Data warehouse or lakehouse
- Vector database
- Translation provider
- LLM provider abstraction
- Review-response publishing workflow
- Warranty and claims integration
- Supplier ticketing integration

## 14. AI and Evaluation Requirements

The MVP must make AI confidence and evidence visible.

Required evidence fields:

- Number of reviews in cluster
- Representative reviews
- Marketplaces included
- Languages included
- Baseline period
- Current period
- Spike threshold
- Last human validation status

Response eval checks:

- Language match
- Tone match
- Policy compliance
- Forbidden phrase absence
- Character limit
- Support path presence
- Issue specificity

Known limitations must be documented:

- Seeded data is not representative of real marketplace volume.
- Translation quality is simulated or provider-dependent.
- Brand Risk Score is a transparent heuristic for demo purposes.
- Marketplace publication is intentionally outside MVP scope.

## 15. UI Principles

The interface should feel like an internal operations tool for category managers.

Design direction:

- Dense but readable
- Clear operational hierarchy
- Minimal decorative elements
- Fast scan of risk, evidence, and action
- No marketing-style landing page
- No generic sentiment word clouds
- Use tables, status chips, compact charts, and action panels

The first screen should immediately show the Tower handle-breakage risk without requiring setup.

## 16. Success Criteria

The prototype is successful if:

- A viewer understands the value in under one minute.
- The five-minute demo path works without caveats.
- The issue spike is obvious and evidence-backed.
- Draft responses look plausible, localized, and brand-safe.
- The Weekly Brief produces actionable category-manager recommendations.
- The README explains the production architecture honestly.
- The code has clear seams for ingestion, analysis, generation, and evaluation.

## 17. Implementation Milestones

### Milestone 1: Data and Pipeline

- Create seeded reviews for Tower cookware across Amazon India, Flipkart, Noon UAE, and Noon KSA.
- Define normalized data schema.
- Implement theme and sentiment analysis with deterministic fallback.
- Implement spike detection and Brand Risk Score.

### Milestone 2: Core Dashboard

- Build Brand Health screen.
- Build Issue Trends screen.
- Add representative review evidence.
- Add market and marketplace breakdowns.

### Milestone 3: Agent Workflow

- Add brand tone configuration.
- Generate localized draft responses.
- Add response quality checklist.
- Add approve, edit, and reject states.

### Milestone 4: Weekly Brief and Polish

- Generate Weekly Brief.
- Add supplier escalation draft.
- Add README with architecture, assumptions, and evals.
- Polish the five-minute demo path.

## 18. Open Questions

- Should the demo include live API generation, or should all AI outputs be precomputed for reliability?
- Should the first version use SQLite or static JSON fixtures?
- Should Bahasa Indonesia reviews be included in the default story or reserved as a visible extension?
- Should the Weekly Brief export to Markdown only, or also PDF?
- Should response approval state persist locally?

## 19. Recommended Defaults

- Use static JSON fixtures for demo reliability.
- Precompute enough AI outputs that the demo works without API keys.
- Keep OpenAI-powered generation as an optional enhancement.
- Include Bahasa Indonesia in the architecture and sample data, but keep the main issue story focused on English, Hindi/Hinglish, and Arabic.
- Export Weekly Brief as Markdown first.
- Persist response approval state in local storage for the prototype.
