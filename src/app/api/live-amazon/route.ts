import { NextRequest, NextResponse } from "next/server";
import { parseAsin } from "@/lib/live/asin";
import { fetchAmazonReviews } from "@/lib/live/amazon-serpapi";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      urlOrAsin?: string;
      amazonDomain?: string;
    };
    const { urlOrAsin, amazonDomain = "amazon.com" } = body;

    if (!urlOrAsin || typeof urlOrAsin !== "string") {
      return NextResponse.json(
        { error: "Missing urlOrAsin" },
        { status: 400 }
      );
    }

    const parsed = parseAsin(urlOrAsin);
    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse ASIN from input" },
        { status: 400 }
      );
    }

    const domain = parsed.domain ?? amazonDomain;
    const result = await fetchAmazonReviews(parsed.asin, domain);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
