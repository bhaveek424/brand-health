-- GTM risk analyses: persisted structured analysis of evidence chunks for a run.

CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    provider TEXT NOT NULL DEFAULT 'unknown',
    model TEXT,
    health_score INTEGER,
    top_risks JSONB DEFAULT '[]',
    issue_themes JSONB DEFAULT '[]',
    listing_quality JSONB DEFAULT '{}',
    recommended_actions JSONB DEFAULT '[]',
    citations JSONB DEFAULT '[]',
    raw_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_run_id ON analyses(run_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
