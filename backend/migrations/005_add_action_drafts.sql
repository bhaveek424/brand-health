-- Approval-mode action drafts generated from GTM risk analyses.
-- Drafts are never sent automatically; they require explicit user approval.

CREATE TABLE IF NOT EXISTS action_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    draft_type TEXT NOT NULL,
    target_system TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    evidence_ids JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_drafts_run_id ON action_drafts(run_id);
CREATE INDEX IF NOT EXISTS idx_action_drafts_analysis_id ON action_drafts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_action_drafts_status ON action_drafts(status);
