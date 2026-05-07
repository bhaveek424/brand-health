"use client";

import { z } from "zod";

export const riskSummaryCardsPropsSchema = z.object({
  run_id: z.string().describe("The run ID"),
  health_score: z.number().describe("GTM health score 0–100"),
  provider: z.string().describe("Analysis provider (e.g. openai, deterministic_fallback)"),
  top_risks: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["high", "medium", "low"]),
        description: z.string(),
      })
    )
    .describe("Top GTM risks"),
  issue_themes: z
    .array(
      z.object({
        theme: z.string(),
        frequency: z.enum(["high", "medium", "low"]),
        description: z.string(),
      })
    )
    .describe("Recurring issue themes"),
});

export type RiskSummaryCardsProps = z.infer<typeof riskSummaryCardsPropsSchema>;

const SEVERITY_COLORS = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-600";

export function RiskSummaryCards(props: RiskSummaryCardsProps) {
  const { health_score, provider, top_risks, issue_themes } = props;
  const scoreColor = SCORE_COLOR(health_score);
  const isFallback = provider === "deterministic_fallback";

  return (
    <div className="rounded-lg border border-rose-200 bg-white shadow-sm text-sm w-full space-y-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-rose-100 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">GTM Risk Analysis</span>
        <div className="flex items-center gap-2">
          {isFallback && (
            <span className="text-xs text-amber-600 border border-amber-200 bg-amber-50 rounded px-1.5 py-0.5">
              Fallback
            </span>
          )}
          <span className={`text-lg font-bold ${scoreColor}`}>{health_score}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>

      {/* Top risks */}
      {top_risks.length > 0 && (
        <div className="px-3 py-2 space-y-2">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Top Risks</div>
          {top_risks.map((risk, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border capitalize shrink-0 ${SEVERITY_COLORS[risk.severity]}`}
              >
                {risk.severity}
              </span>
              <div>
                <div className="text-xs font-medium text-slate-800">{risk.title}</div>
                <div className="text-xs text-slate-500 leading-relaxed mt-0.5">{risk.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue themes */}
      {issue_themes.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 space-y-1.5">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Issue Themes</div>
          {issue_themes.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border capitalize shrink-0 ${SEVERITY_COLORS[t.frequency]}`}
              >
                {t.frequency}
              </span>
              <div>
                <div className="text-xs font-medium text-slate-700">{t.theme}</div>
                <div className="text-xs text-slate-500">{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
