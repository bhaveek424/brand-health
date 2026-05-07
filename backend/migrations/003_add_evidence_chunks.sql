-- Evidence chunks: retrievable, citation-ready units from extracted product evidence.
-- Embedding dimension: 1536 (OpenAI text-embedding-3-small default output dims).
-- Requires pgvector extension (already enabled in 001_initial_schema.sql).

CREATE TABLE IF NOT EXISTS evidence_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    extraction_run_id UUID REFERENCES extraction_runs(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    embedding_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_chunks_run_id ON evidence_chunks(run_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_extraction_run_id ON evidence_chunks(extraction_run_id);
