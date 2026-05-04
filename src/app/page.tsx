import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge, ScoreRing, ProgressBar } from "@/components/SharedUI";
import { Marketplace } from "@/lib/schema";
import { allReviews } from "@/data/reviews";

export default function BrandHealthPage() {
  const { product, current, baseline, riskScore, spikes } = demoData;

  const ratingDelta = current.avgRating - baseline.avgRating;
  const totalReviews = allReviews.filter((r) => r.product_id === product.id).length;

  const topSpike = spikes[0];

  // Warranty exposure from current period negative reviews mentioning warranty
  const warrantyReviews = current.reviews.filter(
    (r) => r.sentiment === "negative" && r.theme_ids.includes("theme_warranty_support")
  );
  const aov = product.estimated_gmv / Math.max(1, product.estimated_recent_orders);
  const warrantyOrderExposure = warrantyReviews.length * 3;
  const warrantyGmvExposure = warrantyOrderExposure * aov;

  const marketplaceBreakdown = Object.entries(current.reviewsByMarketplace).sort((a, b) => b[1] - a[1]);

  const riskLabel =
    riskScore.score >= 60 ? "ELEVATED RISK" : riskScore.score >= 40 ? "MODERATE RISK" : "LOW RISK";
  const riskBadge: "danger" | "warning" | "success" =
    riskScore.score >= 60 ? "danger" : riskScore.score >= 40 ? "warning" : "success";

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        {/* Row 1 — Risk Score + Top Issue (above the fold) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader title="Brand Risk Score" subtitle="0–100 heuristic: reviews, spikes, exposure, warranty" />
            <CardBody>
              <div className="flex items-center gap-6">
                <ScoreRing score={riskScore.score} size={96} />
                <div className="space-y-1.5 text-xs">
                  <Badge variant={riskBadge}>{riskLabel}</Badge>
                  <div className="text-base font-bold text-slate-800">{product.name}</div>
                  <div className="text-[11px] text-slate-500">SKU: {product.sku}</div>
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">Negative rate</span>
                      <span className="font-medium text-slate-700">{(current.negativeRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">Avg rating</span>
                      <span className="font-medium text-slate-700">
                        {current.avgRating.toFixed(1)} {ratingDelta < 0 ? "↓" : "↑"} {Math.abs(ratingDelta).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">Issue spike</span>
                      <span className="font-medium text-slate-700">{(topSpike?.delta ?? 0) * 100 >= 8 ? "CRITICAL" : "HIGH"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-red-600">
            <CardHeader
              title="Top High-Risk Issue"
              subtitle="Highest spike detected this period"
              action={topSpike && <Badge variant="danger">{topSpike.delta > 0.08 ? "CRITICAL" : "HIGH"}</Badge>}
            />
            <CardBody>
              {topSpike ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-slate-900 leading-tight">Handle Breakage</div>
                  <div className="text-sm text-slate-700">
                    Spiked from <span className="font-semibold text-slate-900">{(topSpike.baselineShare * 100).toFixed(0)}%</span> to{" "}
                    <span className="font-semibold text-red-700">{(topSpike.currentShare * 100).toFixed(0)}%</span> —{" "}
                    <span className="font-semibold text-slate-900">{topSpike.affectedReviews.length} reviews</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Concentrated on{" "}
                    <span className="font-medium text-amber-700">
                      {topSpike.affectedMarketplaces.map((m) => m.replace("_", " ")).join(", ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-red-50 border border-red-100 rounded p-3 text-center">
                      <div className="text-lg font-bold text-red-700">{topSpike.estimatedOrderExposure.toLocaleString()}</div>
                      <div className="text-[10px] text-red-600 uppercase tracking-wide font-semibold mt-0.5">Exposed orders</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded p-3 text-center">
                      <div className="text-lg font-bold text-red-700">${(topSpike.estimatedGmvExposure / 1000).toFixed(1)}k</div>
                      <div className="text-[10px] text-red-600 uppercase tracking-wide font-semibold mt-0.5">Exposed GMV</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No significant spikes detected.</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Row 2 — Review metrics + Marketplace concentration + Warranty exposure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader title="Marketplace Concentration" subtitle="Review distribution + handle-breakage hotspots" />
            <CardBody>
              <div className="space-y-2">
                {marketplaceBreakdown.map(([marketplace, count]) => {
                  const isAffected = topSpike ? topSpike.affectedMarketplaces.includes(marketplace as Marketplace) : false;
                  return (
                    <div key={marketplace} className="flex items-center gap-3">
                      <span className="text-xs w-28 text-slate-600 capitalize">{marketplace.replace("_", " ")}</span>
                      <div className="flex-1">
                        <ProgressBar value={count} max={current.total} color={isAffected ? "bg-amber-500" : "bg-slate-300"} />
                      </div>
                      <span className="text-xs font-medium text-slate-700 w-8 text-right">{count}</span>
                      {isAffected && <Badge variant="warning">CONCENTRATED</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-sky-500">
            <CardHeader title="Warranty Exposure" subtitle="Negative reviews mentioning warranty or returns" />
            <CardBody>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Warranty mentions (current)</span>
                  <span className="font-medium text-slate-700">{warrantyReviews.length}</span>
                </div>
                <ProgressBar value={warrantyReviews.length} max={Math.max(1, current.negativeCount)} color="bg-sky-500" />
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-sky-50 border border-sky-100 rounded p-3 text-center">
                    <div className="text-lg font-bold text-sky-700">{warrantyOrderExposure.toLocaleString()}</div>
                    <div className="text-[10px] text-sky-600 uppercase tracking-wide font-semibold mt-0.5">Est. exposed orders</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 rounded p-3 text-center">
                    <div className="text-lg font-bold text-sky-700">${(warrantyGmvExposure / 1000).toFixed(1)}k</div>
                    <div className="text-[10px] text-sky-600 uppercase tracking-wide font-semibold mt-0.5">Est. exposed GMV</div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Row 3 — Commercial exposure summary */}
        <Card>
          <CardHeader title="Commercial Exposure Summary" subtitle="Based on review-to-order heuristics" />
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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
                  {topSpike?.estimatedOrderExposure ?? 0}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Exposed orders (top issue)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  ${((topSpike?.estimatedGmvExposure ?? 0) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Exposed GMV (top issue)</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-sky-700">{warrantyOrderExposure.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">Warranty exposed orders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-sky-700">${(warrantyGmvExposure / 1000).toFixed(1)}k</div>
                <div className="text-xs text-slate-500 mt-0.5">Warranty exposed GMV</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{(current.negativeRate * 100).toFixed(0)}%</div>
                <div className="text-xs text-slate-500 mt-0.5">Negative review rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{current.avgRating.toFixed(1)}</div>
                <div className="text-xs text-slate-500 mt-0.5">Avg rating</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Row 4 — CTAs into Issue Trends, Response Queue, Weekly Brief */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/issues" className="block group">
            <Card className="group-hover:border-sky-400 group-hover:shadow-sm transition-all h-full">
              <CardBody className="flex items-center justify-between h-full">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800">Issue Trends</div>
                  <div className="text-xs text-slate-500">Review the handle-breakage spike and evidence</div>
                </div>
                <span className="text-sky-600 text-sm font-medium group-hover:translate-x-0.5 transition-transform">→</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/responses" className="block group">
            <Card className="group-hover:border-sky-400 group-hover:shadow-sm transition-all h-full">
              <CardBody className="flex items-center justify-between h-full">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800">Response Queue</div>
                  <div className="text-xs text-slate-500">Approve or edit AI-drafted review replies</div>
                </div>
                <span className="text-sky-600 text-sm font-medium group-hover:translate-x-0.5 transition-transform">→</span>
              </CardBody>
            </Card>
          </Link>

          <Link href="/brief" className="block group">
            <Card className="group-hover:border-sky-400 group-hover:shadow-sm transition-all h-full">
              <CardBody className="flex items-center justify-between h-full">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-slate-800">Weekly Brief</div>
                  <div className="text-xs text-slate-500">Executive summary, risks, and recommended actions</div>
                </div>
                <span className="text-sky-600 text-sm font-medium group-hover:translate-x-0.5 transition-transform">→</span>
              </CardBody>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
