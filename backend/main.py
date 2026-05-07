from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import uuid
import logging
from typing import Optional, List
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, AsyncSessionLocal, DATABASE_URL
from models import Base, Product, Run, RunEvent, ExtractionRun, EvidenceChunk
from schemas import (
    CreateRunRequest,
    RunResponse,
    RunEventResponse,
    ExtractionRunResponse,
    ExtractionQuality,
    EvidenceChunkResponse,
    EvidenceSearchRequest,
    EvidenceSearchResponse,
    EvidenceSearchResult,
)
from services.scrapegraph import ScrapeGraphService
from services.chunking import build_chunks
from services.embeddings import generate_embeddings_batch, EMBEDDING_DIM

logger = logging.getLogger(__name__)


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


async def _chunk_and_embed(
    db: AsyncSession,
    run: Run,
    extraction_run: ExtractionRun,
) -> None:
    """Create evidence chunks and embed them. Emits workflow events. Never raises."""
    try:
        # evidence_chunking_started
        db.add(RunEvent(
            run_id=run.id,
            event_type="evidence_chunking_started",
            payload={"extraction_run_id": str(extraction_run.id)},
            created_at=now_utc(),
        ))
        await db.commit()

        chunk_dicts = build_chunks(extraction_run)
        source_url = extraction_run.input_url

        if not chunk_dicts:
            db.add(RunEvent(
                run_id=run.id,
                event_type="evidence_chunks_created",
                payload={"count": 0, "extraction_run_id": str(extraction_run.id)},
                created_at=now_utc(),
            ))
            await db.commit()
            return

        # evidence_chunks_created
        db.add(RunEvent(
            run_id=run.id,
            event_type="evidence_chunks_created",
            payload={"count": len(chunk_dicts), "extraction_run_id": str(extraction_run.id)},
            created_at=now_utc(),
        ))
        await db.commit()

        # Generate embeddings for all chunks
        db.add(RunEvent(
            run_id=run.id,
            event_type="embedding_started",
            payload={"chunk_count": len(chunk_dicts)},
            created_at=now_utc(),
        ))
        await db.commit()

        texts = [c["content"] for c in chunk_dicts]
        embedding_results = await generate_embeddings_batch(texts)

        # Determine overall embedding status
        statuses = [s for _, s in embedding_results]
        if all(s == "missing_provider" for s in statuses):
            embed_event = "embedding_skipped"
            embed_payload: dict = {"reason": "missing_provider", "chunk_count": len(chunk_dicts)}
        elif all(s == "failed" for s in statuses):
            embed_event = "embedding_failed"
            embed_payload = {"reason": "all_failed", "chunk_count": len(chunk_dicts)}
        else:
            live_count = sum(1 for s in statuses if s == "live")
            embed_event = "embedding_completed"
            embed_payload = {"live_count": live_count, "chunk_count": len(chunk_dicts)}

        # Persist chunks
        for chunk_dict, (vector, emb_status) in zip(chunk_dicts, embedding_results):
            chunk = EvidenceChunk(
                run_id=run.id,
                product_id=run.product_id,
                extraction_run_id=extraction_run.id,
                source_type=chunk_dict["source_type"],
                source_url=source_url,
                content=chunk_dict["content"],
                chunk_metadata=chunk_dict["metadata"],
                embedding=vector,
                embedding_status=emb_status,
                created_at=now_utc(),
            )
            db.add(chunk)

        db.add(RunEvent(
            run_id=run.id,
            event_type=embed_event,
            payload=embed_payload,
            created_at=now_utc(),
        ))
        await db.commit()

    except Exception as exc:
        logger.error("Chunking/embedding failed for run %s: %s", run.id, exc)
        try:
            db.add(RunEvent(
                run_id=run.id,
                event_type="embedding_failed",
                payload={"error": str(exc)},
                created_at=now_utc(),
            ))
            await db.commit()
        except Exception:
            pass


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

        # Chunk and embed (best-effort; does not fail the extraction response)
        await _chunk_and_embed(db, run, extraction_run)
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


@app.get("/runs/{run_id}/evidence/chunks", response_model=List[EvidenceChunkResponse])
async def get_evidence_chunks(
    run_id: str, db: AsyncSession = Depends(get_db)
) -> List[EvidenceChunkResponse]:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(
        select(EvidenceChunk)
        .where(EvidenceChunk.run_id == run_uuid)
        .order_by(EvidenceChunk.created_at.asc())
    )
    chunks = result.scalars().all()

    return [
        EvidenceChunkResponse(
            id=c.id,
            run_id=c.run_id,
            product_id=c.product_id,
            extraction_run_id=c.extraction_run_id,
            source_type=c.source_type,
            source_url=c.source_url,
            content=c.content,
            metadata=c.chunk_metadata or {},
            embedding_status=c.embedding_status,
            created_at=c.created_at,
        )
        for c in chunks
    ]


@app.post("/runs/{run_id}/evidence/search", response_model=EvidenceSearchResponse)
async def search_evidence(
    run_id: str,
    body: EvidenceSearchRequest,
    db: AsyncSession = Depends(get_db),
) -> EvidenceSearchResponse:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    query = body.query.strip()
    limit = body.limit

    # Check if any chunks for this run have live embeddings
    live_check = await db.execute(
        select(EvidenceChunk)
        .where(EvidenceChunk.run_id == run_uuid)
        .where(EvidenceChunk.embedding_status == "live")
        .limit(1)
    )
    has_live_embeddings = live_check.scalar_one_or_none() is not None

    if has_live_embeddings:
        # Vector similarity search via pgvector cosine distance
        from services.embeddings import generate_embedding
        from models import _PGVECTOR_AVAILABLE

        query_vec, q_status = await generate_embedding(query)
        if query_vec is not None and _PGVECTOR_AVAILABLE:
            try:
                distance_col = EvidenceChunk.embedding.cosine_distance(query_vec).label("distance")
                sim_result = await db.execute(
                    select(EvidenceChunk, distance_col)
                    .where(EvidenceChunk.run_id == run_uuid)
                    .where(EvidenceChunk.embedding_status == "live")
                    .order_by("distance")
                    .limit(limit)
                )
                rows = sim_result.all()
                return EvidenceSearchResponse(
                    query=query,
                    search_mode="vector",
                    results=[
                        EvidenceSearchResult(
                            id=c.id,
                            run_id=c.run_id,
                            source_type=c.source_type,
                            source_url=c.source_url,
                            content=c.content,
                            metadata=c.chunk_metadata or {},
                            embedding_status=c.embedding_status,
                            score=round(1.0 - float(dist), 4) if dist is not None else None,
                            search_mode="vector",
                        )
                        for c, dist in rows
                    ],
                )
            except Exception as exc:
                logger.warning("Vector search failed, falling back to text: %s", exc)

    # Text fallback: ILIKE on content
    ilike_pattern = f"%{query}%"
    text_result = await db.execute(
        select(EvidenceChunk)
        .where(EvidenceChunk.run_id == run_uuid)
        .where(EvidenceChunk.content.ilike(ilike_pattern))
        .order_by(EvidenceChunk.created_at.asc())
        .limit(limit)
    )
    chunks = text_result.scalars().all()

    return EvidenceSearchResponse(
        query=query,
        search_mode="text",
        results=[
            EvidenceSearchResult(
                id=c.id,
                run_id=c.run_id,
                source_type=c.source_type,
                source_url=c.source_url,
                content=c.content,
                metadata=c.chunk_metadata or {},
                embedding_status=c.embedding_status,
                score=None,
                search_mode="text",
            )
            for c in chunks
        ],
    )
