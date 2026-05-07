"""
Chunking service: converts an ExtractionRun into evidence chunks.

Each chunk is a human-readable, citation-ready text unit covering one
logical field from the extracted product evidence.
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models import ExtractionRun


def build_chunks(ex: "ExtractionRun") -> list[dict]:
    """
    Returns list of chunk dicts: {source_type, content, metadata}.
    Each dict maps to one EvidenceChunk row.
    Empty/null fields are skipped.
    """
    chunks: list[dict] = []

    # 1. Product overview (title/brand/price/rating/availability/seller)
    parts = []
    if ex.product_title:
        parts.append(f"Title: {ex.product_title}")
    if ex.brand:
        parts.append(f"Brand: {ex.brand}")
    if ex.price:
        price_str = f"{ex.price} {ex.currency or ''}".strip()
        parts.append(f"Price: {price_str}")
    if ex.rating:
        rating_str = str(ex.rating)
        if ex.review_count:
            rating_str += f" ({ex.review_count} reviews)"
        parts.append(f"Rating: {rating_str}")
    if ex.availability:
        parts.append(f"Availability: {ex.availability}")
    if ex.seller:
        parts.append(f"Seller: {ex.seller}")
    if parts:
        chunks.append(
            {
                "source_type": "product_summary",
                "content": "\n".join(parts),
                "metadata": {"field": "product_summary"},
            }
        )

    # 2. Bullets (one chunk per bullet for granular retrieval)
    for i, bullet in enumerate(ex.bullets or []):
        if bullet and str(bullet).strip():
            chunks.append(
                {
                    "source_type": "bullet",
                    "content": str(bullet).strip(),
                    "metadata": {"field": "bullets", "index": i},
                }
            )

    # 3. Description
    if ex.description and str(ex.description).strip():
        chunks.append(
            {
                "source_type": "description",
                "content": str(ex.description).strip(),
                "metadata": {"field": "description"},
            }
        )

    # 4. Specifications (all as one chunk with key: value lines)
    spec_parts = []
    for spec in ex.specifications or []:
        if isinstance(spec, dict):
            for k, v in spec.items():
                spec_parts.append(f"{k}: {v}")
    if spec_parts:
        chunks.append(
            {
                "source_type": "specifications",
                "content": "\n".join(spec_parts),
                "metadata": {"field": "specifications", "count": len(ex.specifications or [])},
            }
        )

    # 5. Warranty / returns
    if ex.warranty_or_returns and str(ex.warranty_or_returns).strip():
        chunks.append(
            {
                "source_type": "warranty_returns",
                "content": str(ex.warranty_or_returns).strip(),
                "metadata": {"field": "warranty_or_returns"},
            }
        )

    # 6. Review snippets (one chunk per snippet)
    for i, snippet in enumerate(ex.review_snippets or []):
        if snippet and str(snippet).strip():
            chunks.append(
                {
                    "source_type": "review_snippet",
                    "content": str(snippet).strip(),
                    "metadata": {"field": "review_snippets", "index": i},
                }
            )

    # 7. Summary
    if ex.summary and str(ex.summary).strip():
        chunks.append(
            {
                "source_type": "summary",
                "content": str(ex.summary).strip(),
                "metadata": {"field": "summary"},
            }
        )

    # 8. Extraction quality / warnings
    quality = ex.extraction_quality or {}
    quality_parts = []
    missing = quality.get("missing_fields", [])
    warnings = quality.get("warnings", [])
    if missing:
        quality_parts.append(f"Missing fields: {', '.join(missing)}")
    if warnings:
        quality_parts.append(f"Warnings: {', '.join(warnings)}")
    if quality_parts:
        chunks.append(
            {
                "source_type": "extraction_quality",
                "content": "\n".join(quality_parts),
                "metadata": {
                    "field": "extraction_quality",
                    "confidence": quality.get("confidence", 0.0),
                },
            }
        )

    return chunks
