import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base


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
