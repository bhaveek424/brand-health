"""
Embedding service for evidence chunks.

Provider:
  - If OPENAI_API_KEY is set: OpenAI text-embedding-3-small (1536 dims, semantic).
  - Otherwise: no embedding is generated; embedding_status is set to "missing_provider".

Embedding dimension: 1536 (matches vector(1536) column in evidence_chunks).

Fallback behavior is explicit and logged. No silent fake embeddings.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 1536
EMBEDDING_MODEL = "text-embedding-3-small"


async def generate_embedding(text: str) -> tuple[Optional[list[float]], str]:
    """
    Returns (embedding_vector, embedding_status).
    embedding_status values: "live" | "missing_provider" | "failed"
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.info(
            "OPENAI_API_KEY not set; skipping embedding for this chunk. "
            "Set OPENAI_API_KEY to enable semantic search."
        )
        return None, "missing_provider"

    try:
        from openai import AsyncOpenAI  # type: ignore[import]
        client = AsyncOpenAI(api_key=api_key)
        resp = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            dimensions=EMBEDDING_DIM,
        )
        vector = resp.data[0].embedding
        return vector, "live"
    except Exception as exc:
        logger.error("Embedding generation failed: %s", exc)
        return None, "failed"


async def generate_embeddings_batch(
    texts: list[str],
) -> list[tuple[Optional[list[float]], str]]:
    """
    Batch embed texts. Returns list of (vector, status) tuples.
    Uses a single API call for all texts when provider is available.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.info(
            "OPENAI_API_KEY not set; skipping %d embeddings. "
            "Set OPENAI_API_KEY to enable semantic search.",
            len(texts),
        )
        return [(None, "missing_provider")] * len(texts)

    try:
        from openai import AsyncOpenAI  # type: ignore[import]
        client = AsyncOpenAI(api_key=api_key)
        resp = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
            dimensions=EMBEDDING_DIM,
        )
        results = []
        for item in resp.data:
            results.append((item.embedding, "live"))
        return results
    except Exception as exc:
        logger.error("Batch embedding generation failed: %s", exc)
        return [(None, "failed")] * len(texts)
