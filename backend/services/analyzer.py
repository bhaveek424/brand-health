"""
GTM risk analysis service.

Provider selection:
  - OPENAI_API_KEY set: OpenAI chat completions with JSON mode.
  - No key / call fails: deterministic rule-based fallback, clearly labeled.

Env vars:
  OPENAI_API_KEY  - Required for live AI analysis.
  ANALYSIS_MODEL  - OpenAI model. Default: gpt-4o-mini

The deterministic fallback is labeled provider="deterministic_fallback" in all
output and stored in the DB. It is never silently substituted for an AI result.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

ANALYSIS_MODEL_DEFAULT = "gpt-4o-mini"

_SYSTEM_PROMPT = """\
You are a GTM (Go-To-Market) risk analyst specializing in marketplace product listings.

You will receive structured evidence chunks extracted from a product listing.
Each chunk has an ID, source type, and content.

Analyze the evidence and return ONLY valid JSON matching this exact schema:

{
  "health_score": <integer 0-100>,
  "top_risks": [
    {
      "title": <string>,
      "severity": <"high"|"medium"|"low">,
      "description": <string>,
      "cited_chunk_ids": [<chunk_id_string>, ...]
    }
  ],
  "issue_themes": [
    {
      "theme": <string>,
      "frequency": <"high"|"medium"|"low">,
      "description": <string>,
      "cited_chunk_ids": [<chunk_id_string>, ...]
    }
  ],
  "listing_quality": {
    "score": <integer 0-100>,
    "findings": [
      {
        "field": <string>,
        "status": <"pass"|"warning"|"fail">,
        "note": <string>,
        "cited_chunk_ids": [<chunk_id_string>, ...]
      }
    ]
  },
  "recommended_actions": [
    {
      "action": <string>,
      "priority": <"high"|"medium"|"low">,
      "description": <string>,
      "cited_chunk_ids": [<chunk_id_string>, ...]
    }
  ],
  "citations": [
    {
      "chunk_id": <string>,
      "source_type": <string>,
      "excerpt": <string max 120 chars>
    }
  ]
}

Rules:
- health_score 0-100: overall GTM health considering pricing clarity, listing
  quality, review sentiment, availability, and evidence completeness.
- top_risks: 3-5 risks, each citing evidence chunk IDs.
- issue_themes: 2-4 themes, each citing evidence chunk IDs.
- listing_quality.score: 0-100 listing content quality.
- listing_quality.findings: one finding per key field (title, brand, price,
  rating, availability, bullets, description, specifications, warranty_returns).
- recommended_actions: 3-5 concrete actions, each citing evidence chunk IDs.
- citations: one entry per unique chunk ID referenced anywhere above.
- Return ONLY the JSON object — no markdown, no explanation.\
"""


def _build_chunks_prompt(chunks: list[dict]) -> str:
    lines = ["Evidence chunks for this product listing:\n"]
    for c in chunks:
        lines.append(f"[CHUNK {c['id']}] ({c['source_type']})")
        lines.append(c["content"])
        lines.append("")
    return "\n".join(lines)


def _deterministic_fallback(chunks: list[dict]) -> dict:
    """
    Rule-based GTM analysis. Not AI-generated.
    All returned data is derived from chunk content and IDs.
    Labeled provider="deterministic_fallback" by the caller.
    """
    chunk_by_type: dict[str, list[dict]] = {}
    for c in chunks:
        chunk_by_type.setdefault(c["source_type"], []).append(c)

    all_chunk_ids = [c["id"] for c in chunks]
    chunk_by_id = {c["id"]: c for c in chunks}

    # --- Health score ---
    score = 50
    if chunk_by_type.get("product_summary"):
        score += 5
    bullet_chunks = chunk_by_type.get("bullet", [])
    score += min(len(bullet_chunks) * 2, 10)
    if chunk_by_type.get("description"):
        score += 8
    if chunk_by_type.get("specifications"):
        score += 5
    if chunk_by_type.get("warranty_returns"):
        score += 5

    review_chunks = chunk_by_type.get("review_snippet", [])
    if review_chunks:
        snippets_text = " ".join(c["content"].lower() for c in review_chunks)
        _pos = ["great", "excellent", "love", "perfect", "best", "good", "recommend", "amazing"]
        _neg = ["poor", "bad", "broken", "defective", "disappointed", "return", "worst", "avoid"]
        pos = sum(snippets_text.count(w) for w in _pos)
        neg = sum(snippets_text.count(w) for w in _neg)
        score += min(pos * 2, 8)
        score -= min(neg * 3, 12)

    quality_chunks = chunk_by_type.get("extraction_quality", [])
    if quality_chunks and "Missing fields:" in quality_chunks[0]["content"]:
        missing_count = quality_chunks[0]["content"].count(",") + 1
        score -= min(missing_count * 3, 15)

    health_score = max(0, min(100, score))

    # --- Top risks ---
    top_risks: list[dict] = []
    summary_ids = [c["id"] for c in chunk_by_type.get("product_summary", chunks[:1])]

    if not bullet_chunks:
        top_risks.append({
            "title": "Listing Content Gap — No Bullet Points",
            "severity": "high",
            "description": "No product bullet points were found. Buyers rely on bullets for quick evaluation. Missing bullets reduce conversion rate.",
            "cited_chunk_ids": summary_ids[:2],
        })

    if not chunk_by_type.get("description"):
        top_risks.append({
            "title": "Missing Product Description",
            "severity": "medium",
            "description": "No product description was extracted. A detailed description improves SEO, buyer confidence, and listing completeness score.",
            "cited_chunk_ids": all_chunk_ids[:2],
        })

    if review_chunks:
        review_ids = [c["id"] for c in review_chunks]
        snippets_text = " ".join(c["content"].lower() for c in review_chunks)
        neg_words = ["poor", "bad", "broken", "defective", "disappointed", "return", "worst", "avoid"]
        neg_count = sum(snippets_text.count(w) for w in neg_words)
        if neg_count > 0:
            top_risks.append({
                "title": "Negative Review Signals",
                "severity": "high",
                "description": f"Review snippets contain {neg_count} negative indicator(s). This may indicate customer dissatisfaction risk and potential brand damage.",
                "cited_chunk_ids": review_ids[:3],
            })

    if not chunk_by_type.get("specifications"):
        top_risks.append({
            "title": "Missing Technical Specifications",
            "severity": "medium",
            "description": "No product specifications were found. Buyers in technical and high-consideration categories rely on specs for comparison and purchase decisions.",
            "cited_chunk_ids": all_chunk_ids[:2],
        })

    if not chunk_by_type.get("warranty_returns"):
        top_risks.append({
            "title": "No Warranty or Returns Policy",
            "severity": "low",
            "description": "Warranty and return policy were not found. Clear return terms reduce purchase hesitation and chargebacks.",
            "cited_chunk_ids": summary_ids[:1],
        })

    if not top_risks:
        top_risks.append({
            "title": "Insufficient Evidence for Full Risk Assessment",
            "severity": "medium",
            "description": f"Only {len(chunks)} evidence chunk(s) available. Complete extraction is recommended for a full risk assessment.",
            "cited_chunk_ids": all_chunk_ids[:3],
        })

    top_risks = top_risks[:5]

    # --- Issue themes ---
    issue_themes: list[dict] = []

    if review_chunks:
        review_ids = [c["id"] for c in review_chunks]
        issue_themes.append({
            "theme": "Customer Review Signals",
            "frequency": "high" if len(review_ids) >= 3 else "medium",
            "description": f"{len(review_ids)} review snippet(s) captured. Monitor for recurring sentiment themes and brand risk indicators.",
            "cited_chunk_ids": review_ids,
        })

    if bullet_chunks:
        bullet_ids = [c["id"] for c in bullet_chunks]
        issue_themes.append({
            "theme": "Product Feature Claims",
            "frequency": "medium",
            "description": f"{len(bullet_ids)} product bullet(s) make specific feature claims. Verify claims are accurate, substantiated, and compliant with marketplace policies.",
            "cited_chunk_ids": bullet_ids[:3],
        })

    if quality_chunks:
        issue_themes.append({
            "theme": "Extraction Data Quality",
            "frequency": "low",
            "description": "Extraction quality metadata indicates some fields may be incomplete or low-confidence. A re-extraction may improve coverage.",
            "cited_chunk_ids": [c["id"] for c in quality_chunks],
        })

    if not issue_themes:
        issue_themes.append({
            "theme": "Limited Evidence Available",
            "frequency": "low",
            "description": "Insufficient evidence to identify recurring themes. Full extraction recommended.",
            "cited_chunk_ids": all_chunk_ids[:2],
        })

    # --- Listing quality ---
    listing_score = 40
    listing_findings: list[dict] = []
    summary_content = " ".join(c["content"] for c in chunk_by_type.get("product_summary", []))

    for field, marker in [
        ("title", "Title:"),
        ("brand", "Brand:"),
        ("price", "Price:"),
        ("rating", "Rating:"),
        ("availability", "Availability:"),
    ]:
        present = marker in summary_content
        listing_findings.append({
            "field": field,
            "status": "pass" if present else "fail",
            "note": f"{field.capitalize()} {'present in evidence.' if present else 'not found in extracted evidence.'}",
            "cited_chunk_ids": summary_ids[:1],
        })
        if present:
            listing_score += 5

    for field, key in [
        ("bullets", "bullet"),
        ("description", "description"),
        ("specifications", "specifications"),
        ("warranty_returns", "warranty_returns"),
    ]:
        present = bool(chunk_by_type.get(key))
        field_ids = [c["id"] for c in chunk_by_type.get(key, [])]
        listing_findings.append({
            "field": field,
            "status": "pass" if present else "warning",
            "note": f"{field.replace('_', ' ').capitalize()} {'present.' if present else 'not found — consider adding.'}",
            "cited_chunk_ids": field_ids[:2] if field_ids else summary_ids[:1],
        })
        if present:
            listing_score += 5

    listing_score = max(0, min(100, listing_score))

    # --- Recommended actions ---
    _action_map = {
        "Listing Content Gap — No Bullet Points": (
            "Add Product Bullet Points",
            "Create 5-7 concise bullet points highlighting key features, benefits, and differentiators.",
        ),
        "Missing Product Description": (
            "Write a Full Product Description",
            "Add a detailed description (500+ words) covering features, use cases, and target audience.",
        ),
        "Negative Review Signals": (
            "Address Negative Customer Feedback",
            "Review negative feedback, respond to open issues, consider product improvements or updated copy to reduce return rate.",
        ),
        "Missing Technical Specifications": (
            "Add Technical Specifications",
            "List all relevant specs: dimensions, weight, materials, compatibility, and certifications.",
        ),
        "No Warranty or Returns Policy": (
            "Publish Warranty and Returns Policy",
            "Clearly state warranty terms and return policy in the listing to reduce buyer hesitation.",
        ),
    }

    recommended_actions: list[dict] = []
    for risk in top_risks[:4]:
        if risk["title"] in _action_map:
            action_title, action_desc = _action_map[risk["title"]]
            recommended_actions.append({
                "action": action_title,
                "priority": risk["severity"],
                "description": action_desc,
                "cited_chunk_ids": risk["cited_chunk_ids"],
            })

    if not recommended_actions:
        recommended_actions.append({
            "action": "Complete Full Evidence Extraction",
            "priority": "high",
            "description": "Run a full product evidence extraction to enable a complete GTM risk assessment.",
            "cited_chunk_ids": all_chunk_ids[:2],
        })

    # --- Citations ---
    cited_ids: set[str] = set()
    for risk in top_risks:
        cited_ids.update(risk["cited_chunk_ids"])
    for theme in issue_themes:
        cited_ids.update(theme["cited_chunk_ids"])
    for finding in listing_findings:
        cited_ids.update(finding["cited_chunk_ids"])
    for action in recommended_actions:
        cited_ids.update(action["cited_chunk_ids"])

    citations = [
        {
            "chunk_id": cid,
            "source_type": chunk_by_id[cid]["source_type"],
            "excerpt": chunk_by_id[cid]["content"][:120],
        }
        for cid in cited_ids
        if cid in chunk_by_id
    ]

    return {
        "health_score": health_score,
        "top_risks": top_risks,
        "issue_themes": issue_themes,
        "listing_quality": {"score": listing_score, "findings": listing_findings},
        "recommended_actions": recommended_actions,
        "citations": citations,
    }


_SEVERITY_ENUM = {"high", "medium", "low"}
_STATUS_ENUM = {"pass", "warning", "fail"}


def _required_str(obj: dict, key: str, path: str) -> None:
    value = obj.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{path}.{key} missing or blank")
    obj[key] = value.strip()


def _validate_and_normalize_llm_result(parsed: Any, valid_chunk_ids: set[str]) -> dict:
    """
    Validate and normalize LLM JSON output against the expected schema.
    Raises ValueError with a descriptive message on any structural failure.
    Strips cited_chunk_ids to only IDs present in valid_chunk_ids.
    """
    if not isinstance(parsed, dict):
        raise ValueError("LLM result is not a JSON object")

    # health_score
    hs = parsed.get("health_score")
    if isinstance(hs, float):
        parsed["health_score"] = max(0, min(100, int(hs)))
    elif not isinstance(hs, int) or not (0 <= hs <= 100):
        raise ValueError(f"health_score invalid: {hs!r}")

    def _filter_ids(ids: Any) -> list[str]:
        if not isinstance(ids, list):
            return []
        return [i for i in ids if isinstance(i, str) and i in valid_chunk_ids]

    # top_risks
    risks = parsed.get("top_risks")
    if not isinstance(risks, list):
        raise ValueError("top_risks must be a list")
    for i, r in enumerate(risks):
        if not isinstance(r, dict):
            raise ValueError(f"top_risks[{i}] not a dict")
        _required_str(r, "title", f"top_risks[{i}]")
        if r.get("severity") not in _SEVERITY_ENUM:
            raise ValueError(f"top_risks[{i}].severity invalid: {r.get('severity')!r}")
        _required_str(r, "description", f"top_risks[{i}]")
        r["cited_chunk_ids"] = _filter_ids(r.get("cited_chunk_ids"))

    # issue_themes
    themes = parsed.get("issue_themes")
    if not isinstance(themes, list):
        raise ValueError("issue_themes must be a list")
    for i, t in enumerate(themes):
        if not isinstance(t, dict):
            raise ValueError(f"issue_themes[{i}] not a dict")
        _required_str(t, "theme", f"issue_themes[{i}]")
        if t.get("frequency") not in _SEVERITY_ENUM:
            raise ValueError(f"issue_themes[{i}].frequency invalid: {t.get('frequency')!r}")
        _required_str(t, "description", f"issue_themes[{i}]")
        t["cited_chunk_ids"] = _filter_ids(t.get("cited_chunk_ids"))

    # listing_quality
    lq = parsed.get("listing_quality")
    if not isinstance(lq, dict):
        raise ValueError("listing_quality must be an object")
    lq_score = lq.get("score")
    if not isinstance(lq_score, (int, float)) or not (0 <= lq_score <= 100):
        raise ValueError(f"listing_quality.score invalid: {lq_score!r}")
    lq["score"] = int(lq_score)
    findings = lq.get("findings")
    if not isinstance(findings, list):
        raise ValueError("listing_quality.findings must be a list")
    for i, f in enumerate(findings):
        if not isinstance(f, dict):
            raise ValueError(f"listing_quality.findings[{i}] not a dict")
        _required_str(f, "field", f"listing_quality.findings[{i}]")
        if f.get("status") not in _STATUS_ENUM:
            raise ValueError(f"listing_quality.findings[{i}].status invalid: {f.get('status')!r}")
        _required_str(f, "note", f"listing_quality.findings[{i}]")
        f["cited_chunk_ids"] = _filter_ids(f.get("cited_chunk_ids"))

    # recommended_actions
    actions = parsed.get("recommended_actions")
    if not isinstance(actions, list):
        raise ValueError("recommended_actions must be a list")
    for i, a in enumerate(actions):
        if not isinstance(a, dict):
            raise ValueError(f"recommended_actions[{i}] not a dict")
        _required_str(a, "action", f"recommended_actions[{i}]")
        if a.get("priority") not in _SEVERITY_ENUM:
            raise ValueError(f"recommended_actions[{i}].priority invalid: {a.get('priority')!r}")
        _required_str(a, "description", f"recommended_actions[{i}]")
        a["cited_chunk_ids"] = _filter_ids(a.get("cited_chunk_ids"))

    # citations — validate each entry and keep only those referencing valid IDs
    citations = parsed.get("citations")
    if not isinstance(citations, list):
        parsed["citations"] = []
    else:
        valid_citations = []
        for c in citations:
            if not isinstance(c, dict):
                continue
            chunk_id = c.get("chunk_id")
            if not isinstance(chunk_id, str) or chunk_id not in valid_chunk_ids:
                continue
            source_type = c.get("source_type")
            if not isinstance(source_type, str) or not source_type.strip():
                continue
            excerpt = c.get("excerpt")
            if not isinstance(excerpt, str) or not excerpt.strip():
                continue
            valid_citations.append({
                "chunk_id": chunk_id,
                "source_type": source_type.strip(),
                "excerpt": excerpt.strip()[:120],
            })
        parsed["citations"] = valid_citations

    return parsed


async def analyze_chunks(chunks: list[dict]) -> dict[str, Any]:
    """
    Analyze evidence chunks into a structured GTM risk report.

    Returns dict with keys:
      result   - {health_score, top_risks, issue_themes, listing_quality,
                  recommended_actions, citations}
      provider - "openai" | "deterministic_fallback"
      model    - model string or None
      raw_response - raw LLM response dict or {}
    """
    if not chunks:
        logger.warning("No chunks provided; returning empty deterministic fallback.")
        return {
            "result": {
                "health_score": 0,
                "top_risks": [],
                "issue_themes": [],
                "listing_quality": {"score": 0, "findings": []},
                "recommended_actions": [],
                "citations": [],
            },
            "provider": "deterministic_fallback",
            "model": None,
            "raw_response": {},
        }

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("ANALYSIS_MODEL", ANALYSIS_MODEL_DEFAULT)

    if api_key:
        try:
            from openai import AsyncOpenAI  # type: ignore[import]

            client = AsyncOpenAI(api_key=api_key)
            chunks_prompt = _build_chunks_prompt(chunks)
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": chunks_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw_text = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_text)
            valid_ids = {c["id"] for c in chunks}
            try:
                normalized = _validate_and_normalize_llm_result(parsed, valid_ids)
                logger.info("OpenAI analysis completed and validated. model=%s", model)
                return {
                    "result": normalized,
                    "provider": "openai",
                    "model": model,
                    "raw_response": {"response_text": raw_text},
                }
            except ValueError as val_err:
                logger.error(
                    "OpenAI output failed validation (model=%s): %s — falling back to deterministic",
                    model,
                    val_err,
                )
                result = _deterministic_fallback(chunks)
                return {
                    "result": result,
                    "provider": "deterministic_fallback",
                    "model": None,
                    "raw_response": {"response_text": raw_text, "validation_error": str(val_err)},
                }
        except Exception as exc:
            logger.error(
                "OpenAI analysis failed (model=%s): %s — falling back to deterministic",
                model,
                exc,
            )

    logger.info(
        "Using deterministic_fallback analysis "
        "(OPENAI_API_KEY absent or model call failed)."
    )
    result = _deterministic_fallback(chunks)
    return {
        "result": result,
        "provider": "deterministic_fallback",
        "model": None,
        "raw_response": {},
    }
