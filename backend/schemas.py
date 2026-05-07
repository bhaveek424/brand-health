from pydantic import BaseModel, Field
from typing import Optional, List, Any, Literal
from datetime import datetime
from uuid import UUID


class RunEventResponse(BaseModel):
    id: UUID
    run_id: UUID
    event_type: str
    payload: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class RunResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID] = None
    input_url: str
    status: str
    created_at: datetime
    updated_at: datetime
    events: List[RunEventResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class CreateRunRequest(BaseModel):
    url: str = Field(..., min_length=1, description="Product URL or ASIN")


class ExtractionQuality(BaseModel):
    confidence: float = Field(default=0.0)
    missing_fields: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class ExtractionRunResponse(BaseModel):
    id: UUID
    run_id: UUID
    source: str
    status: str
    input_url: str
    product_title: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[str] = None
    currency: Optional[str] = None
    rating: Optional[str] = None
    review_count: Optional[str] = None
    availability: Optional[str] = None
    seller: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    bullets: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    specifications: List[dict] = Field(default_factory=list)
    warranty_or_returns: Optional[str] = None
    review_snippets: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    extraction_quality: ExtractionQuality = Field(default_factory=ExtractionQuality)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvidenceChunkResponse(BaseModel):
    id: UUID
    run_id: UUID
    product_id: Optional[UUID] = None
    extraction_run_id: Optional[UUID] = None
    source_type: str
    source_url: str
    content: str
    metadata: dict = Field(default_factory=dict)
    embedding_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EvidenceSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query text")
    limit: int = Field(default=10, ge=1, le=50)


class EvidenceSearchResult(BaseModel):
    id: UUID
    run_id: UUID
    source_type: str
    source_url: str
    content: str
    metadata: dict = Field(default_factory=dict)
    embedding_status: str
    score: Optional[float] = None
    search_mode: Literal["vector", "text"]


class EvidenceSearchResponse(BaseModel):
    query: str
    search_mode: Literal["vector", "text"]
    results: List[EvidenceSearchResult] = Field(default_factory=list)


# --- Analysis schemas ---

class RiskItem(BaseModel):
    title: str
    severity: Literal["high", "medium", "low"]
    description: str
    cited_chunk_ids: List[str] = Field(default_factory=list)


class IssueTheme(BaseModel):
    theme: str
    frequency: Literal["high", "medium", "low"]
    description: str
    cited_chunk_ids: List[str] = Field(default_factory=list)


class ListingFinding(BaseModel):
    field: str
    status: Literal["pass", "warning", "fail"]
    note: str
    cited_chunk_ids: List[str] = Field(default_factory=list)


class ListingQuality(BaseModel):
    score: int = 0
    findings: List[ListingFinding] = Field(default_factory=list)


class RecommendedAction(BaseModel):
    action: str
    priority: Literal["high", "medium", "low"]
    description: str
    cited_chunk_ids: List[str] = Field(default_factory=list)


class AnalysisCitation(BaseModel):
    chunk_id: str
    source_type: str
    excerpt: str


class AnalysisResponse(BaseModel):
    id: UUID
    run_id: UUID
    status: str
    provider: str
    analysis_model: Optional[str] = None
    health_score: Optional[int] = None
    top_risks: List[RiskItem] = Field(default_factory=list)
    issue_themes: List[IssueTheme] = Field(default_factory=list)
    listing_quality: ListingQuality = Field(default_factory=ListingQuality)
    recommended_actions: List[RecommendedAction] = Field(default_factory=list)
    citations: List[AnalysisCitation] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --- Action draft schemas ---

class ActionDraftResponse(BaseModel):
    id: UUID
    run_id: UUID
    analysis_id: Optional[UUID] = None
    draft_type: str
    target_system: str
    status: str
    title: str
    body: str
    payload: dict = Field(default_factory=dict)
    evidence_ids: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ActionAuditLogResponse(BaseModel):
    id: UUID
    action_id: UUID
    run_id: UUID
    event_type: str
    from_status: str
    to_status: str
    target_system: str
    payload: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class SimulatedSendPreview(BaseModel):
    target_system: str
    payload: dict = Field(default_factory=dict)
    message: str = "Simulated only. No external message was sent."


class ActionTransitionResponse(BaseModel):
    action: ActionDraftResponse
    audit: ActionAuditLogResponse
    simulated_send: Optional[SimulatedSendPreview] = None
