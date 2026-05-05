import { NormalizedReview } from "@/lib/workbench/normalizer";
import { getCached, setCached } from "./cache";

export interface LiveAmazonResult {
  reviews: NormalizedReview[];
  runMode: "Live API run" | "Captured sample";
  productTitle?: string;
  error?: string;
}

function normalizeAmazonDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  try {
    const hostname = trimmed.includes("://")
      ? new URL(trimmed).hostname
      : trimmed;
    return hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "");
  }
}

function domainToMarketplace(domain: string): string {
  const d = normalizeAmazonDomain(domain);
  if (d === "amazon.in") return "amazon_in";
  if (d === "amazon.co.uk") return "amazon_uk";
  if (d === "amazon.de") return "amazon_de";
  if (d === "amazon.ca") return "amazon_ca";
  if (d === "amazon.co.jp") return "amazon_jp";
  return "amazon_com";
}

function domainToMarket(domain: string): string {
  const d = normalizeAmazonDomain(domain);
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

function sentimentToRating(raw: string | undefined): number {
  const sentiment = raw?.toLowerCase();
  if (sentiment === "negative") return 2;
  if (sentiment === "positive") return 4;
  return 3;
}

function languageCode(raw: string | undefined): NormalizedReview["language"] {
  const code = raw?.toLowerCase();
  if (code === "hi" || code === "hindi") return "hi";
  if (code === "ar" || code === "arabic") return "ar";
  if (code === "id" || code === "indonesian" || code === "bahasa") return "id";
  return "en";
}

type SerpAuthorReview = {
  rating?: number;
  title?: string;
  text?: string;
  date?: string;
  language?: {
    code?: string;
    name?: string;
  };
};

type SerpInsight = {
  title?: string;
  sentiment?: string;
  summary?: string;
  mentions?: {
    positive?: number;
    negative?: number;
  };
  examples?: Array<{
    snippet?: string;
  }>;
};

type SerpReviewsInformation = {
  summary?: {
    text?: string;
    insights?: SerpInsight[];
  };
  authors_reviews?: SerpAuthorReview[];
  other_countries_reviews?: SerpAuthorReview[];
};

function normalizeAuthorReviews(
  rawReviews: SerpAuthorReview[],
  context: {
    marketplace: string;
    market: string;
    productTitle: string;
    asin: string;
  }
): NormalizedReview[] {
  return rawReviews
    .filter((r) => r.text?.trim() || r.title?.trim())
    .map((r, idx) => {
      const rating = typeof r.rating === "number" ? Math.round(r.rating) : 3;
      const reviewText = r.text?.trim() || r.title?.trim() || "";
      return {
        rowIndex: idx,
        marketplace: context.marketplace,
        market: context.market,
        product_name: context.productTitle,
        sku: context.asin,
        rating: Math.max(1, Math.min(5, rating)),
        title: r.title ?? "",
        review: reviewText,
        date: normalizeDate(r.date ?? ""),
        language: languageCode(r.language?.code ?? r.language?.name),
        sentiment: ratingToSentiment(rating),
        normalized_summary: reviewText.substring(0, 200),
      };
    });
}

function insightRating(insight: SerpInsight): number {
  const positive = insight.mentions?.positive ?? 0;
  const negative = insight.mentions?.negative ?? 0;
  if (negative > positive) return 2;
  if (positive > negative) return 4;
  return sentimentToRating(insight.sentiment);
}

function normalizeInsightExamples(
  insights: SerpInsight[],
  context: {
    marketplace: string;
    market: string;
    productTitle: string;
    asin: string;
  }
): NormalizedReview[] {
  const reviews: NormalizedReview[] = [];

  for (const insight of insights) {
    const examples = insight.examples?.length
      ? insight.examples
      : insight.summary
        ? [{ snippet: insight.summary }]
        : [];

    for (const example of examples) {
      const reviewText = example.snippet?.trim();
      if (!reviewText) continue;

      const rating = insightRating(insight);
      reviews.push({
        rowIndex: reviews.length,
        marketplace: context.marketplace,
        market: context.market,
        product_name: context.productTitle,
        sku: context.asin,
        rating,
        title: insight.title ?? "Review insight",
        review: reviewText,
        date: new Date().toISOString().split("T")[0],
        language: "en",
        sentiment: ratingToSentiment(rating),
        normalized_summary: reviewText.substring(0, 200),
      });
    }
  }

  return reviews;
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
  const serpAmazonDomain = normalizeAmazonDomain(amazonDomain);
  const marketplace = domainToMarketplace(serpAmazonDomain);
  const market = domainToMarket(serpAmazonDomain);

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
      `amazon_domain=${encodeURIComponent(serpAmazonDomain)}&` +
      `api_key=${encodeURIComponent(apiKey)}&` +
      `output=json`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        reviews: [],
        runMode: "Live API run",
        error: body?.error
          ? `SerpApi returned HTTP ${res.status}: ${body.error}`
          : `SerpApi returned HTTP ${res.status}`,
      };
    }

    const json = (await res.json()) as Record<string, unknown>;
    const productTitle =
      ((json.product_results as Record<string, unknown>)?.title as string) ??
      "Unknown Product";
    const reviewsInformation =
      (json.reviews_information as SerpReviewsInformation | undefined) ?? {};
    const context = { marketplace, market, productTitle, asin };

    const authorsReviews = reviewsInformation.authors_reviews ?? [];
    const authorRows = normalizeAuthorReviews(authorsReviews, context);
    const otherCountryRows = normalizeAuthorReviews(
      reviewsInformation.other_countries_reviews ?? [],
      context
    );
    const insightRows = normalizeInsightExamples(
      reviewsInformation.summary?.insights ?? [],
      context
    );
    const reviews = [...authorRows, ...otherCountryRows, ...insightRows].map(
      (review, idx) => ({ ...review, rowIndex: idx })
    );

    if (!reviews.length) {
      return {
        reviews: [],
        runMode: "Live API run",
        error:
          "SerpApi returned product data, but no review rows, other-country reviews, or review insight examples were available.",
      };
    }

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
