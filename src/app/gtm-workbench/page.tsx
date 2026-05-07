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

type ExtractionQuality = {
  confidence: number;
  missing_fields: string[];
  warnings: string[];
};

type Evidence = {
  id: string;
  run_id: string;
  source: string;
  status: string;
  input_url: string;
  product_title?: string;
  brand?: string;
  price?: string;
  currency?: string;
  rating?: string;
  review_count?: string;
  availability?: string;
  seller?: string;
  images: string[];
  bullets: string[];
  description?: string;
  specifications: Record<string, string>[];
  warranty_or_returns?: string;
  review_snippets: string[];
  summary?: string;
  extraction_quality: ExtractionQuality;
  created_at: string;
  updated_at: string;
};

type EvidenceChunk = {
  id: string;
  run_id: string;
  product_id?: string;
  extraction_run_id?: string;
  source_type: string;
  source_url: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding_status: string;
  created_at: string;
};

type EvidenceSearchResult = {
  id: string;
  run_id: string;
  source_type: string;
  source_url: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding_status: string;
  score?: number;
  search_mode: "vector" | "text";
};

type EvidenceSearchResponse = {
  query: string;
  search_mode: "vector" | "text";
  results: EvidenceSearchResult[];
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
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string>("");
  const [chunks, setChunks] = useState<EvidenceChunk[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EvidenceSearchResponse | null>(null);
  const [searching, setSearching] = useState(false);

  const loadRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/runs/${runId}`);
      if (!res.ok) throw new Error("Failed to load run");
      const data = (await res.json()) as Run;
      setRun(data);
      setProductUrl(data.input_url);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run");
      return null;
    }
  }, []);

  const loadEvidence = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/runs/${runId}/evidence`);
      if (!res.ok) return;
      const data = (await res.json()) as Evidence | null;
      setEvidence(data);
    } catch {
      // ignore; evidence may not exist yet
    }
  }, []);

  const loadChunks = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/runs/${runId}/evidence/chunks`);
      if (!res.ok) return;
      const data = (await res.json()) as EvidenceChunk[];
      setChunks(data);
    } catch {
      // ignore; chunks may not exist yet
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!run || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/runs/${run.id}/evidence/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 10 }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as EvidenceSearchResponse;
      setSearchResults(data);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [run, searchQuery]);

  useEffect(() => {
    const runId = getRunIdFromUrl();
    if (!runId) return;
    void (async () => {
      const r = await loadRun(runId);
      if (r) {
        await loadEvidence(r.id);
        await loadChunks(r.id);
      }
    })();
  }, [loadRun, loadEvidence, loadChunks]);

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

  const handleExtract = useCallback(async () => {
    if (!run) return;
    setExtracting(true);
    setExtractError("");
    try {
      const res = await fetch(`${BACKEND_URL}/runs/${run.id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { detail?: string } & Partial<Evidence>;
      if (!res.ok) {
        throw new Error(data.detail || `Error ${res.status}`);
      }
      setEvidence(data as Evidence);
      // Refresh run/events and chunks
      await loadRun(run.id);
      await loadChunks(run.id);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }, [run, loadRun, loadChunks]);

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
              {run && (
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded ${
                    !extracting
                      ? "bg-indigo-600 hover:bg-indigo-500"
                      : "bg-slate-400 opacity-60 cursor-not-allowed"
                  }`}
                >
                  {extracting ? "Extracting..." : "Extract Evidence"}
                </button>
              )}
              <Badge variant="info">AI GTM Copilot</Badge>
              {backendBadge}
            </CardBody>
          </Card>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {extractError && (
            <div className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
              {extractError}
            </div>
          )}

          {/* Evidence Pack */}
          {evidence && (
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader
                title="Evidence Pack"
                subtitle={
                  evidence.status === "completed"
                    ? `Extracted from ${evidence.source}`
                    : `Extraction status: ${evidence.status}`
                }
              />
              <CardBody>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-1">Title</div>
                      <div className="text-sm font-medium text-slate-800">
                        {evidence.product_title || "N/A"}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-1">Brand</div>
                      <div className="text-sm font-medium text-slate-800">
                        {evidence.brand || "N/A"}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-1">Price</div>
                      <div className="text-sm font-medium text-slate-800">
                        {evidence.price && evidence.currency
                          ? `${evidence.price} ${evidence.currency}`
                          : evidence.price || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-1">Rating</div>
                      <div className="text-sm font-medium text-slate-800">
                        {evidence.rating ? `${evidence.rating} (${evidence.review_count || 0} reviews)` : "N/A"}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-1">Availability</div>
                      <div className="text-sm font-medium text-slate-800">
                        {evidence.availability || "N/A"}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-1">Seller</div>
                      <div className="text-sm font-medium text-slate-800">
                        {evidence.seller || "N/A"}
                      </div>
                    </div>
                  </div>
                  {(evidence.bullets && evidence.bullets.length > 0) && (
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-2">Bullets</div>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {evidence.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(evidence.specifications && evidence.specifications.length > 0) && (
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-2">Specifications</div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                        {evidence.specifications.map((spec, i) => {
                          const entries = Object.entries(spec);
                          return (
                            <div key={i} className="flex gap-2">
                              <span className="font-medium">{entries[0]?.[0] || "Spec"}:</span>
                              <span>{entries[0]?.[1] || ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {evidence.review_snippets && evidence.review_snippets.length > 0 && (
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-2">Review Snippets</div>
                      <div className="space-y-2">
                        {evidence.review_snippets.map((s, i) => (
                          <div key={i} className="text-sm text-slate-700 italic">&quot;{s}&quot;</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {evidence.summary && (
                    <div className="border border-slate-200 rounded p-3">
                      <div className="text-xs text-slate-500 mb-2">Summary</div>
                      <div className="text-sm text-slate-700">{evidence.summary}</div>
                    </div>
                  )}
                  {evidence.extraction_quality && (
                    <div className="rounded bg-slate-50 p-3 text-sm text-slate-600">
                      <div className="font-medium text-slate-700 mb-1">Extraction Quality</div>
                      <div>Confidence: {evidence.extraction_quality.confidence || 0}</div>
                      {evidence.extraction_quality.missing_fields.length > 0 && (
                        <div className="mt-1 text-orange-600">
                          Missing: {evidence.extraction_quality.missing_fields.join(", ")}
                        </div>
                      )}
                      {evidence.extraction_quality.warnings.length > 0 && (
                        <div className="mt-1 text-orange-600">
                          Warnings: {evidence.extraction_quality.warnings.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Evidence Chunks */}
          {chunks.length > 0 && (
            <Card className="border-l-4 border-l-violet-500">
              <CardHeader
                title={`Evidence Chunks (${chunks.length})`}
                subtitle="Retrievable citation units from extracted evidence"
              />
              <CardBody>
                {/* Embedding status summary */}
                {(() => {
                  const liveCount = chunks.filter((c) => c.embedding_status === "live").length;
                  const missingCount = chunks.filter((c) => c.embedding_status === "missing_provider").length;
                  const failedCount = chunks.filter((c) => c.embedding_status === "failed").length;
                  let statusLabel = "";
                  let statusClass = "";
                  if (liveCount === chunks.length) {
                    statusLabel = `Embeddings: live (${liveCount}/${chunks.length})`;
                    statusClass = "text-green-700 bg-green-50 border-green-200";
                  } else if (missingCount === chunks.length) {
                    statusLabel = "Embeddings: not generated (set OPENAI_API_KEY to enable semantic search)";
                    statusClass = "text-slate-500 bg-slate-50 border-slate-200";
                  } else if (failedCount === chunks.length) {
                    statusLabel = "Embeddings: failed";
                    statusClass = "text-red-600 bg-red-50 border-red-200";
                  } else {
                    statusLabel = `Embeddings: ${liveCount} live, ${missingCount} missing, ${failedCount} failed`;
                    statusClass = "text-amber-700 bg-amber-50 border-amber-200";
                  }
                  return (
                    <div className={`mb-3 rounded border px-3 py-2 text-xs font-medium ${statusClass}`}>
                      {statusLabel}
                    </div>
                  );
                })()}

                {/* Search box */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSearch(); }}
                    placeholder="Search evidence chunks..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={() => void handleSearch()}
                    disabled={searching || !searchQuery.trim()}
                    className={`px-3 py-1.5 text-sm font-medium text-white rounded ${
                      !searching && searchQuery.trim()
                        ? "bg-violet-600 hover:bg-violet-500"
                        : "bg-slate-400 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </div>

                {/* Search results */}
                {searchResults && (
                  <div className="mb-3 border border-violet-200 rounded bg-violet-50 p-3">
                    <div className="text-xs text-violet-600 font-medium mb-2">
                      Search: &quot;{searchResults.query}&quot; &mdash; {searchResults.results.length} result{searchResults.results.length !== 1 ? "s" : ""} ({searchResults.search_mode} mode)
                    </div>
                    {searchResults.results.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching chunks.</div>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.results.map((r) => (
                          <div key={r.id} className="bg-white border border-violet-100 rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                                {r.source_type}
                              </span>
                              {r.score != null && (
                                <span className="text-xs text-slate-500">score: {r.score}</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 line-clamp-3">{r.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Chunk list */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {chunks.map((chunk) => (
                    <div key={chunk.id} className="border border-slate-200 rounded p-2 bg-white">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {chunk.source_type}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          chunk.embedding_status === "live"
                            ? "bg-green-100 text-green-700"
                            : chunk.embedding_status === "missing_provider"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {chunk.embedding_status === "live" ? "embedded" : chunk.embedding_status === "missing_provider" ? "no embedding" : "embed failed"}
                        </span>
                        {Object.keys(chunk.metadata).length > 0 && (
                          <span className="text-xs text-slate-400">
                            {Object.entries(chunk.metadata)
                              .filter(([k]) => k !== "confidence")
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(" | ")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 line-clamp-2">{chunk.content}</div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Placeholder grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Evidence" subtitle="Scraped signals and review highlights" />
              <CardBody>
                {evidence ? (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-700">{evidence.product_title || "No title"}</div>
                    <div className="text-xs text-slate-500">Source: {evidence.source}</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic">
                    Evidence panel will populate after intake run.
                  </div>
                )}
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
