from pydantic import BaseModel, Field
from typing import Optional, List, Any
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
