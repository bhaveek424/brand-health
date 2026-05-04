import { ColumnMapping } from "./column-mapper";
import { NormalizedReview, ValidationError } from "./normalizer";

export interface EngineeringHandoff {
  observedData: ObservedData;
  inputSchema: { headers: string[]; mappedColumns: Record<string, string>; unmappedColumns: string[] };
  normalizedSchema: string[];
  businessRules: string[];
  humanApprovalCheckpoints: string[];
  edgeCases: string[];
  productionRequirements: string[];
  suggestedIntegrations: string[];
}

export interface ObservedData {
  totalUploadedRows: number;
  acceptedRows: number;
  rejectedRows: number;
  marketsSeen: string[];
  marketplacesSeen: string[];
  skusSeen: string[];
  validationErrors: ValidationError[];
}

export function generateHandoff(
  headers: string[],
  mapping: ColumnMapping,
  accepted: NormalizedReview[],
  rejected: ValidationError[],
  totalUploadedRows: number
): EngineeringHandoff {
  const mappedColumns: Record<string, string> = {};
  for (const [field, header] of Object.entries(mapping.mapped)) {
    mappedColumns[field] = header ?? "";
  }

  const marketsSeen = [...new Set(accepted.map((r) => r.market))].sort();
  const marketplacesSeen = [...new Set(accepted.map((r) => r.marketplace))].sort();
  const skusSeen = [...new Set(accepted.map((r) => r.sku))].sort();

  const observedData: ObservedData = {
    totalUploadedRows,
    acceptedRows: accepted.length,
    rejectedRows: rejected.length,
    marketsSeen,
    marketplacesSeen,
    skusSeen,
    validationErrors: rejected,
  };

  const normalizedSchema = [
    "rowIndex (number)",
    "marketplace (string)",
    "market (string)",
    "product_name (string)",
    "sku (string)",
    "rating (number 1-5)",
    "title (string)",
    "review (string)",
    "date (ISO date)",
    "language (en | hi | ar | id)",
    "sentiment (positive | neutral | negative)",
    "normalized_summary (string)",
  ];

  const businessRules = [
    "Rating must be numeric between 1 and 5.",
    "Review body cannot be empty after trim.",
    "Language mapped from raw values: en, hi, ar, id; defaults to en.",
    "Sentiment derived from rating: 1-2 negative, 3 neutral, 4-5 positive.",
    "Date normalized to ISO YYYY-MM-DD.",
    "Theme detection runs keyword signature match on review + title.",
  ];

  const humanApprovalCheckpoints = [
    "Public customer reply drafts must be reviewed before copy-paste.",
    "Supplier escalation note must be approved by category lead.",
    "Listing recommendations must pass content/marketplace ops review.",
    "Action brief sign-off before weekly standup share.",
  ];

  const edgeCases = [
    "CSV with quoted commas in review cells.",
    "Duplicate headers or extra whitespace in header row.",
    "Missing required columns: reject rows or fail fast with clear error list.",
    "Ratings outside 1-5 range.",
    "Dates in non-standard formats fallback to today.",
    "Non-ASCII characters in review text must be preserved.",
    "Very large CSV uploads need streaming parser in production.",
  ];

  const productionRequirements = [
    "Accept CSV and Excel (.xlsx) uploads.",
    "Server-side validation with row-level error reporting.",
    "Async analysis queue for large files.",
    "Audit log of uploaded files, mappings, and approved drafts.",
    "Role-based access: category manager, support lead, content ops, engineering read.",
    "Webhook or Slack notification when analysis complete.",
    "Retention policy for PII in review text.",
  ];

  const suggestedIntegrations = [
    "Marketplace adapters: Amazon SP-API, Flipkart, Noon.",
    "AI provider abstraction: NVIDIA GLM-5.1, Gemini, OpenAI.",
    "Notification: Slack webhook, email via SendGrid.",
    "Storage: S3 / GCS for raw uploads, PostgreSQL for normalized rows.",
    "Cache: Redis for live run results.",
  ];

  return {
    observedData,
    inputSchema: { headers, mappedColumns, unmappedColumns: mapping.unmapped },
    normalizedSchema,
    businessRules,
    humanApprovalCheckpoints,
    edgeCases,
    productionRequirements,
    suggestedIntegrations,
  };
}
