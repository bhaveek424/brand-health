import { NormalizedReview } from "@/lib/workbench/normalizer";
import { getCached, setCached } from "./cache";

export interface LiveAmazonResult {
  reviews: NormalizedReview[];
  runMode: "Live API run" | "Captured sample";
  productTitle?: string;
  error?: string;
}

function domainToMarketplace(domain: string): string {
  const d = domain.toLowerCase().replace(/^www\./, "");
  if (d === "amazon.in") return "amazon_in";
  if (d === "amazon.co.uk") return "amazon_uk";
  if (d === "amazon.de") return "amazon_de";
  if (d === "amazon.ca") return "amazon_ca";
  if (d === "amazon.co.jp") return "amazon_jp";
  return "amazon_com";
}

function domainToMarket(domain: string): string {
  const d = domain.toLowerCase().replace(/^www\./, "");
  if (d === "amazon.in") return "IN";
  if (d === "amazon.co.uk") return "UK";
  if (d === "amazon.de") return "DE";
  if (d === "amazon.ca") return "CA";
  if (d === "amazon.co.jp") return "JP";
  return "US";
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  return d.toISOString().split("T")[0];
}

function ratingToSentiment(rating: number): "positive" | "neutral" | "negative" {
  if (rating <= 2) return "negative";
  if (rating === 3) return "neutral";
  return "positive";
}

const SAMPLE_REVIEWS: NormalizedReview[] = [
  {
    rowIndex: 0,
    marketplace: "amazon_in",
    market: "IN",
    product_name: "Tower Non-Stick Kadai",
    sku: "SAMPLE-ASIN-01",
    rating: 5,
    title: "Great product, works well",
    review:
      "Really happy with the purchase. The non-stick coating is durable and heating is even.",
    date: "2025-04-01",
    language: "en",
    sentiment: "positive",
    normalized_summary:
      "Really happy with the purchase. The non-stick coating is durable and heating is even.",
  },
  {
    rowIndex: 1,
    marketplace: "amazon_in",
    market: "IN",
    product_name: "Tower Non-Stick Kadai",
    sku: "SAMPLE-ASIN-01",
    rating: 2,
    title: "Handle broke in a week",
    review:
      "The handle became loose after just a few uses. Very disappointed with quality.",
    date: "2025-03-20",
    language: "en",
    sentiment: "negative",
    normalized_summary:
      "The handle became loose after just a few uses. Very disappointed with quality.",
  },
  {
    rowIndex: 2,
    marketplace: "amazon_in",
    market: "IN",
    product_name: "Tower Non-Stick Kadai",
    sku: "SAMPLE-ASIN-01",
    rating: 3,
    title: "Average experience",
    review:
      "Works fine but packaging was damaged on delivery. Coating seems okay so far.",
    date: "2025-03-15",
    language: "en",
    sentiment: "neutral",
    normalized_summary:
      "Works fine but packaging was damaged on delivery. Coating seems okay so far.",
  },
];

export async function fetchAmazonReviews(
  asin: string,
  amazonDomain: string = "amazon.com"
): Promise<LiveAmazonResult> {
  const apiKey = process.env.SERPAPI_API_KEY;
  const marketplace = domainToMarketplace(amazonDomain);
  const market = domainToMarket(amazonDomain);

  if (!apiKey) {
    return {
      reviews: SAMPLE_REVIEWS,
      runMode: "Captured sample",
      error: "SERPAPI_API_KEY not configured. Returning captured sample.",
    };
  }

  const cached = getCached(marketplace, asin);
  if (cached) {
    return { reviews: cached, runMode: "Live API run" };
  }

  try {
    const url =
      `https://serpapi.com/search.json?` +
      `engine=amazon_product&` +
      `asin=${encodeURIComponent(asin)}&` +
      `amazon_domain=${encodeURIComponent(amazonDomain)}&` +
      `api_key=${encodeURIComponent(apiKey)}&` +
      `output=json`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return {
        reviews: [],
        runMode: "Live API run",
        error: `SerpApi returned HTTP ${res.status}`,
      };
    }

    const json = (await res.json()) as Record<string, unknown>;
    const productTitle =
      ((json.product_results as Record<string, unknown>)?.title as string) ??
      "Unknown Product";
    const authorsReviews =
      (
        (json.reviews_information as Record<string, unknown>)
          ?.authors_reviews as unknown[]
      ) ?? [];

    if (!authorsReviews.length) {
      return {
        reviews: [],
        runMode: "Live API run",
        error: "No individual reviews found for this product.",
      };
    }

    const rawReviews = authorsReviews as Array<{
      rating?: number;
      title?: string;
      text?: string;
      date?: string;
    }>;
    const reviews: NormalizedReview[] = rawReviews.map((r, idx) => {
      const rating =
        typeof r.rating === "number" ? Math.round(r.rating) : 3;
      return {
        rowIndex: idx,
        marketplace,
        market,
        product_name: productTitle,
        sku: asin,
        rating: Math.max(1, Math.min(5, rating)),
        title: r.title ?? "",
        review: r.text ?? "",
        date: normalizeDate(r.date ?? ""),
        language: "en",
        sentiment: ratingToSentiment(rating),
        normalized_summary: (r.text ?? "").substring(0, 200),
      };
    });

    setCached(marketplace, asin, reviews);
    return { reviews, runMode: "Live API run", productTitle };
  } catch (err) {
    return {
      reviews: [],
      runMode: "Live API run",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
