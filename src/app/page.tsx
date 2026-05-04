import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge, ScoreRing, ProgressBar } from "@/components/SharedUI";
import { allReviews } from "@/data/reviews";

export default function BrandHealthPage() {
  const { product, current, baseline, riskScore } = demoData;

  // Compute rating trend and marketplace breakdown
  const ratingDelta = current.avgRating - baseline.avgRating;
  const totalReviews = allReviews.filter((r) => r.product_id === product.id).length;

  const marketplaceBreakdown = Object.entries(current.reviewsByMarketplace).sort((a, b) => b[1] - a[1]);
  const languageBreakdown = Object.entries(current.reviewsByLanguage).sort((a, b) => b[1] - a[1]);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        {/* Top row: Score + Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader title="Brand Risk Score" subtitle="0-100 heuristic based on reviews, spikes, and exposure" />
            <CardBody>
              <div className="flex items-center gap-4">
                <ScoreRing score={riskScore.score} size={72} />
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Negative rate</span>
                    <span className="font-medium text-slate-700">{riskScore.breakdown.negative_review_rate.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Issue spike</span>
                    <span className="font-medium text-slate-700">{riskScore.breakdown.issue_spike_severity.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Order exposure</span>
                    <span className="font-medium text-slate-700">{riskScore.breakdown.estimated_order_exposure.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Warranty intent</span>
                    <span className="font-medium text-slate-700">{riskScore.breakdown.warranty_intent_factor.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Review Metrics" subtitle="Current period vs baseline" />
            <CardBody className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Negative review rate</span>
                  <span className="font-medium text-slate-700">{(current.negativeRate * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={current.negativeRate} max={0.5} color="bg-red-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Avg rating</span>
                  <span className="font-medium text-slate-700">
                    {current.avgRating.toFixed(1)} {ratingDelta < 0 ? "↓" : "↑"} {Math.abs(ratingDelta).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={current.avgRating} max={5} color="bg-sky-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Total reviews</span>
                  <span className="font-medium text-slate-700">{totalReviews}</span>
                </div>
                <ProgressBar value={totalReviews} max={200} color="bg-slate-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Top Emerging Issue" subtitle="Highest spike detected" />
            <CardBody>
              {demoData.spikes.length > 0 ? (
                <div className="space-y-2">
                  <Badge variant="danger">{demoData.spikes[0].delta > 0.08 ? "CRITICAL" : "HIGH"}</Badge>
                  <div className="text-sm font-semibold text-slate-800">
                    Handle Breakage
                  </div>
                  <div className="text-xs text-slate-500">
                    Spiked from {(demoData.spikes[0].baselineShare * 100).toFixed(0)}% to{" "}
                    {(demoData.spikes[0].currentShare * 100).toFixed(0)}% —{" "}
                    {demoData.spikes[0].affectedReviews.length} reviews
                  </div>
                  <div className="text-xs text-slate-500">
                    Concentrated on{" "}
                    {demoData.spikes[0].affectedMarketplaces.map((m) => m.replace("_", " ")).join(", ")}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No significant spikes detected.</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Marketplace Breakdown" subtitle="Current period review distribution" />
            <CardBody>
              <div className="space-y-2">
                {marketplaceBreakdown.map(([marketplace, count]) => (
                  <div key={marketplace} className="flex items-center gap-3">
                    <span className="text-xs w-28 text-slate-600 capitalize">{marketplace.replace("_", " ")}</span>
                    <div className="flex-1">
                      <ProgressBar value={count} max={current.total} color="bg-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Language Breakdown" subtitle="Reviews by original language" />
            <CardBody>
              <div className="space-y-2">
                {languageBreakdown.map(([lang, count]) => {
                  const labels: Record<string, string> = { en: "English", hi: "Hindi/Hinglish", ar: "Arabic", id: "Bahasa Indonesia" };
                  return (
                    <div key={lang} className="flex items-center gap-3">
                      <span className="text-xs w-32 text-slate-600">{labels[lang] ?? lang}</span>
                      <div className="flex-1">
                        <ProgressBar value={count} max={current.total} color="bg-sky-500" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Bottom row */}
        <Card>
          <CardHeader title="Estimated Exposure" subtitle="Based on review-to-order heuristics" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-800">{product.estimated_recent_orders.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">Est. recent orders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">${(product.estimated_gmv / 1000).toFixed(0)}k</div>
                <div className="text-xs text-slate-500 mt-0.5">Est. GMV (USD)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {demoData.spikes[0]?.estimatedOrderExposure ?? 0}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Exposed orders (top issue)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  ${((demoData.spikes[0]?.estimatedGmvExposure ?? 0) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Exposed GMV (top issue)</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
