"use client";

import React, { useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { parseCsv, ParsedCsv } from "@/lib/workbench/csv-parser";
import { mapColumns, ColumnMapping } from "@/lib/workbench/column-mapper";
import { normalizeRows, ValidationError } from "@/lib/workbench/normalizer";
import { analyzeWorkbench, WorkbenchAnalysis } from "@/lib/workbench/analysis";
import { generateActionDrafts, ActionDrafts } from "@/lib/workbench/drafting";
import { generateHandoff, EngineeringHandoff } from "@/lib/workbench/engineering-handoff";
import { NormalizedReview } from "@/lib/workbench/normalizer";
import { Card, CardHeader, CardBody, Badge, ProgressBar } from "@/components/SharedUI";

const STORAGE_KEY = "opptra-workbench-saved-run";

type SavedRun = {
  version: 1;
  mode: "csv" | "live";
  step: "analysis" | "drafts" | "handoff";
  parsed?: ParsedCsv;
  mapping?: ColumnMapping;
  liveUrlOrAsin?: string;
  analysis: WorkbenchAnalysis;
  rejected: ValidationError[];
  drafts: ActionDrafts;
  handoff: EngineeringHandoff;
  providerMeta: {
    provider: string;
    model: string;
    fallbackFrom?: string;
    fallbackReason?: string;
  };
  runMode: string;
};

function buildSavedRun(
  mode: "csv" | "live",
  step: "analysis" | "drafts" | "handoff",
  opts: {
    parsed?: ParsedCsv | null;
    mapping?: ColumnMapping | null;
    liveUrlOrAsin?: string;
    analysis: WorkbenchAnalysis;
    rejected: ValidationError[];
    drafts: ActionDrafts;
    handoff: EngineeringHandoff;
    providerMeta: SavedRun["providerMeta"];
    runMode: string;
  }
): SavedRun {
  return {
    version: 1,
    mode,
    step,
    parsed: opts.parsed ?? undefined,
    mapping: opts.mapping ?? undefined,
    liveUrlOrAsin: opts.liveUrlOrAsin || undefined,
    analysis: opts.analysis,
    rejected: opts.rejected,
    drafts: opts.drafts,
    handoff: opts.handoff,
    providerMeta: opts.providerMeta,
    runMode: opts.runMode,
  };
}

export default function WorkbenchPage() {
  const [step, setStep] = useState<"upload" | "mapping" | "analysis" | "drafts" | "handoff">("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [rejected, setRejected] = useState<ValidationError[]>([]);
  const [analysis, setAnalysis] = useState<WorkbenchAnalysis | null>(null);
  const [drafts, setDrafts] = useState<ActionDrafts | null>(null);
  const [handoff, setHandoff] = useState<EngineeringHandoff | null>(null);
  const [error, setError] = useState<string>("");
  const [liveUrlOrAsin, setLiveUrlOrAsin] = useState<string>("");
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [runMode, setRunMode] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [providerMeta, setProviderMeta] = useState<{
    provider: string;
    model: string;
    fallbackFrom?: string;
    fallbackReason?: string;
  } | null>(null);

  // Restore saved run on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: SavedRun = JSON.parse(raw);
      if (saved.version !== 1) return;

      queueMicrotask(() => {
        setAnalysis(saved.analysis);
        setDrafts(saved.drafts);
        setHandoff(saved.handoff);
        setRejected(saved.rejected);
        setProviderMeta(saved.providerMeta);
        setRunMode(saved.runMode);
        setStep(saved.step);

        if (saved.mode === "csv" && saved.parsed && saved.mapping) {
          setParsed(saved.parsed);
          setMapping(saved.mapping);
        } else if (saved.mode === "live" && saved.liveUrlOrAsin) {
          setLiveUrlOrAsin(saved.liveUrlOrAsin);
        }
      });
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persistRun = useCallback(
    (mode: "csv" | "live", currentStep: typeof step, opts: Omit<Parameters<typeof buildSavedRun>[2], "parsed" | "mapping" | "liveUrlOrAsin">) => {
      const saved = buildSavedRun(mode, currentStep as "analysis" | "drafts" | "handoff", {
        ...opts,
        parsed,
        mapping,
        liveUrlOrAsin,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    },
    [parsed, mapping, liveUrlOrAsin]
  );

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files accepted.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const p = parseCsv(text);
      if (p.headers.length === 0) {
        setError("CSV appears empty or missing header row.");
        return;
      }
      setParsed(p);
      const m = mapColumns(p.headers);
      setMapping(m);
      setStep("mapping");
    };
    reader.readAsText(file);
  }, []);

  const acceptMapping = useCallback(async () => {
    if (!parsed || !mapping) return;
    if (mapping.missing.length > 0) {
      setError(`Missing required columns: ${mapping.missing.join(", ")}`);
      return;
    }
    setError("");
    setIsAnalyzing(true);
    const { accepted: a, rejected: r } = normalizeRows(parsed.rows, mapping);
    setRejected(r);
    if (a.length === 0) {
      setError("All rows were rejected. Fix the issues below before proceeding.");
      setIsAnalyzing(false);
      return;
    }

    let ana: WorkbenchAnalysis;
    let currentProviderMeta: SavedRun["providerMeta"] = { provider: "unknown", model: "unknown" };
    try {
      const res = await fetch("/api/workbench/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: a }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        ana = data.analysis;
        currentProviderMeta = {
          provider: data.metadata?.provider ?? "unknown",
          model: data.metadata?.model ?? "unknown",
          fallbackFrom: data.metadata?.fallbackFrom,
          fallbackReason: data.metadata?.fallbackReason,
        };
        setAnalysis(ana);
        setProviderMeta(currentProviderMeta);
      } else {
        throw new Error(data.error || `API error (${res.status})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ana = analyzeWorkbench(a);
      currentProviderMeta = {
        provider: "sample",
        model: "deterministic",
        fallbackFrom: "api",
        fallbackReason: msg,
      };
      setAnalysis(ana);
      setProviderMeta(currentProviderMeta);
    }

    const dr = generateActionDrafts(a, ana);
    setDrafts(dr);
    const h = generateHandoff(parsed.headers, mapping, a, r, parsed.rows.length);
    setHandoff(h);
    setIsAnalyzing(false);
    setStep("analysis");

    persistRun("csv", "analysis", {
      analysis: ana,
      rejected: r,
      drafts: dr,
      handoff: h,
      providerMeta: currentProviderMeta,
      runMode: "",
    });
  }, [parsed, mapping, persistRun]);

  const reset = useCallback(() => {
    setParsed(null);
    setMapping(null);
    setRejected([]);
    setAnalysis(null);
    setDrafts(null);
    setHandoff(null);
    setProviderMeta(null);
    setIsAnalyzing(false);
    setIsRefreshing(false);
    setError("");
    setRunMode("");
    setLiveUrlOrAsin("");
    setStep("upload");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const runLiveAnalysis = useCallback(async () => {
    if (!liveUrlOrAsin.trim()) {
      setError("Enter an Amazon URL or ASIN.");
      return;
    }
    setError("");
    setLiveLoading(true);
    try {
      const res = await fetch("/api/live-amazon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrAsin: liveUrlOrAsin.trim(), amazonDomain: "amazon.com" }),
      });
      const json = (await res.json()) as {
        reviews?: NormalizedReview[];
        runMode?: string;
        error?: string;
      };
      if (!res.ok || json.error) {
        setError(json.error ?? `Live run failed (HTTP ${res.status})`);
        return;
      }
      const reviews = json.reviews ?? [];
      if (reviews.length === 0) {
        setError("No reviews returned.");
        return;
      }
      const currentRunMode = json.runMode ?? "";
      setRunMode(currentRunMode);
      let ana: WorkbenchAnalysis;
      let currentProviderMeta: SavedRun["providerMeta"] = { provider: "unknown", model: "unknown" };
      try {
        const analysisRes = await fetch("/api/workbench/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviews }),
        });
        const analysisJson = await analysisRes.json();

        if (analysisRes.ok && analysisJson.success) {
          ana = analysisJson.analysis;
          currentProviderMeta = {
            provider: analysisJson.metadata?.provider ?? "unknown",
            model: analysisJson.metadata?.model ?? "unknown",
            fallbackFrom: analysisJson.metadata?.fallbackFrom,
            fallbackReason: analysisJson.metadata?.fallbackReason,
          };
          setProviderMeta(currentProviderMeta);
        } else {
          throw new Error(analysisJson.error || `Analysis API error (${analysisRes.status})`);
        }
      } catch (analysisErr) {
        const msg = analysisErr instanceof Error ? analysisErr.message : String(analysisErr);
        ana = analyzeWorkbench(reviews);
        currentProviderMeta = {
          provider: "sample",
          model: "deterministic",
          fallbackFrom: "api",
          fallbackReason: msg,
        };
        setProviderMeta(currentProviderMeta);
      }
      setAnalysis(ana);
      const dr = generateActionDrafts(reviews, ana);
      setDrafts(dr);
      const hand = generateHandoff(
        ["ASIN", "Product Name", "Rating", "Review", "Date", "Marketplace", "Market", "Language", "SKU"],
        {
          mapped: { marketplace: "Marketplace", market: "Market", product_name: "Product Name", sku: "ASIN", rating: "Rating", review: "Review", date: "Date", language: "Language" },
          unmapped: [],
          missing: [],
        },
        reviews,
        [],
        reviews.length
      );
      setHandoff(hand);
      setStep("analysis");

      persistRun("live", "analysis", {
        analysis: ana,
        rejected: [],
        drafts: dr,
        handoff: hand,
        providerMeta: currentProviderMeta,
        runMode: currentRunMode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live run failed");
    } finally {
      setLiveLoading(false);
    }
  }, [liveUrlOrAsin, persistRun]);

  const handleRefreshRun = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    try {
      if (parsed && mapping) {
        await acceptMapping();
      } else if (liveUrlOrAsin.trim()) {
        await runLiveAnalysis();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [parsed, mapping, liveUrlOrAsin, acceptMapping, runLiveAnalysis]);

  const handleNewRun = useCallback(() => {
    reset();
  }, [reset]);

  const persistStep = useCallback((nextStep: SavedRun["step"]) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: SavedRun = JSON.parse(raw);
      saved.step = nextStep;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }, []);

  const hasRestorableInput = Boolean((parsed && mapping) || liveUrlOrAsin.trim());
  const hasRun = Boolean(analysis);

  const previewHeaders = parsed ? parsed.headers.slice(0, 5) : [];
  const previewRows = parsed ? parsed.rows.slice(0, 5) : [];

  const renderCommandBar = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefreshRun}
        disabled={isRefreshing || !hasRestorableInput}
        className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRefreshing ? "Refreshing..." : "Refresh run"}
      </button>
      <button
        onClick={handleNewRun}
        className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
      >
        New run
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {isRefreshing && (
          <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            Refreshing analysis...
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Upload Review CSV" />
              <CardBody>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                  <span className="text-sm text-slate-600">Click or drop a .csv review export</span>
                  <span className="text-xs text-slate-400 mt-1">Required: marketplace, market, product_name, sku, rating, review, date, language</span>
                  <input type="file" accept=".csv" className="hidden" onChange={onFileChange} />
                </label>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Live Amazon Adapter" />
              <CardBody>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={liveUrlOrAsin}
                    onChange={(e) => setLiveUrlOrAsin(e.target.value)}
                    placeholder="Paste Amazon URL or ASIN"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={runLiveAnalysis}
                    disabled={liveLoading}
                    className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
                  >
                    {liveLoading ? "Loading..." : "Run Live"}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 mb-0">Accepts raw ASIN, /dp/&lt;ASIN&gt;, or /gp/product/&lt;ASIN&gt;</p>
                {runMode && (
                  <div className="mt-2">
                    <Badge variant={runMode === "Live API run" ? "info" : "neutral"}>{runMode}</Badge>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {step === "mapping" && parsed && mapping && (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Column Mapping & Validation" action={<Badge variant="info">{parsed.rows.length} rows</Badge>} />
              <CardBody>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(mapping.mapped).map(([field, header]) => (
                    <div key={field} className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded">
                      <span className="text-emerald-800 font-medium">{field}</span>
                      <span className="text-emerald-700">→ {header}</span>
                    </div>
                  ))}
                  {mapping.unmapped.map((h) => (
                    <div key={h} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500">{h}</span>
                      <Badge variant="neutral">unmapped</Badge>
                    </div>
                  ))}
                </div>
                {mapping.missing.length > 0 && (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Missing required columns: {mapping.missing.join(", ")}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={acceptMapping} disabled={isAnalyzing} className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    {isAnalyzing ? "Analyzing..." : "Run Analysis"}
                  </button>
                  <button onClick={reset} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Preview (first 5 rows)" />
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {previewHeaders.map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-semibold text-slate-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {previewHeaders.map((h) => (
                            <td key={h} className="px-2 py-1 text-slate-700 truncate max-w-[12rem]">{row[h] ?? ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {step === "analysis" && analysis && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {providerMeta && (
                <>
                  <Badge variant="info">{providerMeta.provider}</Badge>
                  <Badge variant="neutral">{providerMeta.model}</Badge>
                  {providerMeta.fallbackFrom && (
                    <Badge variant="warning">fallback: {providerMeta.fallbackFrom}</Badge>
                  )}
                  {providerMeta.fallbackReason && (
                    <span className="text-xs text-amber-700" title={providerMeta.fallbackReason}>Warning: check console</span>
                  )}
                </>
              )}
              <div className="flex-1" />
              {hasRun && renderCommandBar()}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-xs text-slate-500">Total Rows</div>
                <div className="text-xl font-bold text-slate-800">{analysis.total}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-slate-500">Accepted</div>
                <div className="text-xl font-bold text-emerald-700">{analysis.accepted}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-slate-500">Rejected</div>
                <div className="text-xl font-bold text-red-700">{rejected.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-slate-500">Avg Rating</div>
                <div className="text-xl font-bold text-slate-800">
                  {(Object.entries(analysis.ratingDistribution).reduce((sum, [k, v]) => sum + Number(k) * v, 0) / Math.max(1, analysis.total)).toFixed(1)}
                </div>
              </Card>
            </div>

            {rejected.length > 0 && (
              <Card>
                <CardHeader title="Validation Errors" />
                <CardBody>
                  <ul className="text-sm space-y-1">
                    {rejected.slice(0, 10).map((err, i) => (
                      <li key={i} className="text-red-700">
                        Row {err.rowIndex + 1}, <span className="font-medium">{err.field}</span>: {err.message}
                      </li>
                    ))}
                    {rejected.length > 10 && (
                      <li className="text-slate-500">...and {rejected.length - 10} more</li>
                    )}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader title="Sentiment Split" />
              <CardBody>
                <div className="space-y-2">
                  {Object.entries(analysis.sentimentSplit).map(([key, count]) => {
                    const pct = analysis.total > 0 ? (count / analysis.total) * 100 : 0;
                    const color = key === "positive" ? "bg-emerald-500" : key === "negative" ? "bg-red-500" : "bg-amber-500";
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                          <span className="capitalize">{key}</span>
                          <span>{count} ({Math.round(pct)}%)</span>
                        </div>
                        <ProgressBar value={pct} max={100} color={color} />
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Rating Distribution" />
              <CardBody>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = analysis.ratingDistribution[star] ?? 0;
                    const pct = analysis.total > 0 ? (count / analysis.total) * 100 : 0;
                    return (
                      <div key={star}>
                        <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                          <span>{star} star</span>
                          <span>{count}</span>
                        </div>
                        <ProgressBar value={pct} max={100} color={star <= 2 ? "bg-red-500" : star === 3 ? "bg-amber-500" : "bg-emerald-500"} />
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Top Issue Themes" />
              <CardBody>
                {analysis.topThemes.length === 0 ? (
                  <p className="text-sm text-slate-500">No themes detected.</p>
                ) : (
                  <div className="space-y-3">
                    {analysis.topThemes.map((t) => (
                      <div key={t.label} className="border border-slate-100 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-800">{t.label}</div>
                          <Badge variant={t.severity === "critical" ? "danger" : t.severity === "high" ? "warning" : "neutral"}>{t.severity}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{t.count} mentions ({Math.round(t.share * 100)}%)</div>
                        {t.evidence.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {t.evidence.map((e, idx) => (
                              <div key={idx} className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">“{e}…”</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Top Risks" />
              <CardBody>
                {analysis.topRisks.length === 0 ? (
                  <p className="text-sm text-slate-500">No risks flagged.</p>
                ) : (
                  <ul className="space-y-2">
                    {analysis.topRisks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant={r.severity === "critical" ? "danger" : r.severity === "high" ? "warning" : "neutral"}>{r.severity}</Badge>
                        <span className="text-slate-700">{r.title}: {r.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <div className="flex gap-2">
              <button onClick={() => { setStep("drafts"); persistStep("drafts"); }} className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700">
                View Action Drafts
              </button>
              <button onClick={() => { setStep("handoff"); persistStep("handoff"); }} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">
                Engineering Handoff
              </button>
            </div>
          </div>
        )}

        {step === "drafts" && drafts && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setStep("analysis"); persistStep("analysis"); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">Back to Analysis</button>
              <button onClick={() => { setStep("handoff"); persistStep("handoff"); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">Engineering Handoff</button>
              <div className="flex-1" />
              {hasRun && renderCommandBar()}
            </div>

            <Card>
              <CardHeader title="Customer Reply Drafts" />
              <CardBody>
                {drafts.customerReplies.length === 0 ? (
                  <p className="text-sm text-slate-500">No negative reviews to draft replies for.</p>
                ) : (
                  <div className="space-y-3">
                    {drafts.customerReplies.map((d, i) => (
                      <div key={i} className="border border-slate-100 rounded p-3">
                        <div className="text-xs text-slate-500 mb-1">SKU: {d.sku}</div>
                        <div className="text-sm text-slate-700">{d.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Supplier Escalation Note" />
              <CardBody>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-3">{drafts.supplierNote}</pre>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Slack Summary" />
              <CardBody>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-3">{drafts.slackSummary}</pre>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Listing Recommendations" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {drafts.listingRecommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Action Brief" />
              <CardBody>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-3">{drafts.actionBrief}</pre>
              </CardBody>
            </Card>
          </div>
        )}

        {step === "handoff" && handoff && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setStep("analysis"); persistStep("analysis"); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">Back to Analysis</button>
              <button onClick={() => { setStep("drafts"); persistStep("drafts"); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50">Action Drafts</button>
              <div className="flex-1" />
              {hasRun && renderCommandBar()}
            </div>

            <Card>
              <CardHeader title="Observed Upload Data" />
              <CardBody>
                <div className="text-sm text-slate-700 space-y-2">
                  <div><span className="font-semibold">Total uploaded rows:</span> {handoff.observedData.totalUploadedRows}</div>
                  <div><span className="font-semibold">Accepted rows:</span> {handoff.observedData.acceptedRows}</div>
                  <div><span className="font-semibold">Rejected rows:</span> {handoff.observedData.rejectedRows}</div>
                  <div><span className="font-semibold">Markets seen:</span> {handoff.observedData.marketsSeen.join(", ") || "n/a"}</div>
                  <div><span className="font-semibold">Marketplaces seen:</span> {handoff.observedData.marketplacesSeen.join(", ") || "n/a"}</div>
                  <div><span className="font-semibold">SKUs seen:</span> {handoff.observedData.skusSeen.join(", ") || "n/a"}</div>
                  {handoff.observedData.validationErrors.length > 0 && (
                    <div>
                      <div className="font-semibold">Validation errors:</div>
                      <ul className="list-disc list-inside">
                        {handoff.observedData.validationErrors.map((err, i) => (
                          <li key={i}>Row {err.rowIndex + 1}, {err.field}: {err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Input Schema" />
              <CardBody>
                <div className="text-sm text-slate-700 space-y-2">
                  <div><span className="font-semibold">Headers:</span> {handoff.inputSchema.headers.join(", ")}</div>
                  <div className="text-sm">
                    <div className="font-semibold">Mapped columns:</div>
                    <ul className="list-disc list-inside">
                      {Object.entries(handoff.inputSchema.mappedColumns).map(([f, h]) => (
                        <li key={f}>{f} → {h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-sm"><span className="font-semibold">Unmapped:</span> {handoff.inputSchema.unmappedColumns.join(", ") || "None"}</div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Normalized Schema" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {handoff.normalizedSchema.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Business Rules" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {handoff.businessRules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Human Approval Checkpoints" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {handoff.humanApprovalCheckpoints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Edge Cases" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {handoff.edgeCases.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Production Requirements" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {handoff.productionRequirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Suggested Integrations" />
              <CardBody>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {handoff.suggestedIntegrations.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
