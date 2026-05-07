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
from models import Base, Product, Run, RunEvent, ExtractionRun, EvidenceChunk, Analysis, ActionDraft, ActionAuditLog
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
    AnalysisResponse,
    RiskItem,
    IssueTheme,
    ListingQuality,
    ListingFinding,
    RecommendedAction,
    AnalysisCitation,
    ActionDraftResponse,
    ActionAuditLogResponse,
    ActionTransitionResponse,
    SimulatedSendPreview,
)
from services.scrapegraph import ScrapeGraphService
from services.chunking import build_chunks
from services.embeddings import generate_embeddings_batch, EMBEDDING_DIM
from services.analyzer import analyze_chunks
from services.action_drafts import generate_drafts

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


def _build_analysis_response(a: Analysis) -> AnalysisResponse:
    lq_raw = a.listing_quality or {}
    lq = ListingQuality(
        score=lq_raw.get("score", 0),
        findings=[ListingFinding(**f) for f in lq_raw.get("findings", [])],
    )
    return AnalysisResponse(
        id=a.id,
        run_id=a.run_id,
        status=a.status,
        provider=a.provider,
        analysis_model=a.model,
        health_score=a.health_score,
        top_risks=[RiskItem(**r) for r in (a.top_risks or [])],
        issue_themes=[IssueTheme(**t) for t in (a.issue_themes or [])],
        listing_quality=lq,
        recommended_actions=[RecommendedAction(**r) for r in (a.recommended_actions or [])],
        citations=[AnalysisCitation(**c) for c in (a.citations or [])],
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


@app.post("/runs/{run_id}/analyze", response_model=AnalysisResponse)
async def analyze_run(
    run_id: str, db: AsyncSession = Depends(get_db)
) -> AnalysisResponse:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(select(Run).where(Run.id == run_uuid))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    chunks_result = await db.execute(
        select(EvidenceChunk)
        .where(EvidenceChunk.run_id == run_uuid)
        .order_by(EvidenceChunk.created_at.asc())
    )
    chunk_rows = chunks_result.scalars().all()

    if not chunk_rows:
        raise HTTPException(
            status_code=422,
            detail="No evidence chunks found for this run. Extract evidence first.",
        )

    db.add(RunEvent(
        run_id=run.id,
        event_type="analysis_started",
        payload={"chunk_count": len(chunk_rows)},
        created_at=now_utc(),
    ))
    await db.commit()

    chunk_dicts = [
        {"id": str(c.id), "source_type": c.source_type, "content": c.content}
        for c in chunk_rows
    ]

    try:
        analysis_out = await analyze_chunks(chunk_dicts)
    except Exception as exc:
        logger.error("analyze_chunks raised unexpectedly: %s", exc)
        db.add(RunEvent(
            run_id=run.id,
            event_type="analysis_failed",
            payload={"error": str(exc)},
            created_at=now_utc(),
        ))
        await db.commit()
        raise HTTPException(status_code=503, detail="Analysis failed.")

    ar = analysis_out["result"]
    analysis = Analysis(
        run_id=run.id,
        status="completed",
        provider=analysis_out["provider"],
        model=analysis_out["model"],
        health_score=ar.get("health_score"),
        top_risks=ar.get("top_risks", []),
        issue_themes=ar.get("issue_themes", []),
        listing_quality=ar.get("listing_quality", {}),
        recommended_actions=ar.get("recommended_actions", []),
        citations=ar.get("citations", []),
        raw_response=analysis_out["raw_response"],
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(analysis)

    event_type = (
        "analysis_fallback_used"
        if analysis_out["provider"] == "deterministic_fallback"
        else "analysis_completed"
    )
    db.add(RunEvent(
        run_id=run.id,
        event_type=event_type,
        payload={
            "analysis_id": str(analysis.id),
            "provider": analysis_out["provider"],
            "health_score": ar.get("health_score"),
        },
        created_at=now_utc(),
    ))
    await db.commit()

    return _build_analysis_response(analysis)


@app.get("/runs/{run_id}/analysis", response_model=Optional[AnalysisResponse])
async def get_analysis(
    run_id: str, db: AsyncSession = Depends(get_db)
) -> Optional[AnalysisResponse]:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(
        select(Analysis)
        .where(Analysis.run_id == run_uuid)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = result.scalar_one_or_none()
    if analysis is None:
        return None

    return _build_analysis_response(analysis)


def _build_draft_response(d: ActionDraft) -> ActionDraftResponse:
    return ActionDraftResponse(
        id=d.id,
        run_id=d.run_id,
        analysis_id=d.analysis_id,
        draft_type=d.draft_type,
        target_system=d.target_system,
        status=d.status,
        title=d.title,
        body=d.body,
        payload=d.payload or {},
        evidence_ids=d.evidence_ids or [],
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@app.post("/runs/{run_id}/actions/generate", response_model=List[ActionDraftResponse])
async def generate_action_drafts(
    run_id: str, db: AsyncSession = Depends(get_db)
) -> List[ActionDraftResponse]:
    """
    Generate approval-mode action drafts from the latest completed analysis.

    Idempotent per analysis: if drafts already exist for the latest analysis,
    return them without regenerating.  If the analysis changes (re-analyze),
    new drafts are generated for the new analysis and previous drafts remain
    in the DB but are no longer returned by GET /runs/{run_id}/actions.
    """
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    result = await db.execute(select(Run).where(Run.id == run_uuid))
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")

    # Load latest analysis
    analysis_result = await db.execute(
        select(Analysis)
        .where(Analysis.run_id == run_uuid)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis = analysis_result.scalar_one_or_none()
    if analysis is None:
        raise HTTPException(
            status_code=422,
            detail="No analysis found for this run. Run POST /runs/{run_id}/analyze first.",
        )

    # Idempotent: return existing drafts if already generated for this analysis
    existing_result = await db.execute(
        select(ActionDraft)
        .where(ActionDraft.run_id == run_uuid)
        .where(ActionDraft.analysis_id == analysis.id)
        .order_by(ActionDraft.created_at.asc())
    )
    existing = existing_result.scalars().all()
    if existing:
        return [_build_draft_response(d) for d in existing]

    db.add(RunEvent(
        run_id=run.id,
        event_type="action_drafts_started",
        payload={"analysis_id": str(analysis.id)},
        created_at=now_utc(),
    ))
    await db.commit()

    try:
        ar = {
            "health_score": analysis.health_score,
            "top_risks": analysis.top_risks or [],
            "issue_themes": analysis.issue_themes or [],
            "listing_quality": analysis.listing_quality or {"score": 0, "findings": []},
            "recommended_actions": analysis.recommended_actions or [],
            "citations": analysis.citations or [],
        }
        draft_dicts = generate_drafts(ar, analysis_id=str(analysis.id))
    except Exception as exc:
        logger.error("generate_drafts failed for run %s: %s", run_id, exc)
        db.add(RunEvent(
            run_id=run.id,
            event_type="action_drafts_failed",
            payload={"error": str(exc)},
            created_at=now_utc(),
        ))
        await db.commit()
        raise HTTPException(status_code=503, detail="Draft generation failed.")

    drafts: list[ActionDraft] = []
    for d in draft_dicts:
        draft = ActionDraft(
            run_id=run.id,
            analysis_id=analysis.id,
            draft_type=d["draft_type"],
            target_system=d["target_system"],
            status=d["status"],
            title=d["title"],
            body=d["body"],
            payload=d["payload"],
            evidence_ids=d["evidence_ids"],
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(draft)
        drafts.append(draft)

    db.add(RunEvent(
        run_id=run.id,
        event_type="action_drafts_created",
        payload={
            "analysis_id": str(analysis.id),
            "draft_count": len(drafts),
            "draft_types": [d.draft_type for d in drafts],
        },
        created_at=now_utc(),
    ))
    await db.commit()

    return [_build_draft_response(d) for d in drafts]


@app.get("/runs/{run_id}/actions", response_model=List[ActionDraftResponse])
async def get_action_drafts(
    run_id: str, db: AsyncSession = Depends(get_db)
) -> List[ActionDraftResponse]:
    """Return drafts for the latest analysis of this run, ordered by creation time."""
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run id format.")

    # Find latest analysis id for this run
    analysis_result = await db.execute(
        select(Analysis.id)
        .where(Analysis.run_id == run_uuid)
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    analysis_id = analysis_result.scalar_one_or_none()
    if analysis_id is None:
        return []

    drafts_result = await db.execute(
        select(ActionDraft)
        .where(ActionDraft.run_id == run_uuid)
        .where(ActionDraft.analysis_id == analysis_id)
        .order_by(ActionDraft.created_at.asc())
    )
    drafts = drafts_result.scalars().all()
    return [_build_draft_response(d) for d in drafts]


def _build_audit_response(a: ActionAuditLog) -> ActionAuditLogResponse:
    return ActionAuditLogResponse(
        id=a.id,
        action_id=a.action_id,
        run_id=a.run_id,
        event_type=a.event_type,
        from_status=a.from_status,
        to_status=a.to_status,
        target_system=a.target_system,
        payload=a.payload or {},
        created_at=a.created_at,
    )


async def _load_draft(action_id: str, db: AsyncSession) -> ActionDraft:
    try:
        action_uuid = uuid.UUID(action_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid action id format.")
    result = await db.execute(select(ActionDraft).where(ActionDraft.id == action_uuid))
    draft = result.scalar_one_or_none()
    if draft is None:
        raise HTTPException(status_code=404, detail="Action draft not found.")
    return draft


@app.post("/actions/{action_id}/approve", response_model=ActionTransitionResponse)
async def approve_action(
    action_id: str, db: AsyncSession = Depends(get_db)
) -> ActionTransitionResponse:
    """
    Transition an action draft from draft → approved.
    Invalid if already approved or simulated_sent (409).
    """
    draft = await _load_draft(action_id, db)

    if draft.status != "draft":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot approve action in status '{draft.status}'. Only 'draft' actions can be approved.",
        )

    from_status = draft.status
    draft.status = "approved"
    draft.updated_at = now_utc()

    audit = ActionAuditLog(
        action_id=draft.id,
        run_id=draft.run_id,
        event_type="action_approved",
        from_status=from_status,
        to_status="approved",
        target_system=draft.target_system,
        payload={"draft_type": draft.draft_type, "title": draft.title},
        created_at=now_utc(),
    )
    db.add(audit)

    db.add(RunEvent(
        run_id=draft.run_id,
        event_type="action_approved",
        payload={"action_id": str(draft.id), "draft_type": draft.draft_type, "target_system": draft.target_system},
        created_at=now_utc(),
    ))

    await db.commit()
    await db.refresh(draft)
    await db.refresh(audit)

    return ActionTransitionResponse(
        action=_build_draft_response(draft),
        audit=_build_audit_response(audit),
        simulated_send=None,
    )


@app.post("/actions/{action_id}/simulate-send", response_model=ActionTransitionResponse)
async def simulate_send_action(
    action_id: str, db: AsyncSession = Depends(get_db)
) -> ActionTransitionResponse:
    """
    Transition an action draft from approved → simulated_sent.
    Simulates delivery to target_system with no real connector call.
    Invalid if still draft (must approve first) or already simulated_sent (409).
    """
    draft = await _load_draft(action_id, db)

    if draft.status == "draft":
        raise HTTPException(
            status_code=409,
            detail="Cannot simulate send: action is still in 'draft' status. Approve it first.",
        )
    if draft.status == "simulated_sent":
        raise HTTPException(
            status_code=409,
            detail="Action has already been simulated sent.",
        )
    if draft.status != "approved":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot simulate send action in status '{draft.status}'. Expected 'approved'.",
        )

    from_status = draft.status
    draft.status = "simulated_sent"
    draft.updated_at = now_utc()

    sim_payload = {
        **(draft.payload or {}),
        "simulated": True,
        "target_system": draft.target_system,
        "draft_type": draft.draft_type,
        "title": draft.title,
        "body_preview": draft.body[:200],
    }

    audit = ActionAuditLog(
        action_id=draft.id,
        run_id=draft.run_id,
        event_type="action_simulated_sent",
        from_status=from_status,
        to_status="simulated_sent",
        target_system=draft.target_system,
        payload=sim_payload,
        created_at=now_utc(),
    )
    db.add(audit)

    db.add(RunEvent(
        run_id=draft.run_id,
        event_type="action_simulated_sent",
        payload={"action_id": str(draft.id), "draft_type": draft.draft_type, "target_system": draft.target_system},
        created_at=now_utc(),
    ))

    await db.commit()
    await db.refresh(draft)
    await db.refresh(audit)

    return ActionTransitionResponse(
        action=_build_draft_response(draft),
        audit=_build_audit_response(audit),
        simulated_send=SimulatedSendPreview(
            target_system=draft.target_system,
            payload=sim_payload,
            message="Simulated only. No external message was sent.",
        ),
    )
