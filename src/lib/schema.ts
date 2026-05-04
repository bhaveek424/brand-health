// Opptra Brand Health Agent — Normalized Data Schema
// Production seam: swap static fixtures for database / marketplace adapters

export type Marketplace = "amazon_in" | "flipkart_in" | "noon_uae" | "noon_ksa";
export type Market = "IN" | "UAE" | "KSA";
export type Sentiment = "positive" | "neutral" | "negative";
export type Language = "en" | "hi" | "ar" | "id";
export type ResponseStatus = "draft" | "approved" | "rejected" | "published";

export interface Brand {
  id: string;
  name: string;
  category: string;
  brand_voice: string;
  forbidden_phrases: string[];
  warranty_policy: string;
  support_policy: string;
  locale_rules: Record<Language, { tone: string; greeting: string; closing: string }>;
  approved_response_examples: Record<string, string[]>;
}

export interface Product {
  id: string;
  brand_id: string;
  sku: string;
  name: string;
  category: string;
  launch_date: string; // ISO date
  market: Market;
  marketplace_ids: Marketplace[];
  estimated_recent_orders: number;
  estimated_gmv: number; // USD
}

export interface Review {
  id: string;
  product_id: string;
  marketplace: Marketplace;
  market: Market;
  language: Language;
  rating: number; // 1-5
  title: string;
  body: string;
  date: string; // ISO date
  verified_purchase: boolean;
  helpful_count: number;
  normalized_summary: string; // English summary for cross-language analysis
  sentiment: Sentiment;
  theme_ids: string[];
}

export interface Theme {
  id: string;
  label: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  keyword_signature: string[];
}

export interface IssueTrend {
  id: string;
  product_id: string;
  theme_id: string;
  current_period: { start: string; end: string };
  baseline_period: { start: string; end: string };
  current_share: number; // 0-1
  baseline_share: number; // 0-1
  delta: number; // absolute change
  relative_change: number; // multiplier
  affected_review_ids: string[];
  confidence: number; // 0-1
  estimated_order_exposure: number;
  estimated_gmv_exposure: number; // USD
  affected_marketplaces: Marketplace[];
  affected_languages: Language[];
}

export interface DraftResponse {
  id: string;
  review_id: string;
  language: Language;
  generated_text: string;
  checklist_results: ChecklistResult;
  status: ResponseStatus;
  edited_text?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface ChecklistResult {
  language_match: boolean;
  mentions_exact_issue: boolean;
  empathetic_tone: boolean;
  avoids_prohibited_claims: boolean;
  includes_support_path: boolean;
  within_character_limit: boolean;
  avoids_over_admitting_fault: boolean;
}

export interface WeeklyBrief {
  id: string;
  brand_id: string;
  product_id: string;
  period: { start: string; end: string };
  executive_summary: string;
  top_risks: RiskItem[];
  recommended_actions: ActionItem[];
  supplier_escalation_draft: string;
  marketplace_listing_recommendation: string;
  support_warranty_recommendation: string;
  generated_at: string;
}

export interface RiskItem {
  theme_id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence_summary: string;
  affected_marketplaces: Marketplace[];
  estimated_exposure_orders: number;
}

export interface ActionItem {
  function: "category" | "support" | "marketplace" | "supplier" | "warranty";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface BrandRiskScore {
  score: number; // 0-100
  breakdown: {
    negative_review_rate: number;
    rating_trend_delta: number;
    issue_spike_severity: number;
    review_volume_factor: number;
    marketplace_concentration: number;
    estimated_order_exposure: number;
    warranty_intent_factor: number;
  };
}

export interface IngestionAdapter {
  name: Marketplace;
  fetchReviews(params: { productId: string; since: string }): Promise<Review[]>;
}
