import type { NormalizedReview } from "@/lib/workbench/normalizer";
import type { AiAnalysisProvider, AiAnalysisResult } from "./schema";
import { SampleAnalysisProvider } from "./sample-provider";
import { NvidiaGlmProvider } from "./nvidia-glm";

export function getProvider(): AiAnalysisProvider {
  if (process.env.NVIDIA_API_KEY) {
    return new NvidiaGlmProvider();
  }
  return new SampleAnalysisProvider();
}

export async function analyzeWithFallback(
  reviews: NormalizedReview[]
): Promise<AiAnalysisResult> {
  const primary = getProvider();
  const result = await primary.analyze(reviews);

  if (result.success) {
    return result;
  }

  if (primary.name === "nvidia") {
    const fallback = new SampleAnalysisProvider();
    const fb = await fallback.analyze(reviews);
    if (fb.success) {
      return {
        ...fb,
        metadata: {
          provider: fb.metadata.provider,
          model: fb.metadata.model,
          fallbackFrom: `${primary.name}/${primary.model}`,
          fallbackReason: result.error,
        },
      };
    }
  }

  return result;
}
