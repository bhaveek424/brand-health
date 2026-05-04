import { RequiredField, ColumnMapping } from "./column-mapper";

export type Sentiment = "positive" | "neutral" | "negative";
export type Language = "en" | "hi" | "ar" | "id";

export interface NormalizedReview {
  rowIndex: number;
  marketplace: string;
  market: string;
  product_name: string;
  sku: string;
  rating: number;
  title: string;
  review: string;
  date: string;
  language: Language;
  sentiment: Sentiment;
  normalized_summary: string;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
}

const LANGUAGE_MAP: Record<string, Language> = {
  en: "en", english: "en",
  hi: "hi", hindi: "hi",
  ar: "ar", arabic: "ar",
  id: "id", indonesian: "id", bahasa: "id",
};

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): { accepted: NormalizedReview[]; rejected: ValidationError[] } {
  const accepted: NormalizedReview[] = [];
  const rejected: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = (field: RequiredField) => {
      const header = mapping.mapped[field];
      return header ? row[header] ?? "" : "";
    };

    const ratingRaw = get("rating");
    const rating = parseFloat(ratingRaw);
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      rejected.push({ rowIndex: i, field: mapping.mapped.rating ?? "rating", message: `Invalid rating "${ratingRaw}"` });
      continue;
    }

    const reviewText = get("review");
    if (!reviewText.trim()) {
      rejected.push({ rowIndex: i, field: mapping.mapped.review ?? "review", message: "Review body is empty" });
      continue;
    }

    const langRaw = get("language").toLowerCase().trim();
    const language = LANGUAGE_MAP[langRaw] ?? "en";

    const sentiment: Sentiment = rating <= 2 ? "negative" : rating === 3 ? "neutral" : "positive";

    const dateRaw = get("date");
    const normalizedDate = normalizeDate(dateRaw);

    accepted.push({
      rowIndex: i,
      marketplace: get("marketplace") || "unknown",
      market: get("market") || "unknown",
      product_name: get("product_name") || "Unknown Product",
      sku: get("sku") || "unknown",
      rating,
      title: get("review")?.substring(0, 80) ?? "",
      review: reviewText,
      date: normalizedDate,
      language,
      sentiment,
      normalized_summary: reviewText.substring(0, 200),
    });
  }

  return { accepted, rejected };
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  return d.toISOString().split("T")[0];
}
