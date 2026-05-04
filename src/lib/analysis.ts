import { IssueTrend, Review, BrandRiskScore, Marketplace, Language } from "@/lib/schema";

export interface PeriodAnalysis {
  reviews: Review[];
  total: number;
  negativeCount: number;
  negativeRate: number;
  avgRating: number;
  themeCounts: Record<string, number>;
  themeShares: Record<string, number>;
  reviewsByMarketplace: Record<Marketplace, number>;
  reviewsByLanguage: Record<Language, number>;
}

export function analyzePeriod(reviews: Review[]): PeriodAnalysis {
  const total = reviews.length;
  const negativeCount = reviews.filter((r) => r.sentiment === "negative").length;
  const negativeRate = total > 0 ? negativeCount / total : 0;
  const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

  const themeCounts: Record<string, number> = {};
  const reviewsByMarketplace: Record<string, number> = {};
  const reviewsByLanguage: Record<string, number> = {};

  for (const r of reviews) {
    for (const tid of r.theme_ids) {
      themeCounts[tid] = (themeCounts[tid] ?? 0) + 1;
    }
    reviewsByMarketplace[r.marketplace] = (reviewsByMarketplace[r.marketplace] ?? 0) + 1;
    reviewsByLanguage[r.language] = (reviewsByLanguage[r.language] ?? 0) + 1;
  }

  const themeShares: Record<string, number> = {};
  for (const [tid, count] of Object.entries(themeCounts)) {
    themeShares[tid] = total > 0 ? count / total : 0;
  }

  return {
    reviews,
    total,
    negativeCount,
    negativeRate,
    avgRating,
    themeCounts,
    themeShares,
    reviewsByMarketplace: reviewsByMarketplace as Record<Marketplace, number>,
    reviewsByLanguage: reviewsByLanguage as Record<Language, number>,
  };
}

export interface SpikeResult {
  themeId: string;
  baselineShare: number;
  currentShare: number;
  delta: number;
  relativeChange: number;
  affectedReviews: Review[];
  confidence: number;
  estimatedOrderExposure: number;
  estimatedGmvExposure: number;
  affectedMarketplaces: Marketplace[];
  affectedLanguages: Language[];
}

export function detectSpikes(
  baseline: PeriodAnalysis,
  current: PeriodAnalysis,
  options: { minBaselineAbsolute?: number; minDelta?: number } = {}
): SpikeResult[] {
  const { minBaselineAbsolute = 0, minDelta = 0.02 } = options;
  const allThemeIds = new Set([...Object.keys(baseline.themeShares), ...Object.keys(current.themeShares)]);
  const spikes: SpikeResult[] = [];

  for (const themeId of allThemeIds) {
    const baselineShare = baseline.themeShares[themeId] ?? 0;
    const currentShare = current.themeShares[themeId] ?? 0;
    if (baselineShare < minBaselineAbsolute) continue;
    const delta = currentShare - baselineShare;
    if (delta < minDelta) continue;

    // Confidence based on sample size and delta magnitude
    const affected = current.reviews.filter((r) => r.theme_ids.includes(themeId));
    const confidence = Math.min(1, affected.length / 5 + delta * 5);

    const affectedMarketplaces = Array.from(
      new Set(affected.map((r) => r.marketplace))
    ) as Marketplace[];
    const affectedLanguages = Array.from(
      new Set(affected.map((r) => r.language))
    ) as Language[];

    spikes.push({
      themeId,
      baselineShare,
      currentShare,
      delta,
      relativeChange: baselineShare > 0 ? currentShare / baselineShare : currentShare > 0 ? Infinity : 1,
      affectedReviews: affected,
      confidence,
      estimatedOrderExposure: affected.length * 3, // heuristic: each review ~3 orders
      estimatedGmvExposure: affected.length * 3 * 30, // ~$30 avg order
      affectedMarketplaces,
      affectedLanguages,
    });
  }

  return spikes.sort((a, b) => b.delta - a.delta);
}

/**
 * Brand Risk Score (0-100)
 * Formula (documented and deterministic):
 * 1. Negative review rate contribution: rate * 40
 * 2. Rating trend delta: if avg dropped >0.5, add 15
 * 3. Issue spike severity: top spike delta * 200 (max 20)
 * 4. Review volume factor: log10(total reviews) * 3 (max 10)
 * 5. Marketplace concentration: if >60% negative from 1 marketplace, add 5
 * 6. Estimated order exposure: exposure / 100 (max 10)
 * 7. Warranty intent: warranty theme share * 50 (max 10)
 * Sum is capped at 100.
 */
export function computeBrandRiskScore(
  baseline: PeriodAnalysis,
  current: PeriodAnalysis,
  spikes: SpikeResult[]
): BrandRiskScore {
  const negativeReviewRate = current.negativeRate * 40;
  const ratingTrendDelta = baseline.avgRating - current.avgRating > 0.5 ? 15 : 0;

  const topSpike = spikes[0];
  const issueSpikeSeverity = topSpike ? Math.min(20, topSpike.delta * 200) : 0;

  const volumeFactor = Math.min(10, Math.log10(Math.max(1, current.total)) * 3);

  const negByMarket = Object.entries(current.reviewsByMarketplace).map(([m, total]) => {
    const neg = current.reviews.filter((r) => r.marketplace === m && r.sentiment === "negative").length;
    return neg / Math.max(1, total);
  });
  const marketplaceConcentration = negByMarket.some((r) => r > 0.6) ? 5 : 0;

  const totalExposure = spikes.reduce((sum, s) => sum + s.estimatedOrderExposure, 0);
  const orderExposureFactor = Math.min(10, totalExposure / 100);

  const warrantyShare = current.themeShares["theme_warranty_support"] ?? 0;
  const warrantyIntentFactor = Math.min(10, warrantyShare * 50);

  const score = Math.min(
    100,
    Math.round(
      negativeReviewRate +
        ratingTrendDelta +
        issueSpikeSeverity +
        volumeFactor +
        marketplaceConcentration +
        orderExposureFactor +
        warrantyIntentFactor
    )
  );

  return {
    score,
    breakdown: {
      negative_review_rate: Math.round(negativeReviewRate * 10) / 10,
      rating_trend_delta: ratingTrendDelta,
      issue_spike_severity: Math.round(issueSpikeSeverity * 10) / 10,
      review_volume_factor: Math.round(volumeFactor * 10) / 10,
      marketplace_concentration: marketplaceConcentration,
      estimated_order_exposure: Math.round(orderExposureFactor * 10) / 10,
      warranty_intent_factor: Math.round(warrantyIntentFactor * 10) / 10,
    },
  };
}

// Precomputed seeded IssueTrend for the demo
export function buildIssueTrendFromSpike(
  productId: string,
  spike: SpikeResult,
  baselineStart: string,
  baselineEnd: string,
  currentStart: string,
  currentEnd: string
): IssueTrend {
  return {
    id: `trend_${spike.themeId}`,
    product_id: productId,
    theme_id: spike.themeId,
    current_period: { start: currentStart, end: currentEnd },
    baseline_period: { start: baselineStart, end: baselineEnd },
    current_share: spike.currentShare,
    baseline_share: spike.baselineShare,
    delta: spike.delta,
    relative_change: spike.relativeChange,
    affected_review_ids: spike.affectedReviews.map((r) => r.id),
    confidence: spike.confidence,
    estimated_order_exposure: spike.estimatedOrderExposure,
    estimated_gmv_exposure: spike.estimatedGmvExposure,
    affected_marketplaces: spike.affectedMarketplaces,
    affected_languages: spike.affectedLanguages,
  };
}
