import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge, ProgressBar } from "@/components/SharedUI";
import { getThemeById } from "@/data/themes";
import { TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

export default function IssueTrendsPage() {
  const { issueTrends, baseline, current, weeklyBrief } = demoData;

  // Isolate the handle-breakage spike
  const handleTrend = issueTrends.find((t) => t.theme_id === "theme_handle_breakage") ?? issueTrends[0];
  const handleTheme = handleTrend ? getThemeById(handleTrend.theme_id) : null;

  // Representative multilingual reviews for handle breakage
  const repReviews = handleTrend
    ? demoData.allReviews
        .filter((r) => handleTrend.affected_review_ids.includes(r.id))
        .sort((a, b) => {
          const order: Record<string, number> = { en: 0, hi: 1, ar: 2, id: 3 };
          return (order[a.language] ?? 99) - (order[b.language] ?? 99);
        })
    : [];

  const langLabel: Record<string, string> = { en: "English", hi: "Hindi/Hinglish", ar: "Arabic", id: "Bahasa" };
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedTrends = [...issueTrends].sort((a, b) => {
    const sa = severityRank[getThemeById(a.theme_id)?.severity ?? "medium"];
    const sb = severityRank[getThemeById(b.theme_id)?.severity ?? "medium"];
    return sa - sb || b.delta - a.delta;
  });

  const nextAction = weeklyBrief?.recommended_actions?.[0];

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        {/* ===== HERO: Spike Proof ===== */}
        <Card className="border-red-200">
          <CardHeader
            title="Critical Spike Detected"
            subtitle="Handle Breakage share jumped in the current period"
            action={<Badge variant="danger">CRITICAL</Badge>}
          />
          <CardBody>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Big numbers */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-700">{(handleTrend.baseline_share * 100).toFixed(0)}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Baseline</div>
                </div>
                <div className="text-slate-400">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{(handleTrend.current_share * 100).toFixed(0)}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Current</div>
                </div>
                <div className="text-center px-3 py-1 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm font-bold text-red-700">+{(handleTrend.delta * 100).toFixed(0)}pp</div>
                  <div className="text-[10px] text-red-600 uppercase tracking-wide">Delta</div>
                </div>
              </div>

              {/* Visual bars */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Baseline share</span>
                    <span className="text-slate-500">{(handleTrend.baseline_share * 100).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={handleTrend.baseline_share} max={0.2} color="bg-slate-400" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-800 font-medium">Current share</span>
                    <span className="text-red-600 font-semibold">{(handleTrend.current_share * 100).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={handleTrend.current_share} max={0.2} color="bg-red-500" />
                </div>
              </div>
            </div>

            {/* Affected marketplaces */}
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="text-slate-500">Concentrated on:</span>
              {handleTrend.affected_marketplaces.map((m) => (
                <Badge key={m} variant={m === "noon_uae" || m === "amazon_in" ? "danger" : "neutral"}>
                  {m.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* ===== EVIDENCE PANEL ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardBody className="text-center space-y-1">
              <div className="text-lg font-bold text-slate-800">{handleTrend.affected_review_ids.length}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Reviews</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center space-y-1">
              <div className="flex justify-center gap-1">
                {handleTrend.affected_languages.map((l) => (
                  <Badge key={l} variant="info">{langLabel[l] ?? l}</Badge>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Languages</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center space-y-1">
              <div className="flex justify-center gap-1">
                {handleTrend.affected_marketplaces.map((m) => (
                  <Badge key={m} variant="neutral">{m.replace("_", " ")}</Badge>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Marketplaces</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center space-y-1">
              <div className="text-xs font-semibold text-slate-700">Oct 1–31</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Baseline</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center space-y-1">
              <div className="text-xs font-semibold text-slate-700">Nov 1–7</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Current</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center space-y-1">
              <div className="text-lg font-bold text-emerald-700">{(handleTrend.confidence * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Confidence</div>
            </CardBody>
          </Card>
        </div>

        {/* ===== REPRESENTATIVE REVIEWS ===== */}
        {repReviews.length > 0 && (
          <Card>
            <CardHeader
              title="Representative Evidence"
              subtitle={`${handleTheme?.label} — multilingual samples from affected marketplaces`}
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {repReviews.map((review) => (
                  <div key={review.id} className="border border-slate-200 rounded-md p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{langLabel[review.language]}</Badge>
                        <Badge variant={review.marketplace === "noon_uae" || review.marketplace === "amazon_in" ? "danger" : "neutral"}>
                          {review.marketplace.replace("_", " ")}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400">{review.date}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mb-1">{review.title}</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{review.body}</div>
                    {review.normalized_summary && review.language !== "en" && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 italic">
                        EN: {review.normalized_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* ===== NEXT ACTION ===== */}
        {nextAction && (
          <Card className="border-amber-200">
            <CardHeader
              title="Recommended Next Action"
              subtitle={`Priority: ${nextAction.priority.toUpperCase()} · ${nextAction.function}`}
              action={<AlertTriangle className="w-4 h-4 text-amber-600" />}
            />
            <CardBody className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">{nextAction.title}</div>
              <div className="text-xs text-slate-600 leading-relaxed">{nextAction.description}</div>
              <div className="pt-2">
                <button className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded transition-colors">
                  Initiate escalation
                </button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ===== FULL THEME TABLE ===== */}
        <Card>
          <CardHeader
            title="Emerging Issue Detection"
            subtitle="Comparing current period (Nov 1–7) vs baseline (Oct 1–31)"
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-600">Theme</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Baseline</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Current</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Delta</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Change</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Reviews</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-600">Marketplaces</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-600">Languages</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTrends.map((trend, idx) => {
                    const theme = getThemeById(trend.theme_id);
                    const isTop = idx === 0;
                    return (
                      <tr
                        key={trend.id}
                        className={`border-b border-slate-50 hover:bg-slate-50 ${isTop ? "bg-red-50/40" : ""}`}
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            {isTop && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                            <div>
                              <div className="font-medium text-slate-800">{theme?.label ?? trend.theme_id}</div>
                              <div className="text-slate-400 capitalize">{theme?.severity}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 text-slate-600">{(trend.baseline_share * 100).toFixed(0)}%</td>
                        <td className="text-right py-2 px-2 font-semibold text-slate-800">{(trend.current_share * 100).toFixed(0)}%</td>
                        <td className="text-right py-2 px-2 text-red-600 font-semibold">+{(trend.delta * 100).toFixed(0)}pp</td>
                        <td className="text-right py-2 px-2 text-slate-600">
                          {trend.relative_change === Infinity ? "New" : `${trend.relative_change.toFixed(1)}x`}
                        </td>
                        <td className="text-right py-2 px-2 text-slate-600">{trend.affected_review_ids.length}</td>
                        <td className="py-2 px-2">
                          <div className="flex flex-wrap gap-1">
                            {trend.affected_marketplaces.map((m) => (
                              <Badge key={m} variant="neutral">{m.replace("_", " ")}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex flex-wrap gap-1">
                            {trend.affected_languages.map((l) => {
                              const map: Record<string, string> = { en: "EN", hi: "HI", ar: "AR", id: "ID" };
                              return <Badge key={l} variant="info">{map[l] ?? l}</Badge>;
                            })}
                          </div>
                        </td>
                        <td className="text-right py-2 px-2">
                          <Badge variant={trend.confidence > 0.8 ? "success" : "warning"}>
                            {(trend.confidence * 100).toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedTrends.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-4 text-center text-slate-400">
                        No emerging issues detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* ===== PERIOD STATS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Baseline Period" subtitle="Oct 1–31" />
            <CardBody className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total reviews</span><span className="font-medium">{baseline.total}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Negative rate</span><span className="font-medium">{(baseline.negativeRate * 100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Avg rating</span><span className="font-medium">{baseline.avgRating.toFixed(1)}</span></div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Current Period" subtitle="Nov 1–7" />
            <CardBody className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total reviews</span><span className="font-medium">{current.total}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Negative rate</span><span className="font-medium">{(current.negativeRate * 100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Avg rating</span><span className="font-medium">{current.avgRating.toFixed(1)}</span></div>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
