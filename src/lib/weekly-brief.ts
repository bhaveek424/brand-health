import { WeeklyBrief, Brand, Product, IssueTrend, Theme, ActionItem, RiskItem } from "@/lib/schema";

export function generateWeeklyBrief(
  brand: Brand,
  product: Product,
  trends: IssueTrend[],
  themes: Theme[]
): WeeklyBrief {
  const periodStart = "2024-11-01";
  const periodEnd = "2024-11-07";

  const topRisks: RiskItem[] = trends.map((t) => {
    const theme = themes.find((th) => th.id === t.theme_id);
    return {
      theme_id: t.theme_id,
      title: theme?.label ?? t.theme_id,
      severity: theme?.severity ?? "medium",
      evidence_summary: `${(t.current_share * 100).toFixed(0)}% of recent reviews (${t.affected_review_ids.length} reviews). Baseline was ${(t.baseline_share * 100).toFixed(0)}%.`,
      affected_marketplaces: t.affected_marketplaces,
      estimated_exposure_orders: t.estimated_order_exposure,
    };
  });

  const actions: ActionItem[] = [
    {
      function: "category",
      title: "Investigate handle quality batch",
      description: "Handle breakage on Tower 24cm pan spiked from 2% to 12%. Escalate to supplier QA immediately and inspect inventory for visible handle weld defects.",
      priority: "urgent",
    },
    {
      function: "support",
      title: "Prepare proactive outreach",
      description: "Draft proactive support emails for customers who purchased Tower 24cm pan on Noon UAE and Amazon India in the last 30 days, offering inspection guide and replacement if needed.",
      priority: "high",
    },
    {
      function: "marketplace",
      title: "Pause new inventory on Noon UAE",
      description: "Temporarily pause inbound stock to Noon UAE until batch investigation complete. Update listing FAQ with handle care instructions.",
      priority: "high",
    },
    {
      function: "supplier",
      title: "Request 8D report from factory",
      description: "Request root-cause analysis (8D) from handle sub-supplier. Include photos from affected reviews and demand corrective action plan within 5 business days.",
      priority: "urgent",
    },
    {
      function: "warranty",
      title: "Fast-track handle claims",
      description: "Flag all warranty claims mentioning 'handle' for instant replacement. Do not require return shipping for handle-only failures.",
      priority: "high",
    },
  ];

  const executiveSummary =
    `Tower 24cm pan Brand Risk Score is elevated due to a handle-breakage spike from ${(trends[0]?.baseline_share * 100).toFixed(0)}% to ${(trends[0]?.current_share * 100).toFixed(0)}%, concentrated on Noon UAE and Amazon India. ${topRisks.reduce((sum, r) => sum + r.estimated_exposure_orders, 0)} orders may be exposed. Immediate supplier QA and support outreach are recommended.`;

  const topTrend = trends[0];
  const evidenceCount = topTrend?.affected_review_ids.length ?? 0;

  const supplierEscalation = `SUPPLIER ESCALATION — Tower 24cm Pan Handle Breakage

To: Handle Sub-Supplier
CC: Tower Category Management

Issue: Handle breakage complaints spiked from ${(topTrend?.baseline_share * 100).toFixed(0)}% to ${(topTrend?.current_share * 100).toFixed(0)}% of reviews in the current period.
Affected Batch: Tower 24cm pan (SKU: TWR-24CM-FRY) sold on Noon UAE and Amazon India.
Evidence: ${evidenceCount} customer reviews report broken, detached, or cracked handles. ${Math.min(3, evidenceCount)} mention safety hazards (hot oil spill).

Required Actions:
1. Provide 8D root-cause analysis within 5 business days.
2. Inspect current inventory for handle-weld or material defects.
3. Confirm corrective action and containment plan.
4. Share test-results for handle load-bearing per Tower spec.

Next Review: 2024-11-14

— Tower Category Management`;

  return {
    id: `brief_${brand.id}_${periodStart}`,
    brand_id: brand.id,
    product_id: product.id,
    period: { start: periodStart, end: periodEnd },
    executive_summary: executiveSummary,
    top_risks: topRisks,
    recommended_actions: actions,
    supplier_escalation_draft: supplierEscalation,
    marketplace_listing_recommendation: "Update the Tower 24cm pan listing FAQ to include a handle care note ('Do not lift pan by handle when full'). Temporarily pause new stock to Noon UAE until investigation is complete.",
    support_warranty_recommendation: "Fast-track all warranty claims with 'handle' mention for instant replacement. Draft proactive support emails for recent purchasers on affected marketplaces.",
    generated_at: new Date().toISOString(),
  };
}
