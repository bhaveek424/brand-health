import type { NormalizedReview } from "@/lib/workbench/normalizer";
import type { WorkbenchAnalysis, ThemeResult } from "@/lib/workbench/analysis";
import type { AiAnalysisProvider, AiAnalysisResult } from "./schema";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

function emptyAnalysis(): WorkbenchAnalysis {
  return {
    total: 0,
    accepted: 0,
    rejected: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    sentimentSplit: { positive: 0, neutral: 0, negative: 0 },
    productBreakdown: {},
    skuBreakdown: {},
    topThemes: [],
    topRisks: [],
  };
}

export class NvidiaGlmProvider implements AiAnalysisProvider {
  readonly name = "nvidia";
  readonly model: string;

  constructor(model?: string) {
    this.model = model ?? process.env.NVIDIA_MODEL ?? DEFAULT_MODEL;
  }

  async analyze(reviews: NormalizedReview[]): Promise<AiAnalysisResult> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        analysis: emptyAnalysis(),
        metadata: { provider: this.name, model: this.model },
        error: "NVIDIA_API_KEY not configured",
      };
    }

    try {
      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: userPrompt(reviews) },
          ],
          temperature: 0.1,
          max_tokens: 1600,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          analysis: emptyAnalysis(),
          metadata: { provider: this.name, model: this.model },
          error: `NVIDIA API error ${response.status}: ${text}`,
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          analysis: emptyAnalysis(),
          metadata: { provider: this.name, model: this.model },
          error: "Empty response from NVIDIA API",
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return {
          success: false,
          analysis: emptyAnalysis(),
          metadata: { provider: this.name, model: this.model },
          error: "Model returned invalid JSON",
        };
      }

      const validated = validateAnalysis(parsed);
      if (!validated) {
        return {
          success: false,
          analysis: emptyAnalysis(),
          metadata: { provider: this.name, model: this.model },
          error: "Model output failed validation",
        };
      }

      return {
        success: true,
        analysis: validated,
        metadata: { provider: this.name, model: this.model },
      };
    } catch (err) {
      return {
        success: false,
        analysis: emptyAnalysis(),
        metadata: { provider: this.name, model: this.model },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function systemPrompt(): string {
  return [
    "You are a product review analysis engine.",
    "Analyze the provided reviews and return STRICT JSON matching this exact schema:",
    JSON.stringify({
      total: "number",
      accepted: "number",
      rejected: "number",
      ratingDistribution: { "1": "number", "2": "number", "3": "number", "4": "number", "5": "number" },
      sentimentSplit: { positive: "number", neutral: "number", negative: "number" },
      productBreakdown: "Record<string, number>",
      skuBreakdown: "Record<string, number>",
      topThemes: [
        {
          label: "string",
          count: "number",
          share: "number between 0 and 1",
          severity: "low | medium | high | critical",
          evidence: "string[] max 3 items",
        },
      ],
      topRisks: [
        {
          title: "string",
          severity: "low | medium | high | critical",
          description: "string",
        },
      ],
    }),
    "Do not include markdown, explanations, or any text outside the JSON object.",
    "Ensure all numbers are accurate based on the input reviews.",
  ].join("\n");
}

function userPrompt(reviews: NormalizedReview[]): string {
  const summary = reviews.slice(0, 50).map((r) => ({
    product_name: r.product_name,
    sku: r.sku,
    rating: r.rating,
    review: r.review.substring(0, 400),
    sentiment: r.sentiment,
  }));
  return `Analyze these ${reviews.length} product reviews and return only valid JSON:\n\n${JSON.stringify(summary, null, 2)}`;
}

function validateAnalysis(parsed: unknown): WorkbenchAnalysis | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  if (typeof p.total !== "number") return null;
  if (typeof p.accepted !== "number") return null;
  if (typeof p.rejected !== "number") return null;
  if (!p.ratingDistribution || typeof p.ratingDistribution !== "object") return null;
  if (!p.sentimentSplit || typeof p.sentimentSplit !== "object") return null;
  if (!p.productBreakdown || typeof p.productBreakdown !== "object") return null;
  if (!p.skuBreakdown || typeof p.skuBreakdown !== "object") return null;
  if (!Array.isArray(p.topThemes)) return null;
  if (!Array.isArray(p.topRisks)) return null;

  const rd = p.ratingDistribution as Record<string, unknown>;
  for (const k of ["1", "2", "3", "4", "5"]) {
    if (typeof rd[k] !== "number") return null;
  }

  const ss = p.sentimentSplit as Record<string, unknown>;
  for (const k of ["positive", "neutral", "negative"]) {
    if (typeof ss[k] !== "number") return null;
  }

  for (const t of p.topThemes) {
    if (!t || typeof t !== "object") return null;
    const theme = t as Record<string, unknown>;
    if (typeof theme.label !== "string") return null;
    if (typeof theme.count !== "number") return null;
    if (typeof theme.share !== "number") return null;
    const sev = theme.severity as string;
    if (!["low", "medium", "high", "critical"].includes(sev)) return null;
    if (!Array.isArray(theme.evidence)) return null;
    for (const e of theme.evidence) {
      if (typeof e !== "string") return null;
    }
  }

  for (const r of p.topRisks) {
    if (!r || typeof r !== "object") return null;
    const risk = r as Record<string, unknown>;
    if (typeof risk.title !== "string") return null;
    const sev = risk.severity as string;
    if (!["low", "medium", "high", "critical"].includes(sev)) return null;
    if (typeof risk.description !== "string") return null;
  }

  return {
    total: p.total,
    accepted: p.accepted,
    rejected: p.rejected,
    ratingDistribution: rd as Record<number, number>,
    sentimentSplit: ss as Record<string, number>,
    productBreakdown: p.productBreakdown as Record<string, number>,
    skuBreakdown: p.skuBreakdown as Record<string, number>,
    topThemes: p.topThemes as ThemeResult[],
    topRisks: p.topRisks as { title: string; severity: ThemeResult["severity"]; description: string }[],
  };
}
