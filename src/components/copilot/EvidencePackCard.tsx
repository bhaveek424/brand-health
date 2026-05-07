"use client";

import { z } from "zod";

export const evidencePackCardPropsSchema = z.object({
  run_id: z.string().describe("The run ID"),
  product_title: z.string().optional().describe("Extracted product title"),
  brand: z.string().optional().describe("Extracted brand"),
  price: z.string().optional().describe("Extracted price"),
  currency: z.string().optional().describe("Currency code"),
  rating: z.string().optional().describe("Product rating"),
  review_count: z.string().optional().describe("Number of reviews"),
  availability: z.string().optional().describe("Availability status"),
  summary: z.string().optional().describe("AI-generated product summary"),
  chunk_count: z.number().describe("Number of evidence chunks stored"),
  embedding_status_summary: z.string().describe("Embedding status (e.g. 'live', 'missing_provider')"),
});

export type EvidencePackCardProps = z.infer<typeof evidencePackCardPropsSchema>;

export function EvidencePackCard({
  run_id,
  product_title,
  brand,
  price,
  currency,
  rating,
  review_count,
  availability,
  summary,
  chunk_count,
  embedding_status_summary,
}: EvidencePackCardProps) {
  const hasEvidence = !!(product_title || brand || rating);

  return (
    <div className="rounded-lg border border-indigo-200 bg-white shadow-sm text-sm w-full">
      <div className="px-3 py-2 border-b border-indigo-100 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">Evidence Pack</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
          {chunk_count} chunks
        </span>
      </div>

      {!hasEvidence ? (
        <div className="px-3 py-2 text-xs text-slate-400 italic">
          No evidence extracted yet for run {run_id.slice(0, 8)}….
        </div>
      ) : (
        <div className="px-3 py-2 space-y-2">
          {product_title && (
            <div className="font-medium text-slate-800 leading-snug">{product_title}</div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {brand && <span><span className="text-slate-400">Brand:</span> {brand}</span>}
            {price && (
              <span>
                <span className="text-slate-400">Price:</span> {price}
                {currency ? ` ${currency}` : ""}
              </span>
            )}
            {rating && (
              <span>
                <span className="text-slate-400">Rating:</span> {rating}
                {review_count ? ` (${review_count} reviews)` : ""}
              </span>
            )}
            {availability && (
              <span><span className="text-slate-400">Availability:</span> {availability}</span>
            )}
          </div>
          {summary && (
            <div className="text-xs text-slate-600 leading-relaxed line-clamp-3">{summary}</div>
          )}
          <div className="text-xs text-slate-400">
            Embeddings: {embedding_status_summary}
          </div>
        </div>
      )}
    </div>
  );
}
