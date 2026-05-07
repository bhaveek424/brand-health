"use client";

import { z } from "zod";

export const runStatusCardPropsSchema = z.object({
  run_id: z.string().describe("The run ID"),
  status: z.string().describe("Current run status"),
  input_url: z.string().describe("Product URL for this run"),
  event_count: z.number().describe("Total number of workflow events"),
  events: z
    .array(
      z.object({
        event_type: z.string(),
        created_at: z.string(),
      })
    )
    .describe("Recent workflow events (up to 5)"),
});

export type RunStatusCardProps = z.infer<typeof runStatusCardPropsSchema>;

const STATUS_COLORS: Record<string, string> = {
  created: "bg-sky-50 text-sky-700 border-sky-200",
  running: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export function RunStatusCard({ run_id, status, input_url, event_count, events }: RunStatusCardProps) {
  const statusColor = STATUS_COLORS[status] ?? "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm text-sm w-full">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 truncate">Run Status</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${statusColor}`}>
          {status}
        </span>
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs text-slate-500 font-mono truncate" title={run_id}>
          ID: {run_id.slice(0, 8)}…
        </div>
        <div className="text-xs text-slate-600 truncate" title={input_url}>
          {input_url}
        </div>
        {events.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-xs font-medium text-slate-500">
              Recent events ({event_count} total)
            </div>
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-xs text-slate-700 font-mono">{e.event_type}</span>
                <span className="text-xs text-slate-400 ml-auto shrink-0">
                  {new Date(e.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
