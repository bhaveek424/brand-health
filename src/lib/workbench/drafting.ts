import { NormalizedReview } from "./normalizer";
import { WorkbenchAnalysis } from "./analysis";

export interface ActionDrafts {
  customerReplies: { sku: string; reviewIndex: number; text: string }[];
  supplierNote: string;
  slackSummary: string;
  listingRecommendations: string[];
  actionBrief: string;
}

export function generateActionDrafts(
  reviews: NormalizedReview[],
  analysis: WorkbenchAnalysis
): ActionDrafts {
  const customerReplies: ActionDrafts["customerReplies"] = [];

  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    if (r.sentiment === "negative") {
      const text = buildReply(r);
      customerReplies.push({ sku: r.sku, reviewIndex: i, text });
    }
  }

  const supplierNote = buildSupplierNote(analysis);
  const slackSummary = buildSlackSummary(reviews, analysis);
  const listingRecommendations = buildListingRecommendations(analysis);
  const actionBrief = buildActionBrief(reviews, analysis);

  return { customerReplies, supplierNote, slackSummary, listingRecommendations, actionBrief };
}

function buildReply(r: NormalizedReview): string {
  const issue = detectIssue(r.review);
  return `Hi, we are sorry to hear about the ${issue} you experienced with ${r.product_name}. Your feedback matters. Please contact support@towercookware.com with your order ID and a photo so we can assist. —Team Tower`;
}

function detectIssue(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("handle")) return "handle issue";
  if (lower.includes("coating") || lower.includes("stick")) return "coating issue";
  if (lower.includes("package") || lower.includes("box")) return "packaging";
  if (lower.includes("delay") || lower.includes("late")) return "delivery delay";
  return "issue";
}

function buildSupplierNote(analysis: WorkbenchAnalysis): string {
  const top = analysis.topThemes[0];
  if (!top) return "No significant issues detected.";
  return `Supplier Escalation\n==================\nTop issue: ${top.label}\nMentioned in ${Math.round(top.share * 100)}% of reviews.\n\nEvidence samples:\n${top.evidence.map((e) => "- " + e).join("\n")}\n\nPlease investigate root cause and share CAPA plan.`;
}

function buildSlackSummary(reviews: NormalizedReview[], analysis: WorkbenchAnalysis): string {
  const negCount = analysis.sentimentSplit.negative ?? 0;
  const posCount = analysis.sentimentSplit.positive ?? 0;
  return `📊 Weekly Review Summary\nTotal reviews processed: ${reviews.length}\nPositive: ${posCount} | Negative: ${negCount}\n\nTop theme: ${analysis.topThemes[0]?.label ?? "None"}\n\nAction: Review supplier note and customer reply drafts in workbench.`;
}

function buildListingRecommendations(analysis: WorkbenchAnalysis): string[] {
  const recs: string[] = [];
  for (const t of analysis.topThemes) {
    if (t.label.includes("Handle")) recs.push("Add handle-care instructions to listing images.");
    if (t.label.includes("Coating")) recs.push("Update bullet points with coating-care guidance and warranty clarity.");
    if (t.label.includes("Packaging")) recs.push('Add "fragile handle" warning to packaging requirements.');
    if (t.label.includes("Color")) recs.push("Clarify color variants with SKU-specific images.");
    if (t.label.includes("Delay")) recs.push("Set realistic delivery expectations in listing.");
  }
  return recs.length > 0 ? [...new Set(recs)] : ["No listing changes needed."];
}

function buildActionBrief(reviews: NormalizedReview[], analysis: WorkbenchAnalysis): string {
  const top = analysis.topThemes[0];
  return `Action Brief\n============\nProcessed ${reviews.length} rows.\nTop risk: ${top?.label ?? "None"} (${Math.round((top?.share ?? 0) * 100)}%).\n\nNext steps:\n1. Approve customer reply drafts.\n2. Send supplier escalation note.\n3. Queue listing updates.\n4. Monitor next batch.`;
}
