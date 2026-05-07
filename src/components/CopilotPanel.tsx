"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import {
  TamboProvider,
  useTambo,
  useTamboThreadInput,
  defineTool,
} from "@tambo-ai/react";
import { z } from "zod";
import { BACKEND_URL } from "@/lib/backend";

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

interface CopilotPanelProps {
  onRunCreated: (run: Run) => void;
  onRunLoaded: (run: Run) => void;
  currentRun: Run | null;
}

function CopilotChat({ onRunCreated, onRunLoaded, currentRun }: CopilotPanelProps) {
  const { messages, isStreaming, isWaiting, registerTools } = useTambo();
  const { value, setValue, submit, isPending } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tools = useMemo(
    () => [
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
            return {
              success: true,
              run_id: run.id,
              status: run.status,
              input_url: run.input_url,
            };
          } catch {
            return {
              success: false,
              error: "Backend is unreachable. Start the FastAPI backend and try again.",
            };
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
      defineTool({
        name: "getRunStatus",
        description:
          "Fetch the current status and workflow events for a run. Use this when the user asks about the status of their current analysis, or to check what stage the run is at. If no run_id is provided, the active run is used automatically.",
        tool: async ({ run_id }: { run_id?: string }) => {
          const effectiveRunId = run_id ?? currentRun?.id;
          if (!effectiveRunId) {
            return {
              success: false,
              error: "No active run yet. Share a product URL or create a run first.",
            };
          }
          try {
            const res = await fetch(`${BACKEND_URL}/runs/${effectiveRunId}`);
            if (!res.ok) {
              return { success: false, error: `Run ${effectiveRunId} not found` };
            }
            const run = (await res.json()) as Run;
            onRunLoaded(run);
            const recentEvents = run.events.slice(-5).map((e) => ({
              event_type: e.event_type,
              created_at: e.created_at,
              payload: e.payload,
            }));
            return {
              success: true,
              run_id: run.id,
              status: run.status,
              input_url: run.input_url,
              event_count: run.events.length,
              events: recentEvents,
            };
          } catch {
            return {
              success: false,
              error: "Backend is unreachable. Start the FastAPI backend and try again.",
            };
          }
        },
        inputSchema: z.object({
          run_id: z
            .string()
            .optional()
            .describe("The run ID to check. Omit to use the active run."),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          run_id: z.string().optional(),
          status: z.string().optional(),
          input_url: z.string().optional(),
          event_count: z.number().optional(),
          events: z
            .array(
              z.object({
                event_type: z.string(),
                created_at: z.string(),
                payload: z.record(z.string(), z.unknown()),
              })
            )
            .optional(),
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
          <div className="text-sm text-slate-400 italic">
            Ask me to analyze a product, check run status, or explain findings.
          </div>
        )}

        {messages.map((msg) => {
          const textBlocks = msg.content.filter((c) => c.type === "text");
          if (textBlocks.length === 0) return null;
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  isUser
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {textBlocks.map((block, i) =>
                  "text" in block ? (
                    <p key={i} className="whitespace-pre-wrap">
                      {block.text}
                    </p>
                  ) : null
                )}
              </div>
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
    <TamboProvider apiKey={apiKey} userKey="gtm-workbench-user">
      <CopilotChat {...props} />
    </TamboProvider>
  );
}
