import { NextRequest, NextResponse } from "next/server";
import { analyzeWithFallback } from "@/lib/live/providers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviews } = body;

    if (!Array.isArray(reviews)) {
      return NextResponse.json(
        { success: false, error: "reviews array is required" },
        { status: 400 }
      );
    }

    const result = await analyzeWithFallback(reviews);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
