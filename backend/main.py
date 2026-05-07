from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import uuid
from typing import Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, AsyncSessionLocal, DATABASE_URL
from models import Base, Product, Run, RunEvent, ExtractionRun
from schemas import (
    CreateRunRequest,
    RunResponse,
    RunEventResponse,
    ExtractionRunResponse,
    ExtractionQuality,
)
from services.scrapegraph import ScrapeGraphService


def now_utc():
    return datetime.now(timezone.utc)


db_ready = False


async def init_db():
    global db_ready
    if engine is None:
        db_ready = False
        return
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        db_ready = True
    except Exception:
        db_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    if engine:
        await engine.dispose()


app = FastAPI(
    title="AI GTM Copilot API",
    description="Backend for the AI GTM Copilot workbench.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow CORS from the Next.js frontend (local dev + deployed preview)
origins = []
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_db():
    if AsyncSessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Set DATABASE_URL to enable persistence.",
        )
    async with AsyncSessionLocal() as session:
        yield session


@app.get("/health")
def health() -> dict:
    database_configured = DATABASE_URL is not None and len(DATABASE_URL) > 0
    is_healthy = database_configured and db_ready
    return {
        "status": "healthy" if is_healthy else "degraded",
        "version": "0.1.0",
        "service": "ai-gtm-copilot",
        "database_configured": database_configured,
        "database_ready": db_ready,
    }


def validate_url(url: str) -> str:
    stripped = url.strip()
    if not stripped:
        raise HTTPException(status_code=422, detail="URL or ASIN is required.")

    # Accept 10-character ASIN identifiers
    if re.match(r"^[A-Z0-9]{10}$", stripped, re.IGNORECASE):
        return stripped

    # Accept valid http(s) URLs
    if stripped.startswith(("http://", "https://")):
        parsed = urlparse(stripped)
        if parsed.scheme and parsed.netloc:
            return stripped

    raise HTTPException(
        status_code=422,
        detail="Invalid URL or ASIN. Provide a valid http(s) URL or a 10-character ASIN.",
    )


@app.post("/runs", response_model=RunResponse)
async def create_run(body: CreateRunRequest, db: AsyncSession = Depends(get_db)) -> RunResponse:
    url = validate_url(body.url)

    # Create placeholder product
    product = Product(url=url, name=None)
    db.add(product)
    await db.flush()

    # Create run
    run = Run(
        product_id=product.id,
        input_url=url,
        status="created",
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(run)
    await db.flush()

    # Create initial event
    event = RunEvent(
        run_id=run.id,
        event_type="url_received",
        payload={"url": url},
        created_at=now_utc(),
    )
    db.add(event)
    await db.commit()

    return RunResponse(
        id=run.id,
        product_id=run.product_id,
        input_url=run.input_url,
        status=run.status,
        created_at=run.created_at,
        updated_at=run.updated_at,
        events=[
            RunEventResponse(
                id=event.id,
                run_id=event.run_id,
                event_type=event.event_type,
                payload=event.payload,
                created_at=event.created_at,
            )
        ],
    )


@app.get("/runs/{run_id}", response_model=RunResponse)
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)) -> RunResponse:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(
        select(Run).where(Run.id == run_uuid)
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    events_result = await db.execute(
        select(RunEvent).where(RunEvent.run_id == run_uuid).order_by(RunEvent.created_at.asc())
    )
    events = events_result.scalars().all()

    return RunResponse(
        id=run.id,
        product_id=run.product_id,
        input_url=run.input_url,
        status=run.status,
        created_at=run.created_at,
        updated_at=run.updated_at,
        events=[
            RunEventResponse(
                id=e.id,
                run_id=e.run_id,
                event_type=e.event_type,
                payload=e.payload,
                created_at=e.created_at,
            )
            for e in events
        ],
    )


@app.post("/runs/{run_id}/extract", response_model=ExtractionRunResponse)
async def extract_evidence(run_id: str, db: AsyncSession = Depends(get_db)) -> ExtractionRunResponse:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(select(Run).where(Run.id == run_uuid))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    # Emit extraction_started event
    started_event = RunEvent(
        run_id=run.id,
        event_type="extraction_started",
        payload={"source": "scrapegraphai-oss"},
        created_at=now_utc(),
    )
    db.add(started_event)
    await db.commit()

    service = ScrapeGraphService()
    extraction = await service.extract(run.input_url)

    # Persist raw + normalized regardless of success/failure
    raw_response = extraction.get("raw_response", {})
    normalized = extraction.get("normalized", {})

    extraction_run = ExtractionRun(
        run_id=run.id,
        source="scrapegraphai-oss",
        status="completed" if extraction.get("success") else "failed",
        input_url=run.input_url,
        raw_response=raw_response,
        product_title=normalized.get("product_title"),
        brand=normalized.get("brand"),
        price=normalized.get("price"),
        currency=normalized.get("currency"),
        rating=normalized.get("rating"),
        review_count=normalized.get("review_count"),
        availability=normalized.get("availability"),
        seller=normalized.get("seller"),
        images=normalized.get("images", []),
        bullets=normalized.get("bullets", []),
        description=normalized.get("description"),
        specifications=normalized.get("specifications", []),
        warranty_or_returns=normalized.get("warranty_or_returns"),
        review_snippets=normalized.get("review_snippets", []),
        summary=normalized.get("summary"),
        extraction_quality=normalized.get("extraction_quality", {}),
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(extraction_run)

    if extraction.get("success"):
        completed_event = RunEvent(
            run_id=run.id,
            event_type="extraction_completed",
            payload={
                "extraction_run_id": str(extraction_run.id),
                "source": "scrapegraphai-oss",
            },
            created_at=now_utc(),
        )
        db.add(completed_event)
        await db.commit()
    else:
        failed_event = RunEvent(
            run_id=run.id,
            event_type="extraction_failed",
            payload={
                "error": extraction.get("error", "Unknown error"),
                "source": "scrapegraphai-oss",
            },
            created_at=now_utc(),
        )
        db.add(failed_event)
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail=extraction.get("error", "Extraction failed."),
        )

    quality = normalized.get("extraction_quality", {})
    return ExtractionRunResponse(
        id=extraction_run.id,
        run_id=extraction_run.run_id,
        source=extraction_run.source,
        status=extraction_run.status,
        input_url=extraction_run.input_url,
        product_title=extraction_run.product_title,
        brand=extraction_run.brand,
        price=extraction_run.price,
        currency=extraction_run.currency,
        rating=extraction_run.rating,
        review_count=extraction_run.review_count,
        availability=extraction_run.availability,
        seller=extraction_run.seller,
        images=extraction_run.images or [],
        bullets=extraction_run.bullets or [],
        description=extraction_run.description,
        specifications=extraction_run.specifications or [],
        warranty_or_returns=extraction_run.warranty_or_returns,
        review_snippets=extraction_run.review_snippets or [],
        summary=extraction_run.summary,
        extraction_quality=ExtractionQuality(
            confidence=quality.get("confidence", 0.0),
            missing_fields=quality.get("missing_fields", []),
            warnings=quality.get("warnings", []),
        ),
        created_at=extraction_run.created_at,
        updated_at=extraction_run.updated_at,
    )


@app.get("/runs/{run_id}/evidence", response_model=Optional[ExtractionRunResponse])
async def get_evidence(run_id: str, db: AsyncSession = Depends(get_db)) -> Optional[ExtractionRunResponse]:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(
        select(ExtractionRun).where(ExtractionRun.run_id == run_uuid).order_by(ExtractionRun.created_at.desc())
    )
    ex = result.scalar_one_or_none()
    if ex is None:
        return None

    quality = ex.extraction_quality or {}
    return ExtractionRunResponse(
        id=ex.id,
        run_id=ex.run_id,
        source=ex.source,
        status=ex.status,
        input_url=ex.input_url,
        product_title=ex.product_title,
        brand=ex.brand,
        price=ex.price,
        currency=ex.currency,
        rating=ex.rating,
        review_count=ex.review_count,
        availability=ex.availability,
        seller=ex.seller,
        images=ex.images or [],
        bullets=ex.bullets or [],
        description=ex.description,
        specifications=ex.specifications or [],
        warranty_or_returns=ex.warranty_or_returns,
        review_snippets=ex.review_snippets or [],
        summary=ex.summary,
        extraction_quality=ExtractionQuality(
            confidence=quality.get("confidence", 0.0),
            missing_fields=quality.get("missing_fields", []),
            warnings=quality.get("warnings", []),
        ),
        created_at=ex.created_at,
        updated_at=ex.updated_at,
    )
