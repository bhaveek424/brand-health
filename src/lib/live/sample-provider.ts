import type { NormalizedReview } from "@/lib/workbench/normalizer";
import { analyzeWorkbench } from "@/lib/workbench/analysis";
import type { AiAnalysisProvider, AiAnalysisResult } from "./schema";

export class SampleAnalysisProvider implements AiAnalysisProvider {
  readonly name = "sample";
  readonly model = "deterministic";

  async analyze(reviews: NormalizedReview[]): Promise<AiAnalysisResult> {
    const analysis = analyzeWorkbench(reviews);
    return {
      success: true,
      analysis,
      metadata: { provider: this.name, model: this.model },
    };
  }
}
