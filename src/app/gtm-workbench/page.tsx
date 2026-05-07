"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardBody, Badge } from "@/components/SharedUI";
import { BACKEND_URL } from "@/lib/backend";

type BackendStatus = "connected" | "degraded" | "offline";

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

function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>("offline");
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${BACKEND_URL}/health`, {
          signal: controller.signal,
        });
        clearTimeout(t);
        if (!res.ok) throw new Error("not ok");
        const data = (await res.json()) as {
          status?: string;
          database_configured?: boolean;
          database_ready?: boolean;
        };
        if (cancelled) return;
        const isHealthy =
          data.status === "healthy" &&
          data.database_configured === true &&
          data.database_ready === true;
        setStatus(isHealthy ? "connected" : "degraded");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }
    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return status;
}

function getRunIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("run_id");
}

function setRunIdInUrl(runId: string, router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("run_id", runId);
  router.push(`?${params.toString()}`, { scroll: false });
}

function GtmWorkbenchInner() {
  const backendStatus = useBackendHealth();
  const router = useRouter();
  const [productUrl, setProductUrl] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const runId = getRunIdFromUrl();
    if (!runId) return;
    async function load(runId: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/runs/${runId}`);
        if (!res.ok) throw new Error("Failed to load run");
        const data = (await res.json()) as Run;
        setRun(data);
        setProductUrl(data.input_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load run");
      }
    }
    load(runId);
  }, []);

  const canRun =
    backendStatus === "connected" && productUrl.trim().length > 0;

  const handleCreateRun = useCallback(async () => {
    if (!canRun) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const data = (await res.json()) as { detail?: string } & Partial<Run>;
      if (!res.ok) {
        throw new Error(data.detail || `Error ${res.status}`);
      }
      const created = data as Run;
      setRun(created);
      setRunIdInUrl(created.id, router);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run creation failed");
    } finally {
      setLoading(false);
    }
  }, [canRun, productUrl, router]);

  const backendBadge = {
    connected: <Badge variant="success">Backend Connected</Badge>,
    degraded: <Badge variant="warning">Backend Degraded</Badge>,
    offline: <Badge variant="danger">Backend Offline</Badge>,
  }[backendStatus];

  return (
    <DashboardLayout>
      <div className="flex h-full gap-4">
        {/* Main canvas */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Command bar */}
          <Card className="border-l-4 border-l-slate-800">
            <CardBody className="flex items-center gap-3">
              <input
                type="text"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="Paste product URL or ASIN"
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
              />
              <button
                onClick={handleCreateRun}
                disabled={!canRun || loading}
                className={`px-4 py-2 text-sm font-medium text-white rounded ${
                  canRun && !loading
                    ? "bg-slate-800 hover:bg-slate-700"
                    : "bg-slate-400 opacity-60 cursor-not-allowed"
                }`}
              >
                {loading ? "Running..." : "Run Intake"}
              </button>
              <Badge variant="info">AI GTM Copilot</Badge>
              {backendBadge}
            </CardBody>
          </Card>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Placeholder grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Evidence" subtitle="Scraped signals and review highlights" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">
                  Evidence panel will populate after intake run.
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Risks" subtitle="Detected brand and commercial risks" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">
                  Risks panel will populate after intake run.
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Listing QA" subtitle="Content gaps and optimization notes" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">
                  Listing QA panel will populate after intake run.
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Action Drafts" subtitle="AI-generated replies and escalations" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">
                  Drafts panel will populate after intake run.
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 shrink-0 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader title="AI Copilot" subtitle="Agent chat and guidance" />
            <CardBody>
              <div className="space-y-3">
                <div className="text-sm text-slate-400 italic">
                  Copilot will appear here once the backend is connected.
                </div>
                <div className="border border-slate-200 rounded bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-1">Status</div>
                  <div className="text-sm font-medium text-slate-700">
                    {backendStatus === "connected" ? "Ready" : "Waiting for backend..."}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Workflow Timeline" subtitle="Run history and milestones" />
            <CardBody>
              {run === null ? (
                <div className="text-sm text-slate-400 italic">
                  Timeline will populate after the first run.
                </div>
              ) : run.events.length === 0 ? (
                <div className="text-sm text-slate-400 italic">No events yet.</div>
              ) : (
                <div className="space-y-3">
                  {run.events.map((event) => (
                    <div key={event.id} className="flex items-start gap-2">
                      <Badge variant="neutral">{event.event_type}</Badge>
                      <div className="text-xs text-slate-500">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </DashboardLayout>
  );
}

export default function GtmWorkbenchPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading...</div>}>
      <GtmWorkbenchInner />
    </Suspense>
  );
}
