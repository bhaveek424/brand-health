import { allReviews, baselineReviews, currentReviews } from "@/data/reviews";
import { towerBrand } from "@/data/brands";
import { getDefaultDemoProduct, towerProducts } from "@/data/products";
import { themes } from "@/data/themes";
import {
  analyzePeriod,
  detectSpikes,
  computeBrandRiskScore,
  buildIssueTrendFromSpike,
} from "@/lib/analysis";
import { generateWeeklyBrief } from "@/lib/weekly-brief";
import { draftResponse } from "@/lib/drafting";
import { IssueTrend, DraftResponse, WeeklyBrief, BrandRiskScore } from "@/lib/schema";

const product = getDefaultDemoProduct();
const productReviews = allReviews.filter((r) => r.product_id === product.id);

export const demoBaseline = analyzePeriod(baselineReviews);
export const demoCurrent = analyzePeriod(currentReviews);
export const demoSpikes = detectSpikes(demoBaseline, demoCurrent, { minDelta: 0.01 });

export const demoIssueTrends: IssueTrend[] = demoSpikes.map((s) =>
  buildIssueTrendFromSpike(product.id, s, "2024-10-01", "2024-10-31", "2024-11-01", "2024-11-07")
);

export const demoRiskScore: BrandRiskScore = computeBrandRiskScore(demoBaseline, demoCurrent, demoSpikes);

export const demoDraftResponses: DraftResponse[] = (() => {
  // Prioritize current-period negative reviews for the top handle-breakage spike
  const handleThemeId = "theme_handle_breakage";

  // Current-period handle-breakage reviews first (the spike story)
  const spikeReviews = currentReviews
    .filter((r) => r.sentiment === "negative" && r.theme_ids.includes(handleThemeId))
    .sort((a, b) => {
      // Order: English, Hindi/Hinglish, Arabic for the demo narrative
      const order: Record<string, number> = { en: 0, hi: 1, ar: 2, id: 3 };
      return (order[a.language] ?? 99) - (order[b.language] ?? 99);
    });

  // Fill remaining slots with other current-period negatives
  const otherCurrentNegatives = currentReviews
    .filter((r) => r.sentiment === "negative" && !r.theme_ids.includes(handleThemeId));

  // Then baseline negatives if needed
  const baselineNegatives = baselineReviews
    .filter((r) => r.sentiment === "negative");

  const selected = [...spikeReviews, ...otherCurrentNegatives, ...baselineNegatives].slice(0, 8);

  return selected.map((r) => {
    const themeId = r.theme_ids.find((tid) => tid === handleThemeId) ?? r.theme_ids[0] ?? handleThemeId;
    const theme = themes.find((t) => t.id === themeId);
    return draftResponse(r, theme?.label ?? "Issue");
  });
})();

export const demoWeeklyBrief: WeeklyBrief = generateWeeklyBrief(
  towerBrand,
  product,
  demoIssueTrends,
  themes
);

export const demoData = {
  brand: towerBrand,
  product,
  products: towerProducts,
  themes,
  allReviews: productReviews,
  baseline: demoBaseline,
  current: demoCurrent,
  spikes: demoSpikes,
  issueTrends: demoIssueTrends,
  riskScore: demoRiskScore,
  draftResponses: demoDraftResponses,
  weeklyBrief: demoWeeklyBrief,
};
