"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { demoData } from "@/lib/demo-data";
import { Card, CardHeader, CardBody, Badge } from "@/components/SharedUI";
import { DraftResponse } from "@/lib/schema";
import { findReviewById } from "@/data/reviews";

export default function ResponseQueuePage() {
  const [drafts, setDrafts] = useState<DraftResponse[]>(demoData.draftResponses);

  const updateStatus = (id: string, status: DraftResponse["status"]) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const handleEdit = (id: string, newText: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, edited_text: newText } : d)));
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Response Queue</h2>
          <div className="text-xs text-slate-500">
            {drafts.filter((d) => d.status === "draft").length} pending ·{" "}
            {drafts.filter((d) => d.status === "approved").length} approved ·{" "}
            {drafts.filter((d) => d.status === "rejected").length} rejected
          </div>
        </div>

        {drafts.map((draft) => {
          const review = findReviewById(draft.review_id);
          const displayText = draft.edited_text ?? draft.generated_text;
          const langLabel: Record<string, string> = { en: "English", hi: "Hindi/Hinglish", ar: "Arabic", id: "Bahasa" };
          const checklist = draft.checklist_results;

          return (
            <Card key={draft.id}>
              <CardHeader
                title={review?.title ?? "Unknown review"}
                subtitle={`${review?.marketplace.replace("_", " ")} · ${review?.date} · ${langLabel[draft.language]}`}
                action={
                  <div className="flex gap-1.5">
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
                      <div className="text-xs font-semibold text-slate-700 mb-1">AI Draft Response</div>
                      <textarea
                        className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        rows={5}
                        value={displayText}
                        onChange={(e) => handleEdit(draft.id, e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">Quality Checklist</div>
                    <div className="space-y-1.5">
                      {[
                        { label: "Same language as customer", pass: checklist.language_match },
                        { label: "Mentions the exact issue", pass: checklist.mentions_exact_issue },
                        { label: "Uses empathetic tone", pass: checklist.empathetic_tone },
                        { label: "Avoids prohibited claims", pass: checklist.avoids_prohibited_claims },
                        { label: "Includes support path", pass: checklist.includes_support_path },
                        { label: "Within character limit", pass: checklist.within_character_limit },
                        { label: "Avoids over-admitting fault", pass: checklist.avoids_over_admitting_fault },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <span
                            className={`inline-block w-4 h-4 rounded-full text-center text-[10px] leading-4 text-white ${
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

                    {draft.edited_text && (
                      <div className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                        This response has been edited. Original text is preserved in history.
                      </div>
                    )}

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
