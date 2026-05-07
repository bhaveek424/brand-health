import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base

try:
    from pgvector.sqlalchemy import Vector as _Vector  # type: ignore[import]
    _PGVECTOR_AVAILABLE = True
except ImportError:
    _Vector = None
    _PGVECTOR_AVAILABLE = False


def now_utc():
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class Run(Base):
    __tablename__ = "runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    input_url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="created")
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class RunEvent(Base):
    __tablename__ = "run_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String, nullable=False)
    payload = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=now_utc, index=True)


class ExtractionRun(Base):
    __tablename__ = "extraction_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source = Column(String, nullable=False, default="scrapegraphai-oss")
    status = Column(String, nullable=False, default="pending")
    input_url = Column(String, nullable=False)
    raw_response = Column(JSONB, default=dict)
    product_title = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    price = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    rating = Column(String, nullable=True)
    review_count = Column(String, nullable=True)
    availability = Column(String, nullable=True)
    seller = Column(String, nullable=True)
    images = Column(JSONB, default=list)
    bullets = Column(JSONB, default=list)
    description = Column(String, nullable=True)
    specifications = Column(JSONB, default=list)
    warranty_or_returns = Column(String, nullable=True)
    review_snippets = Column(JSONB, default=list)
    summary = Column(String, nullable=True)
    extraction_quality = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class EvidenceChunk(Base):
    """
    A retrievable, citation-ready text unit derived from an ExtractionRun.
    Embedding dimension: 1536 (OpenAI text-embedding-3-small).
    embedding_status: "live" | "missing_provider" | "failed"
    """

    __tablename__ = "evidence_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    extraction_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("extraction_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_type = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    content = Column(String, nullable=False)
    chunk_metadata = Column("metadata", JSONB, default=dict)
    embedding = Column(_Vector(1536) if _PGVECTOR_AVAILABLE else JSONB, nullable=True)
    embedding_status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), default=now_utc)


class ActionAuditLog(Base):
    """Immutable audit record for each action draft status transition."""

    __tablename__ = "action_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_id = Column(
        UUID(as_uuid=True),
        ForeignKey("action_drafts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String, nullable=False)
    from_status = Column(String, nullable=False)
    to_status = Column(String, nullable=False)
    target_system = Column(String, nullable=False)
    payload = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=now_utc)


class ActionDraft(Base):
    """Approval-mode action draft generated from a GTM risk analysis. Never sent automatically."""

    __tablename__ = "action_drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analyses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    draft_type = Column(String, nullable=False)
    target_system = Column(String, nullable=False)
    status = Column(String, nullable=False, default="draft")
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    payload = Column(JSONB, default=dict)
    evidence_ids = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class Analysis(Base):
    """Persisted GTM risk analysis derived from evidence chunks for a run."""

    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String, nullable=False, default="pending")
    provider = Column(String, nullable=False, default="unknown")
    model = Column(String, nullable=True)
    health_score = Column(Integer, nullable=True)
    top_risks = Column(JSONB, default=list)
    issue_themes = Column(JSONB, default=list)
    listing_quality = Column(JSONB, default=dict)
    recommended_actions = Column(JSONB, default=list)
    citations = Column(JSONB, default=list)
    raw_response = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
