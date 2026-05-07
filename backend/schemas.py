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
