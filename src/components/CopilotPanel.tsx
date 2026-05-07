"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import {
  TamboProvider,
  useTambo,
  useTamboThreadInput,
  defineTool,
} from "@tambo-ai/react";
import type { TamboComponent } from "@tambo-ai/react";
import { z } from "zod";
import { BACKEND_URL } from "@/lib/backend";
import { RunStatusCard, runStatusCardPropsSchema } from "@/components/copilot/RunStatusCard";
import { EvidencePackCard, evidencePackCardPropsSchema } from "@/components/copilot/EvidencePackCard";
import { RiskSummaryCards, riskSummaryCardsPropsSchema } from "@/components/copilot/RiskSummaryCards";
import { ListingQACard, listingQACardPropsSchema } from "@/components/copilot/ListingQACard";
import { ActionDraftCards, actionDraftCardsPropsSchema } from "@/components/copilot/ActionDraftCards";

// ---------- shared types ----------

type RunEvent = {
  id: string;
  run_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type Run = {
  id: string;
  product_id: string | null;
  input_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  events: RunEvent[];
};

// ---------- component registry ----------

const COPILOT_COMPONENTS: TamboComponent[] = [
  {
    name: "RunStatusCard",
    description:
      "Shows current run status, workflow phase, and recent timeline events. Use when the user asks about run state or workflow progress.",
    component: RunStatusCard,
    propsSchema: runStatusCardPropsSchema,
  },
  {
    name: "EvidencePackCard",
    description:
      "Shows the extracted product evidence pack: title, brand, price, rating, summary, and chunk count. Use when the user asks about the product or extracted evidence.",
    component: EvidencePackCard,
    propsSchema: evidencePackCardPropsSchema,
  },
  {
    name: "RiskSummaryCards",
    description:
      "Shows GTM health score, top risks with severity, and issue themes. Use when the user asks about risks, GTM health, or analysis results.",
    component: RiskSummaryCards,
    propsSchema: riskSummaryCardsPropsSchema,
  },
  {
    name: "ListingQACard",
    description:
      "Shows listing quality score and per-field pass/warning/fail findings. Use when the user asks about listing quality or content issues.",
    component: ListingQACard,
    propsSchema: listingQACardPropsSchema,
  },
  {
    name: "ActionDraftCards",
    description:
      "Shows approval-mode action drafts (type, target system, status, title). Use when the user asks about actions, drafts, or next steps.",
    component: ActionDraftCards,
    propsSchema: actionDraftCardsPropsSchema,
  },
];

// ---------- props ----------

interface CopilotPanelProps {
  onRunCreated: (run: Run) => void;
  onRunLoaded: (run: Run) => void;
  currentRun: Run | null;
}

// ---------- inner chat component ----------

function CopilotChat({ onRunCreated, onRunLoaded, currentRun }: CopilotPanelProps) {
  const { messages, isStreaming, isWaiting, registerTools } = useTambo();
  const { value, setValue, submit, isPending } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- tools ----

  const tools = useMemo(
    () => [
      // -- createRunFromUrl --
      defineTool({
        name: "createRunFromUrl",
        description:
          "Create a new GTM analysis run from a product URL. Use this when the user provides a product URL and wants to start an analysis.",
        tool: async ({ url }: { url: string }) => {
          if (!/^https?:\/\//i.test(url.trim())) {
            return {
              success: false,
              error: "URL must start with http:// or https://. Please provide a full product URL.",
            };
          }
          try {
            const res = await fetch(`${BACKEND_URL}/runs`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: url.trim() }),
            });
            if (!res.ok) {
              const err = (await res.json()) as { detail?: string };
              return { success: false, error: err.detail || `Error ${res.status}` };
            }
            const run = (await res.json()) as Run;
            onRunCreated(run);
            return { success: true, run_id: run.id, status: run.status, input_url: run.input_url };
          } catch {
            return { success: false, error: "Backend is unreachable. Start the FastAPI backend and try again." };
          }
        },
        inputSchema: z.object({
          url: z.string().describe("The product URL to analyze (must be http/https)"),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          run_id: z.string().optional(),
          status: z.string().optional(),
          input_url: z.string().optional(),
          error: z.string().optional(),
        }),
      }),

      // -- getRunStatus --
      defineTool({
        name: "getRunStatus",
        description:
          "Fetch current run status and workflow events. Omit run_id to use the active run. Returns data for RunStatusCard.",
        tool: async ({ run_id }: { run_id?: string }) => {
          const effectiveRunId = run_id ?? currentRun?.id;
          if (!effectiveRunId) {
            return { success: false, error: "No active run yet. Share a product URL or create a run first." };
          }
          try {
            const res = await fetch(`${BACKEND_URL}/runs/${effectiveRunId}`);
            if (!res.ok) return { success: false, error: `Run ${effectiveRunId} not found` };
            const run = (await res.json()) as Run;
            onRunLoaded(run);
            return {
              success: true,
              run_id: run.id,
              status: run.status,
              input_url: run.input_url,
              event_count: run.events.length,
              events: run.events.slice(-5).map((e) => ({
                event_type: e.event_type,
                created_at: e.created_at,
                payload: e.payload,
              })),
            };
          } catch {
            return { success: false, error: "Backend is unreachable. Start the FastAPI backend and try again." };
          }
        },
        inputSchema: z.object({
          run_id: z.string().optional().describe("The run ID to check. Omit to use the active run."),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          run_id: z.string().optional(),
          status: z.string().optional(),
          input_url: z.string().optional(),
          event_count: z.number().optional(),
          events: z.array(z.object({
            event_type: z.string(),
            created_at: z.string(),
            payload: z.record(z.string(), z.unknown()),
          })).optional(),
          error: z.string().optional(),
        }),
      }),

      // -- getEvidencePack --
      defineTool({
        name: "getEvidencePack",
        description:
          "Fetch extracted product evidence and chunk data for a run. Returns data for EvidencePackCard. Omit run_id to use the active run.",
        tool: async ({ run_id }: { run_id?: string }) => {
          const effectiveRunId = run_id ?? currentRun?.id;
          if (!effectiveRunId) {
            return { success: false, error: "No active run yet. Share a product URL or create a run first." };
          }
          try {
            const [evRes, chunksRes] = await Promise.all([
              fetch(`${BACKEND_URL}/runs/${effectiveRunId}/evidence`),
              fetch(`${BACKEND_URL}/runs/${effectiveRunId}/evidence/chunks`),
            ]);
            type EvidenceShape = {
              product_title?: string;
              brand?: string;
              price?: string;
              currency?: string;
              rating?: string;
              review_count?: string;
              availability?: string;
              summary?: string;
            };
            type ChunkShape = { embedding_status: string };
            const ev = evRes.ok ? (await evRes.json()) as EvidenceShape | null : null;
            const chunks = chunksRes.ok ? (await chunksRes.json()) as ChunkShape[] : [];
            const liveCount = chunks.filter((c) => c.embedding_status === "live").length;
            const embeddingStatusSummary =
              chunks.length === 0
                ? "no chunks"
                : liveCount === chunks.length
                ? "live"
                : liveCount > 0
                ? `${liveCount}/${chunks.length} live`
                : "missing_provider";
            return {
              success: true,
              run_id: effectiveRunId,
              product_title: ev?.product_title,
              brand: ev?.brand,
              price: ev?.price,
              currency: ev?.currency,
              rating: ev?.rating,
              review_count: ev?.review_count,
              availability: ev?.availability,
              summary: ev?.summary,
              chunk_count: chunks.length,
              embedding_status_summary: embeddingStatusSummary,
            };
          } catch {
            return { success: false, error: "Backend is unreachable. Start the FastAPI backend and try again." };
          }
        },
        inputSchema: z.object({
          run_id: z.string().optional().describe("The run ID. Omit to use the active run."),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          run_id: z.string().optional(),
          product_title: z.string().optional(),
          brand: z.string().optional(),
          price: z.string().optional(),
          currency: z.string().optional(),
          rating: z.string().optional(),
          review_count: z.string().optional(),
          availability: z.string().optional(),
          summary: z.string().optional(),
          chunk_count: z.number().optional(),
          embedding_status_summary: z.string().optional(),
          error: z.string().optional(),
        }),
      }),

      // -- getGtmAnalysis --
      defineTool({
        name: "getGtmAnalysis",
        description:
          "Fetch GTM risk analysis for a run. Returns data for RiskSummaryCards and ListingQACard. Omit run_id to use the active run.",
        tool: async ({ run_id }: { run_id?: string }) => {
          const effectiveRunId = run_id ?? currentRun?.id;
          if (!effectiveRunId) {
            return { success: false, error: "No active run yet. Share a product URL or create a run first." };
          }
          try {
            const res = await fetch(`${BACKEND_URL}/runs/${effectiveRunId}/analysis`);
            if (!res.ok) return { success: false, error: `No analysis found for run ${effectiveRunId}` };
            type AnalysisShape = {
              health_score?: number;
              provider?: string;
              top_risks?: Array<{ title: string; severity: string; description: string }>;
              issue_themes?: Array<{ theme: string; frequency: string; description: string }>;
              listing_quality?: { score: number; findings: Array<{ field: string; status: string; note: string }> };
            };
            const analysis = (await res.json()) as AnalysisShape | null;
            if (!analysis) return { success: false, error: "No analysis available for this run yet." };
            return {
              success: true,
              run_id: effectiveRunId,
              health_score: analysis.health_score ?? 0,
              provider: analysis.provider ?? "unknown",
              top_risks: (analysis.top_risks ?? []).map((r) => ({
                title: r.title,
                severity: (["high", "medium", "low"].includes(r.severity) ? r.severity : "medium") as "high" | "medium" | "low",
                description: r.description,
              })),
              issue_themes: (analysis.issue_themes ?? []).map((t) => ({
                theme: t.theme,
                frequency: (["high", "medium", "low"].includes(t.frequency) ? t.frequency : "medium") as "high" | "medium" | "low",
                description: t.description,
              })),
              listing_quality: {
                score: analysis.listing_quality?.score ?? 0,
                findings: (analysis.listing_quality?.findings ?? []).map((f) => ({
                  field: f.field,
                  status: (["pass", "warning", "fail"].includes(f.status) ? f.status : "warning") as "pass" | "warning" | "fail",
                  note: f.note,
                })),
              },
            };
          } catch {
            return { success: false, error: "Backend is unreachable. Start the FastAPI backend and try again." };
          }
        },
        inputSchema: z.object({
          run_id: z.string().optional().describe("The run ID. Omit to use the active run."),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          run_id: z.string().optional(),
          health_score: z.number().optional(),
          provider: z.string().optional(),
          top_risks: z.array(z.object({
            title: z.string(),
            severity: z.enum(["high", "medium", "low"]),
            description: z.string(),
          })).optional(),
          issue_themes: z.array(z.object({
            theme: z.string(),
            frequency: z.enum(["high", "medium", "low"]),
            description: z.string(),
          })).optional(),
          listing_quality: z.object({
            score: z.number(),
            findings: z.array(z.object({
              field: z.string(),
              status: z.enum(["pass", "warning", "fail"]),
              note: z.string(),
            })),
          }).optional(),
          error: z.string().optional(),
        }),
      }),

      // -- getActionDrafts --
      defineTool({
        name: "getActionDrafts",
        description:
          "Fetch approval-mode action drafts for a run. Returns data for ActionDraftCards. Omit run_id to use the active run.",
        tool: async ({ run_id }: { run_id?: string }) => {
          const effectiveRunId = run_id ?? currentRun?.id;
          if (!effectiveRunId) {
            return { success: false, error: "No active run yet. Share a product URL or create a run first." };
          }
          try {
            const res = await fetch(`${BACKEND_URL}/runs/${effectiveRunId}/actions`);
            if (!res.ok) return { success: false, error: `Could not fetch drafts for run ${effectiveRunId}` };
            type DraftShape = {
              id: string;
              draft_type: string;
              target_system: string;
              status: string;
              title: string;
              evidence_ids: string[];
            };
            const drafts = (await res.json()) as DraftShape[];
            return {
              success: true,
              run_id: effectiveRunId,
              drafts: drafts.map((d) => ({
                id: d.id,
                draft_type: d.draft_type,
                target_system: d.target_system,
                status: (["draft", "approved", "simulated_sent"].includes(d.status) ? d.status : "draft") as "draft" | "approved" | "simulated_sent",
                title: d.title,
                evidence_ids: d.evidence_ids ?? [],
              })),
            };
          } catch {
            return { success: false, error: "Backend is unreachable. Start the FastAPI backend and try again." };
          }
        },
        inputSchema: z.object({
          run_id: z.string().optional().describe("The run ID. Omit to use the active run."),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          run_id: z.string().optional(),
          drafts: z.array(z.object({
            id: z.string(),
            draft_type: z.string(),
            target_system: z.string(),
            status: z.enum(["draft", "approved", "simulated_sent"]),
            title: z.string(),
            evidence_ids: z.array(z.string()),
          })).optional(),
          error: z.string().optional(),
        }),
      }),
    ],
    [onRunCreated, onRunLoaded, currentRun]
  );

  useEffect(() => {
    registerTools(tools);
  }, [registerTools, tools]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!value.trim() || isPending) return;
      await submit();
    },
    [value, isPending, submit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    },
    [submit]
  );

  const isLoading = isStreaming || isWaiting || isPending;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Context banner */}
      {currentRun && (
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 truncate">
          Active run:{" "}
          <span className="font-mono text-slate-700">{currentRun.id.slice(0, 8)}…</span>
          {" · "}
          <span className="capitalize">{currentRun.status}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="space-y-2">
            <div className="text-sm text-slate-400 italic">
              Ask me about this product run. Try:
            </div>
            <ul className="text-xs text-slate-400 space-y-1 list-none">
              <li>· Show me the current run status</li>
              <li>· Show the evidence pack</li>
              <li>· Show GTM risks and listing QA</li>
              <li>· Show action drafts</li>
            </ul>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const textBlocks = msg.content.filter((c) => c.type === "text");
          const componentBlocks = msg.content.filter((c) => c.type === "component");

          const hasContent = textBlocks.length > 0 || componentBlocks.length > 0;
          if (!hasContent) return null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
            >
              {textBlocks.length > 0 && (
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    isUser ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {textBlocks.map((block, i) =>
                    "text" in block ? (
                      <p key={i} className="whitespace-pre-wrap">{block.text}</p>
                    ) : null
                  )}
                </div>
              )}
              {componentBlocks.map((block, i) =>
                "renderedComponent" in block && block.renderedComponent ? (
                  <div key={i} className="w-full">
                    {block.renderedComponent}
                  </div>
                ) : null
              )}
              <span className="text-[10px] text-slate-400 px-1">
                {isUser ? "You" : "Copilot"}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
            </span>
            Thinking…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="border-t border-slate-200 p-3 flex gap-2"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this product…"
          rows={2}
          className="flex-1 resize-none text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className={`self-end px-3 py-1.5 rounded text-sm font-medium text-white transition-colors ${
            isLoading || !value.trim()
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          Send
        </button>
      </form>
    </div>
  );
}

// ---------- outer provider ----------

export function CopilotPanel(props: CopilotPanelProps) {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="text-sm text-slate-400 italic">
          AI Copilot requires a Tambo API key.
        </div>
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Set <code className="font-mono">NEXT_PUBLIC_TAMBO_API_KEY</code> in your{" "}
          <code className="font-mono">.env.local</code> to enable the copilot.
        </div>
      </div>
    );
  }

  return (
    <TamboProvider
      apiKey={apiKey}
      userKey="gtm-workbench-user"
      components={COPILOT_COMPONENTS}
    >
      <CopilotChat {...props} />
    </TamboProvider>
  );
}
