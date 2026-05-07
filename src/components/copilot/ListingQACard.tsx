"use client";

import { z } from "zod";

export const listingQACardPropsSchema = z.object({
  run_id: z.string().describe("The run ID"),
  score: z.number().describe("Listing quality score 0–100"),
  findings: z
    .array(
      z.object({
        field: z.string(),
        status: z.enum(["pass", "warning", "fail"]),
        note: z.string(),
      })
    )
    .describe("Per-field listing quality findings"),
});

export type ListingQACardProps = z.infer<typeof listingQACardPropsSchema>;

const STATUS_STYLES = {
  pass: {
    row: "border-emerald-100 bg-emerald-50",
    badge: "text-emerald-700 border-emerald-200 bg-emerald-50",
    icon: "✓",
  },
  warning: {
    row: "border-amber-100 bg-amber-50",
    badge: "text-amber-700 border-amber-200 bg-amber-50",
    icon: "⚠",
  },
  fail: {
    row: "border-red-100 bg-red-50",
    badge: "text-red-700 border-red-200 bg-red-50",
    icon: "✗",
  },
};

export function ListingQACard(props: ListingQACardProps) {
  const { score, findings } = props;
  const scoreColor = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-red-600";

  return (
    <div className="rounded-lg border border-violet-200 bg-white shadow-sm text-sm w-full">
      <div className="px-3 py-2 border-b border-violet-100 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Listing QA</span>
        <span className={`text-base font-bold ${scoreColor}`}>
          {score}<span className="text-xs font-normal text-slate-400">/100</span>
        </span>
      </div>
      {findings.length === 0 ? (
        <div className="px-3 py-2 text-xs text-slate-400 italic">No findings available.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {findings.map((f, i) => {
            const s = STATUS_STYLES[f.status];
            return (
              <div key={i} className={`px-3 py-2 flex gap-2 items-start ${s.row}`}>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border shrink-0 ${s.badge}`}>
                  {s.icon} {f.field}
                </span>
                <span className="text-xs text-slate-600 leading-relaxed">{f.note}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
