import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge } from "@/components/SharedUI";
import { getThemeById } from "@/data/themes";

export default function IssueTrendsPage() {
  const { issueTrends, baseline, current } = demoData;

  // Get representative multilingual reviews for the top issue
  const topIssue = issueTrends[0];
  const topTheme = topIssue ? getThemeById(topIssue.theme_id) : null;
  const repReviews = topIssue
    ? demoData.allReviews
        .filter((r) => topIssue.affected_review_ids.includes(r.id))
        .slice(0, 6)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        {/* Spike summary */}
        <Card>
          <CardHeader
            title="Emerging Issue Detection"
            subtitle="Comparing current period (Nov 1-7) vs baseline (Oct 1-31)"
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
                  {issueTrends.map((trend) => {
                    const theme = getThemeById(trend.theme_id);
                    return (
                      <tr key={trend.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-2">
                          <div className="font-medium text-slate-800">{theme?.label ?? trend.theme_id}</div>
                          <div className="text-slate-400">{theme?.severity}</div>
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
                  {issueTrends.length === 0 && (
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

        {/* Multilingual evidence */}
        {topIssue && (
          <Card>
            <CardHeader
              title="Representative Evidence"
              subtitle={`${topTheme?.label} — ${repReviews.length} samples across languages`}
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {repReviews.map((review) => {
                  const langLabel: Record<string, string> = { en: "English", hi: "Hindi/Hinglish", ar: "Arabic", id: "Bahasa" };
                  return (
                    <div key={review.id} className="border border-slate-200 rounded-md p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="info">{langLabel[review.language]}</Badge>
                          <Badge variant="neutral">{review.marketplace.replace("_", " ")}</Badge>
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
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Period stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Baseline Period" subtitle="Oct 1-31" />
            <CardBody className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total reviews</span><span className="font-medium">{baseline.total}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Negative rate</span><span className="font-medium">{(baseline.negativeRate * 100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Avg rating</span><span className="font-medium">{baseline.avgRating.toFixed(1)}</span></div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Current Period" subtitle="Nov 1-7" />
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
