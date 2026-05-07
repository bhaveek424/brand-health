import os
import json
import logging
from typing import Any, Optional
from datetime import datetime, timezone
import asyncio

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
Extract structured product evidence from the web page and return strict JSON.

Required fields:
- product_title: string or null
- brand: string or null
- price: string or null
- currency: string or null
- rating: string or null
- review_count: string or null
- availability: string or null
- seller: string or null
- images: list of strings
- bullets: list of strings
- description: string or null
- specifications: list of objects
- warranty_or_returns: string or null
- review_snippets: list of strings
- summary: string or null
- extraction_quality: object with confidence (number), missing_fields (list), warnings (list)
""".strip()


def _safe_get(d: dict, key: str, default: Any = None) -> Any:
    return d.get(key, default) if isinstance(d, dict) else default


def _extract_from_graph_output(raw: Any) -> dict:
    """Normalize SmartScraperGraph output into our evidence schema."""
    result = {}
    if isinstance(raw, dict):
        result = raw
    elif isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                result = parsed
        except json.JSONDecodeError:
            # Keep string as summary fallback
            result = {"summary": raw.strip() if raw else None}
    elif raw is not None:
        result = {"summary": str(raw).strip() if str(raw) else None}

    quality = _safe_get(result, "extraction_quality", {})
    if not isinstance(quality, dict):
        quality = {}

    return {
        "product_title": _safe_get(result, "product_title"),
        "brand": _safe_get(result, "brand"),
        "price": _safe_get(result, "price"),
        "currency": _safe_get(result, "currency"),
        "rating": _safe_get(result, "rating"),
        "review_count": _safe_get(result, "review_count"),
        "availability": _safe_get(result, "availability"),
        "seller": _safe_get(result, "seller"),
        "images": _safe_get(result, "images", []),
        "bullets": _safe_get(result, "bullets", []),
        "description": _safe_get(result, "description"),
        "specifications": _safe_get(result, "specifications", []),
        "warranty_or_returns": _safe_get(result, "warranty_or_returns"),
        "review_snippets": _safe_get(result, "review_snippets", []),
        "summary": _safe_get(result, "summary"),
        "extraction_quality": {
            "confidence": _safe_get(quality, "confidence", 0.0),
            "missing_fields": _safe_get(quality, "missing_fields", []),
            "warnings": _safe_get(quality, "warnings", []),
        },
    }


class _EvidenceSchema:
    """Lazy Pydantic schema for SmartScraperGraph structured output."""
    pass


def _build_llm_config() -> dict:
    model = os.getenv("SCRAPEGRAPH_LLM_MODEL", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    ollama_url = os.getenv("OLLAMA_BASE_URL", "").strip()

    if not model:
        raise RuntimeError(
            "SCRAPEGRAPH_LLM_MODEL is not configured. "
            "Set it to e.g. openai/gpt-4o-mini or ollama/llama3.2"
        )

    # Ollama mode
    if model.startswith("ollama/"):
        ollama_model = model.split("/")[-1]
        base_url = ollama_url or "http://localhost:11434"
        return {
            "llm": {
                "model": f"ollama/{ollama_model}",
                "base_url": base_url,
            },
            "headless": True,
        }

    # OpenAI-style mode (default)
    if not openai_key:
        raise RuntimeError(
            f"OPENAI_API_KEY is not configured. Set it when using model {model}. "
            "For Ollama, set SCRAPEGRAPH_LLM_MODEL=ollama/... and OLLAMA_BASE_URL."
        )

    return {
        "llm": {
            "api_key": openai_key,
            "model": model,
        },
        "headless": True,
    }


class ScrapeGraphService:
    """
    Local open-source ScrapeGraphAI extraction service.
    Uses SmartScraperGraph with Playwright and a configured LLM.
    """

    def extract_sync(self, url: str) -> dict:
        """
        Run SmartScraperGraph synchronously.
        Returns dict with:
          - raw_response: full graph output (for audit)
          - normalized: flattened/normalized fields
          - success: bool
          - error: optional string
        """
        try:
            config = _build_llm_config()
        except RuntimeError as exc:
            return {
                "success": False,
                "error": f"Config error: {exc}",
                "raw_response": {},
                "normalized": {},
            }

        try:
            from pydantic import BaseModel, Field
            from typing import Optional, List
            from scrapegraphai.graphs import SmartScraperGraph

            class EvidenceSchema(BaseModel):
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
                extraction_quality: dict = Field(default_factory=dict)

            graph = SmartScraperGraph(
                prompt=EXTRACTION_PROMPT,
                source=url,
                config=config,
                schema=EvidenceSchema,
            )
            raw_output = graph.run()
        except ImportError as exc:
            logger.error("scrapegraphai import error: %s", exc)
            return {
                "success": False,
                "error": "scrapegraphai is not installed correctly.",
                "raw_response": {},
                "normalized": {},
            }
        except Exception as exc:
            logger.error("SmartScraperGraph error: %s", exc)
            error_msg = str(exc)
            if "playwright" in error_msg.lower() or "chromium" in error_msg.lower():
                error_msg = (
                    "Playwright browser not available. "
                    "Run 'playwright install chromium' to fix."
                )
            return {
                "success": False,
                "error": error_msg,
                "raw_response": {"error": str(exc)},
                "normalized": {},
            }

        normalized = _extract_from_graph_output(raw_output)
        return {
            "success": True,
            "raw_response": raw_output if isinstance(raw_output, dict) else {"output": str(raw_output)},
            "normalized": normalized,
        }

    async def extract(self, url: str) -> dict:
        """Async wrapper that runs extraction in a thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.extract_sync, url)
