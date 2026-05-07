import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
AsyncSessionLocal = None
Base = declarative_base()

if DATABASE_URL:
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
