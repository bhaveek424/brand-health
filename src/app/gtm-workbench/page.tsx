"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardBody, Badge } from "@/components/SharedUI";
import { BACKEND_URL } from "@/lib/backend";

type BackendStatus = "connected" | "degraded" | "offline";

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
        const data = (await res.json()) as { status?: string };
        if (cancelled) return;
        setStatus(data.status === "healthy" ? "connected" : "degraded");
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

export default function GtmWorkbenchPage() {
  const backendStatus = useBackendHealth();
  const [productUrl, setProductUrl] = useState("");

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
                disabled
                className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded opacity-60 cursor-not-allowed"
                title="Coming in next slice"
              >
                Run Intake
              </button>
              <Badge variant="info">AI GTM Copilot</Badge>
              {backendBadge}
            </CardBody>
          </Card>

          {/* Placeholder grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Evidence" subtitle="Scraped signals and review highlights" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">Evidence panel will populate after intake run.</div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Risks" subtitle="Detected brand and commercial risks" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">Risks panel will populate after intake run.</div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Listing QA" subtitle="Content gaps and optimization notes" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">Listing QA panel will populate after intake run.</div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Action Drafts" subtitle="AI-generated replies and escalations" />
              <CardBody>
                <div className="text-sm text-slate-400 italic">Drafts panel will populate after intake run.</div>
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
                <div className="text-sm text-slate-400 italic">Copilot will appear here once the backend is connected.</div>
                <div className="border border-slate-200 rounded bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-1">Status</div>
                  <div className="text-sm font-medium text-slate-700">{backendStatus === "connected" ? "Ready" : "Waiting for backend..."}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Workflow Timeline" subtitle="Run history and milestones" />
            <CardBody>
              <div className="text-sm text-slate-400 italic">Timeline will populate after the first run.</div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </DashboardLayout>
  );
}
