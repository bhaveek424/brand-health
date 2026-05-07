"""
Approval-mode action draft generator.

Generates structured action drafts from a persisted GTM risk analysis.
All output is deterministic from the analysis dict — no external API calls,
no messages are sent.  Every draft starts with status="draft".

Draft types produced (always at least 3, up to 6 depending on evidence):
  supplier_escalation   → email to supplier/manufacturer
  listing_update_brief  → content team brief for listing fixes
  brand_partner_update  → brand partner or agency status update
  internal_ops_update   → Slack/Teams-style internal update
  customer_reply        → review response template (when review evidence exists)
  ops_ticket            → engineering/ops ticket for systemic issues
"""

from __future__ import annotations

from typing import Any


_DRAFT_ORDER = [
    "supplier_escalation",
    "listing_update_brief",
    "brand_partner_update",
    "internal_ops_update",
    "customer_reply",
    "ops_ticket",
]


def _collect_evidence_ids(analysis: dict) -> list[str]:
    """Return a deduplicated list of all cited chunk IDs in the analysis."""
    seen: set[str] = set()
    out: list[str] = []
    for risk in analysis.get("top_risks", []):
        for cid in risk.get("cited_chunk_ids", []):
            if cid not in seen:
                seen.add(cid)
                out.append(cid)
    for action in analysis.get("recommended_actions", []):
        for cid in action.get("cited_chunk_ids", []):
            if cid not in seen:
                seen.add(cid)
                out.append(cid)
    for cite in analysis.get("citations", []):
        cid = cite.get("chunk_id", "")
        if cid and cid not in seen:
            seen.add(cid)
            out.append(cid)
    return out


def _risk_lines(analysis: dict) -> str:
    lines = []
    for r in analysis.get("top_risks", []):
        lines.append(f"  [{r.get('severity', '?').upper()}] {r.get('title', '')}: {r.get('description', '')}")
    return "\n".join(lines) if lines else "  No specific risks identified."


def _action_lines(analysis: dict) -> str:
    lines = []
    for a in analysis.get("recommended_actions", []):
        lines.append(f"  [{a.get('priority', '?').upper()}] {a.get('action', '')}: {a.get('description', '')}")
    return "\n".join(lines) if lines else "  No recommended actions."


def _listing_findings(analysis: dict) -> str:
    lq = analysis.get("listing_quality", {})
    lines = []
    for f in lq.get("findings", []):
        icon = "✓" if f.get("status") == "pass" else ("⚠" if f.get("status") == "warning" else "✗")
        lines.append(f"  {icon} {f.get('field', '?')}: {f.get('note', '')}")
    return "\n".join(lines) if lines else "  No listing findings available."


def _high_risks(analysis: dict) -> list[dict]:
    return [r for r in analysis.get("top_risks", []) if r.get("severity") == "high"]


def _review_theme(analysis: dict) -> str | None:
    for t in analysis.get("issue_themes", []):
        if "review" in t.get("theme", "").lower() or "customer" in t.get("theme", "").lower():
            return t.get("description", "")
    return None


def _has_review_evidence(analysis: dict) -> bool:
    for c in analysis.get("citations", []):
        if c.get("source_type") == "review_snippet":
            return True
    return False


def generate_drafts(analysis: dict, analysis_id: str | None = None) -> list[dict[str, Any]]:
    """
    Generate action drafts from a completed GTM risk analysis dict.

    Args:
        analysis: the ``result`` dict from an Analysis row (health_score, top_risks, etc.)
        analysis_id: UUID string of the Analysis row (stored as metadata, not used for generation)

    Returns:
        List of draft dicts, each with keys matching the ActionDraft model.
        Status is always "draft". No external calls are made.
    """
    health = analysis.get("health_score", 50)
    all_evidence = _collect_evidence_ids(analysis)
    high = _high_risks(analysis)
    risk_block = _risk_lines(analysis)
    action_block = _action_lines(analysis)
    listing_block = _listing_findings(analysis)
    lq_score = analysis.get("listing_quality", {}).get("score", 0)

    drafts: list[dict[str, Any]] = []

    # --- 1. Supplier escalation email ---
    high_titles = "; ".join(r.get("title", "") for r in high[:3]) if high else "general quality concerns"
    supplier_evidence = []
    for r in high[:3]:
        supplier_evidence.extend(r.get("cited_chunk_ids", []))
    supplier_evidence = list(dict.fromkeys(supplier_evidence))[:6]

    drafts.append({
        "draft_type": "supplier_escalation",
        "target_system": "email",
        "status": "draft",
        "title": "Supplier Escalation: GTM Risk Findings",
        "body": (
            "Subject: Product Quality & Listing Risk — Action Required\n\n"
            "Dear Supplier / Manufacturing Partner,\n\n"
            f"Our GTM review process has flagged the following high-priority risks "
            f"(overall health score: {health}/100):\n\n"
            f"{risk_block}\n\n"
            "We require your input on the following recommended actions:\n\n"
            f"{action_block}\n\n"
            "Please respond within 5 business days with a remediation plan.\n\n"
            "Regards,\n[Brand Operations Team]"
        ),
        "payload": {
            "health_score": health,
            "high_risk_count": len(high),
            "high_risk_titles": high_titles,
            "approval_required": True,
        },
        "evidence_ids": supplier_evidence or all_evidence[:4],
    })

    # --- 2. Listing update brief ---
    listing_evidence = []
    for f in analysis.get("listing_quality", {}).get("findings", []):
        if f.get("status") != "pass":
            listing_evidence.extend(f.get("cited_chunk_ids", []))
    listing_evidence = list(dict.fromkeys(listing_evidence))[:6]

    drafts.append({
        "draft_type": "listing_update_brief",
        "target_system": "content_team",
        "status": "draft",
        "title": "Listing Update Brief: Content Quality Improvements Required",
        "body": (
            "LISTING UPDATE BRIEF\n"
            "====================\n\n"
            f"Listing Quality Score: {lq_score}/100\n"
            f"Overall GTM Health: {health}/100\n\n"
            "CONTENT FINDINGS\n"
            "----------------\n"
            f"{listing_block}\n\n"
            "PRIORITY ACTIONS FOR CONTENT TEAM\n"
            "----------------------------------\n"
            f"{action_block}\n\n"
            "Please update the live listing and confirm completion in the ops tracker.\n"
            "All changes require review before publishing."
        ),
        "payload": {
            "listing_quality_score": lq_score,
            "health_score": health,
            "approval_required": True,
        },
        "evidence_ids": listing_evidence or all_evidence[:4],
    })

    # --- 3. Brand partner update ---
    theme_lines = []
    for t in analysis.get("issue_themes", [])[:3]:
        theme_lines.append(f"  • {t.get('theme', '')}: {t.get('description', '')}")
    theme_block = "\n".join(theme_lines) if theme_lines else "  No specific themes at this time."

    drafts.append({
        "draft_type": "brand_partner_update",
        "target_system": "email",
        "status": "draft",
        "title": "Brand Partner Update: GTM Health Report",
        "body": (
            "Subject: GTM Health Update — Review & Action Required\n\n"
            "Hi [Partner],\n\n"
            f"Our latest GTM analysis shows an overall health score of {health}/100. "
            "Below is a summary of current issue themes and recommended next steps.\n\n"
            "ISSUE THEMES\n"
            "------------\n"
            f"{theme_block}\n\n"
            "TOP RISKS\n"
            "---------\n"
            f"{risk_block}\n\n"
            "RECOMMENDED ACTIONS\n"
            "-------------------\n"
            f"{action_block}\n\n"
            "Please review and align on priorities before we proceed.\n\n"
            "Best,\n[Category Management Team]"
        ),
        "payload": {
            "health_score": health,
            "theme_count": len(analysis.get("issue_themes", [])),
            "approval_required": True,
        },
        "evidence_ids": all_evidence[:5],
    })

    # --- 4. Internal ops update (Slack/Teams style) ---
    urgency = "HIGH" if health < 50 else ("MEDIUM" if health < 70 else "LOW")
    drafts.append({
        "draft_type": "internal_ops_update",
        "target_system": "slack",
        "status": "draft",
        "title": f"[{urgency}] GTM Health Alert — Score {health}/100",
        "body": (
            f":bar_chart: *GTM Health Update* — Score: *{health}/100* [{urgency} urgency]\n\n"
            f"*Risks detected:* {len(analysis.get('top_risks', []))}\n"
            f"*Listing QA score:* {lq_score}/100\n"
            f"*Issue themes:* {len(analysis.get('issue_themes', []))}\n\n"
            "*Top risks:*\n"
            f"{risk_block}\n\n"
            "*Next steps:*\n"
            f"{action_block}\n\n"
            "_This is a draft — requires approval before posting._"
        ),
        "payload": {
            "health_score": health,
            "urgency": urgency,
            "risk_count": len(analysis.get("top_risks", [])),
            "approval_required": True,
        },
        "evidence_ids": all_evidence[:4],
    })

    # --- 5. Customer reply (only when review evidence present) ---
    if _has_review_evidence(analysis):
        review_theme = _review_theme(analysis) or "We appreciate your feedback on our product."
        review_evidence = [
            c.get("chunk_id", "")
            for c in analysis.get("citations", [])
            if c.get("source_type") == "review_snippet"
        ][:4]

        drafts.append({
            "draft_type": "customer_reply",
            "target_system": "marketplace_reviews",
            "status": "draft",
            "title": "Customer Review Response Template",
            "body": (
                "Dear [Customer Name],\n\n"
                "Thank you for taking the time to share your feedback. "
                "We are sorry to hear about your experience and take your comments seriously.\n\n"
                f"{review_theme}\n\n"
                "We are actively working to address the issues you raised and have "
                "escalated this to our product and operations teams. "
                "Please reach out to our support team directly at [support contact] "
                "so we can make this right for you.\n\n"
                "Sincerely,\n[Customer Support Team]"
            ),
            "payload": {
                "health_score": health,
                "review_evidence_count": len(review_evidence),
                "approval_required": True,
            },
            "evidence_ids": review_evidence or all_evidence[:3],
        })

    # --- 6. Ops/engineering ticket ---
    systemic_risks = [r for r in analysis.get("top_risks", []) if r.get("severity") in ("high", "medium")]
    if systemic_risks or lq_score < 60:
        ticket_evidence = []
        for r in systemic_risks[:3]:
            ticket_evidence.extend(r.get("cited_chunk_ids", []))
        ticket_evidence = list(dict.fromkeys(ticket_evidence))[:5]

        risk_summary = "; ".join(r.get("title", "") for r in systemic_risks[:3])
        drafts.append({
            "draft_type": "ops_ticket",
            "target_system": "jira",
            "status": "draft",
            "title": f"[OPS] Listing & GTM Remediation — Health {health}/100",
            "body": (
                "TICKET TYPE: GTM Remediation\n"
                f"PRIORITY: {'P1' if health < 50 else 'P2'}\n"
                f"HEALTH SCORE: {health}/100\n"
                f"LISTING QA: {lq_score}/100\n\n"
                "DESCRIPTION\n"
                "-----------\n"
                "GTM analysis identified issues requiring engineering or operations input.\n\n"
                "RISKS REQUIRING REMEDIATION\n"
                "---------------------------\n"
                f"{risk_block}\n\n"
                "ACCEPTANCE CRITERIA\n"
                "-------------------\n"
                f"{action_block}\n\n"
                "EVIDENCE REFERENCES\n"
                "-------------------\n"
                f"Chunk IDs: {', '.join((ticket_evidence or all_evidence)[:5])}\n\n"
                "This ticket is a draft and requires triage before being assigned."
            ),
            "payload": {
                "health_score": health,
                "listing_quality_score": lq_score,
                "priority": "P1" if health < 50 else "P2",
                "risk_summary": risk_summary,
                "approval_required": True,
            },
            "evidence_ids": ticket_evidence or all_evidence[:5],
        })

    return drafts
