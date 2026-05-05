import type { NormalizedReview } from "@/lib/workbench/normalizer";
import type { WorkbenchAnalysis } from "@/lib/workbench/analysis";

export interface ProviderMetadata {
  provider: string;
  model: string;
  fallbackFrom?: string;
  fallbackReason?: string;
}

export interface AiAnalysisResult {
  success: boolean;
  analysis: WorkbenchAnalysis;
  metadata: ProviderMetadata;
  error?: string;
}

export interface AiAnalysisProvider {
  readonly name: string;
  readonly model: string;
  analyze(reviews: NormalizedReview[]): Promise<AiAnalysisResult>;
}
