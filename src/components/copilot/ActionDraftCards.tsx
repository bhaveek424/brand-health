"use client";

import { z } from "zod";

export const actionDraftCardsPropsSchema = z.object({
  run_id: z.string().describe("The run ID"),
  drafts: z
    .array(
      z.object({
        id: z.string(),
        draft_type: z.string(),
        target_system: z.string(),
        status: z.enum(["draft", "approved", "simulated_sent"]),
        title: z.string(),
        evidence_ids: z.array(z.string()),
      })
    )
    .describe("Action drafts for this run"),
});

export type ActionDraftCardsProps = z.infer<typeof actionDraftCardsPropsSchema>;

const STATUS_STYLES = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-sky-50 text-sky-700 border-sky-200",
  simulated_sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  draft: "Draft",
  approved: "Approved",
  simulated_sent: "Simulated",
};

const TYPE_LABELS: Record<string, string> = {
  supplier_escalation: "Supplier Escalation",
  listing_update_brief: "Listing Update",
  brand_partner_update: "Brand Partner",
  internal_ops_update: "Internal Ops",
  customer_reply: "Customer Reply",
  ops_ticket: "Ops Ticket",
};

export function ActionDraftCards(props: ActionDraftCardsProps) {
  const { drafts } = props;
  if (drafts.length === 0) {
    return (
      <div className="rounded-lg border border-teal-200 bg-white shadow-sm text-sm w-full">
        <div className="px-3 py-2 border-b border-teal-100">
          <span className="font-semibold text-slate-800">Action Drafts</span>
        </div>
        <div className="px-3 py-2 text-xs text-slate-400 italic">
          No action drafts yet. Run analysis and generate drafts first.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-white shadow-sm text-sm w-full">
      <div className="px-3 py-2 border-b border-teal-100 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Action Drafts</span>
        <span className="text-xs text-slate-500">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {drafts.map((d) => (
          <div key={d.id} className="px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-700">
                {TYPE_LABELS[d.draft_type] ?? d.draft_type}
              </span>
              <span className="text-xs text-slate-400">→ {d.target_system}</span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border capitalize ml-auto ${STATUS_STYLES[d.status]}`}
              >
                {STATUS_LABELS[d.status]}
              </span>
            </div>
            <div className="text-xs text-slate-600 leading-snug">{d.title}</div>
            {d.evidence_ids.length > 0 && (
              <div className="text-xs text-slate-400">
                {d.evidence_ids.length} evidence ref{d.evidence_ids.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
