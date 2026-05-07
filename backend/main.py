from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from urllib.parse import urlparse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, AsyncSessionLocal, DATABASE_URL
from models import Base, Product, Run, RunEvent
from schemas import CreateRunRequest, RunResponse, RunEventResponse


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
