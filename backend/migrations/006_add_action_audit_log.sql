-- Audit trail for action draft status transitions (approve, simulate-send).
-- Every status change produces one row. No external sends are recorded here.

CREATE TABLE IF NOT EXISTS action_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES action_drafts(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    target_system TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_audit_log_action_id ON action_audit_log(action_id);
CREATE INDEX IF NOT EXISTS idx_action_audit_log_run_id ON action_audit_log(run_id);
