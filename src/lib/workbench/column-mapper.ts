// Flexible column alias mapping for messy CSV exports

export type RequiredField = "marketplace" | "market" | "product_name" | "sku" | "rating" | "review" | "date" | "language";

export const COLUMN_ALIASES: Record<RequiredField, string[]> = {
  marketplace: ["marketplace", "platform", "source"],
  market: ["market", "country", "region"],
  product_name: ["product", "product_name", "item_name", "title"],
  sku: ["sku", "asin", "product_id"],
  rating: ["rating", "stars", "score"],
  review: ["review", "review_text", "body", "comment"],
  date: ["date", "review_date", "created_at"],
  language: ["language", "lang"],
};

export interface ColumnMapping {
  mapped: Partial<Record<RequiredField, string>>;
  unmapped: string[];
  missing: RequiredField[];
}

export function mapColumns(headers: string[]): ColumnMapping {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const used = new Set<number>();
  const mapped: Partial<Record<RequiredField, string>> = {};

  const allRequired: RequiredField[] = ["marketplace", "market", "product_name", "sku", "rating", "review", "date", "language"];

  for (const field of allRequired) {
    const aliases = COLUMN_ALIASES[field];
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (used.has(i)) continue;
      if (aliases.includes(lowerHeaders[i])) {
        mapped[field] = headers[i];
        used.add(i);
        break;
      }
    }
  }

  const unmapped = headers.filter((_, i) => !used.has(i));
  const missing = allRequired.filter((f) => !mapped[f]);

  return { mapped, unmapped, missing };
}
