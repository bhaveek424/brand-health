-- Extraction runs table: stores raw + normalized product evidence for a run
CREATE TABLE IF NOT EXISTS extraction_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'scrapegraphai',
    status TEXT NOT NULL DEFAULT 'pending',
    input_url TEXT NOT NULL,
    raw_response JSONB DEFAULT '{}',
    product_title TEXT,
    brand TEXT,
    price TEXT,
    currency TEXT,
    rating TEXT,
    review_count TEXT,
    availability TEXT,
    seller TEXT,
    images JSONB DEFAULT '[]',
    bullets JSONB DEFAULT '[]',
    description TEXT,
    specifications JSONB DEFAULT '[]',
    warranty_or_returns TEXT,
    review_snippets JSONB DEFAULT '[]',
    summary TEXT,
    extraction_quality JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_extraction_runs_run_id ON extraction_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_status ON extraction_runs(status);
