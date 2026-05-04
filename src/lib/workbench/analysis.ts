import { NormalizedReview } from "./normalizer";

export interface ThemeResult {
  label: string;
  count: number;
  share: number;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string[];
}

export interface WorkbenchAnalysis {
  total: number;
  accepted: number;
  rejected: number;
  ratingDistribution: Record<number, number>;
  sentimentSplit: Record<string, number>;
  productBreakdown: Record<string, number>;
  skuBreakdown: Record<string, number>;
  topThemes: ThemeResult[];
  topRisks: { title: string; severity: ThemeResult["severity"]; description: string }[];
}

const KEYWORD_THEMES: { label: string; keywords: string[]; severity: ThemeResult["severity"] }[] = [
  { label: "Handle Loose / Broken", keywords: ["handle", "loose", "broken", "wobbly", "fall off"], severity: "critical" },
  { label: "Coating Issue", keywords: ["coating", "peel", "chip", "scratch", "non-stick", "stick"], severity: "high" },
  { label: "Packaging Damage", keywords: ["package", "box", "dent", "crush", "wrapping"], severity: "medium" },
  { label: "Wrong Product / Color", keywords: ["wrong", "color", "size", "item", "mismatch"], severity: "medium" },
  { label: "Delivery Delay", keywords: ["delay", "late", "delivery", "shipping", "arrive"], severity: "low" },
  { label: "Warranty / Support", keywords: ["warranty", "support", "service", "customer care", "return"], severity: "high" },
];

export function analyzeWorkbench(reviews: NormalizedReview[]): WorkbenchAnalysis {
  const total = reviews.length;
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sentimentSplit: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  const productBreakdown: Record<string, number> = {};
  const skuBreakdown: Record<string, number> = {};

  for (const r of reviews) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] ?? 0) + 1;
    sentimentSplit[r.sentiment] = (sentimentSplit[r.sentiment] ?? 0) + 1;
    productBreakdown[r.product_name] = (productBreakdown[r.product_name] ?? 0) + 1;
    skuBreakdown[r.sku] = (skuBreakdown[r.sku] ?? 0) + 1;
  }

  const themeCounts: Record<string, { count: number; severity: ThemeResult["severity"]; evidence: string[] }> = {};

  for (const r of reviews) {
    const text = (r.review + " " + r.title).toLowerCase();
    for (const t of KEYWORD_THEMES) {
      const matched = t.keywords.some((k) => text.includes(k));
      if (matched) {
        if (!themeCounts[t.label]) {
          themeCounts[t.label] = { count: 0, severity: t.severity, evidence: [] };
        }
        themeCounts[t.label].count++;
        if (themeCounts[t.label].evidence.length < 3) {
          themeCounts[t.label].evidence.push(r.review.substring(0, 160));
        }
      }
    }
  }

  const topThemes: ThemeResult[] = Object.entries(themeCounts)
    .map(([label, v]) => ({
      label,
      count: v.count,
      share: total > 0 ? v.count / total : 0,
      severity: v.severity,
      evidence: v.evidence,
    }))
    .sort((a, b) => b.count - a.count);

  const topRisks = topThemes.slice(0, 3).map((t) => ({
    title: t.label,
    severity: t.severity,
    description: `${Math.round(t.share * 100)}% of reviews mention ${t.label.toLowerCase()}.`,
  }));

  return {
    total,
    accepted: total,
    rejected: 0,
    ratingDistribution,
    sentimentSplit,
    productBreakdown,
    skuBreakdown,
    topThemes,
    topRisks,
  };
}
