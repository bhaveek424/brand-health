"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge } from "@/components/SharedUI";
import { DraftResponse } from "@/lib/schema";
import { findReviewById } from "@/data/reviews";
import { towerBrand } from "@/data/brands";

function computeChecklistPassRate(checklist: DraftResponse["checklist_results"]): number {
  const items = [
    checklist.language_match,
    checklist.mentions_exact_issue,
    checklist.empathetic_tone,
    checklist.avoids_prohibited_claims,
    checklist.includes_support_path,
    checklist.within_character_limit,
    checklist.avoids_over_admitting_fault,
  ];
  const passed = items.filter(Boolean).length;
  return Math.round((passed / items.length) * 100);
}

export default function ResponseQueuePage() {
  const [drafts, setDrafts] = useState<DraftResponse[]>(demoData.draftResponses);

  const updateStatus = (id: string, status: DraftResponse["status"]) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const handleEdit = (id: string, newText: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, edited_text: newText, status: "draft" as const }
          : d
      )
    );
  };

  const pendingCount = drafts.filter((d) => d.status === "draft" || d.status === "published").length; // published is a future state for this prototype
  const approvedCount = drafts.filter((d) => d.status === "approved").length;
  const rejectedCount = drafts.filter((d) => d.status === "rejected").length;

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Response Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {drafts.length} drafts · {pendingCount} pending · {approvedCount} approved · {rejectedCount} rejected
            </p>
          </div>
        </div>

        {/* Not-auto-published banner */}
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 flex items-start gap-2">
          <span className="inline-block w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] leading-4 text-center flex-shrink-0 mt-px">i</span>
          <p className="text-xs text-sky-700">
            <span className="font-semibold">Drafts are not auto-published.</span> A human must approve each response before it goes live on a marketplace.
          </p>
        </div>

        {drafts.map((draft) => {
          const review = findReviewById(draft.review_id);
          const displayText = draft.edited_text ?? draft.generated_text;
          const isEdited = !!draft.edited_text;
          const checklist = draft.checklist_results;
          const passRate = computeChecklistPassRate(checklist);

          const langLabel: Record<string, string> = {
            en: "English",
            hi: "Hindi/Hinglish",
            ar: "Arabic",
            id: "Bahasa",
          };

          const checklistItems = [
            { key: "language_match", label: "Same language as customer", pass: checklist.language_match },
            { key: "mentions_exact_issue", label: "Mentions the exact issue", pass: checklist.mentions_exact_issue },
            { key: "empathetic_tone", label: "Uses empathetic tone", pass: checklist.empathetic_tone },
            { key: "avoids_prohibited_claims", label: "Avoids prohibited claims", pass: checklist.avoids_prohibited_claims },
            { key: "includes_support_path", label: "Includes support path", pass: checklist.includes_support_path },
            { key: "within_character_limit", label: "Within character limit", pass: checklist.within_character_limit },
            { key: "avoids_over_admitting_fault", label: "Avoids over-admitting fault", pass: checklist.avoids_over_admitting_fault },
          ];

          const forbiddenHits = checklist.forbidden_phrase_hits ?? [];

          return (
            <Card key={draft.id}>
              <CardHeader
                title={review?.title ?? "Unknown review"}
                subtitle={`${review?.marketplace.replace("_", " ")} · ${review?.date} · ${langLabel[draft.language]}`}
                action={
                  <div className="flex items-center gap-1.5">
                    {draft.status === "draft" && (
                      <>
                        <button
                          onClick={() => updateStatus(draft.id, "approved")}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(draft.id, "rejected")}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {draft.status === "approved" && <Badge variant="success">APPROVED</Badge>}
                    {draft.status === "rejected" && <Badge variant="danger">REJECTED</Badge>}
                  </div>
                }
              />
              <CardBody>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left column: review + draft */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1">Original Review</div>
                      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2.5">
                        {review?.body}
                      </div>
                      {review?.normalized_summary && review.language !== "en" && (
                        <div className="text-xs text-slate-400 mt-1 italic">EN: {review.normalized_summary}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1">Agent Draft Response</div>
                      <textarea
                        className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        rows={5}
                        value={displayText}
                        onChange={(e) => handleEdit(draft.id, e.target.value)}
                      />
                      {isEdited && (
                        <div className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          Edited manually. Original text is preserved. Quality checklist reflects the original draft — review before approving.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column: checklist + guardrails */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-slate-700">Quality Checklist</div>
                      <div className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${passRate === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : passRate >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {passRate}% passed
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {checklistItems.map((item) => (
                        <div key={item.key} className="flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] text-white ${
                              item.pass ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          >
                            {item.pass ? "✓" : "✕"}
                          </span>
                          <span className={item.pass ? "text-slate-600" : "text-slate-800 font-medium"}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Forbidden phrase block */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-700 mb-1">Guardrails</div>
                      <div className="text-[11px] text-slate-500 mb-1.5">
                        Brand-violating phrases: {towerBrand.forbidden_phrases.join(", ")}
                      </div>
                      {forbiddenHits.length > 0 ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 space-y-1">
                          <div className="text-[11px] font-semibold text-red-700">Forbidden phrases detected:</div>
                          <ul className="list-disc list-inside text-[11px] text-red-700">
                            {forbiddenHits.map((hit) => (
                              <li key={hit}>{hit}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                          <div className="text-[11px] text-emerald-700">
                            No forbidden phrases detected.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        Length: {displayText.length} chars · Target: ≤2000
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
