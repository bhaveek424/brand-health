import { Brand } from "@/lib/schema";

export const towerBrand: Brand = {
  id: "brand_tower",
  name: "Tower",
  category: "Cookware",
  brand_voice:
    "Friendly, helpful, and solution-oriented. We take product quality seriously and want every customer to enjoy cooking with Tower. We acknowledge issues with empathy, offer clear resolution paths, and never make unverified product-quality claims.",
  forbidden_phrases: [
    "our fault",
    "blame the factory",
    "all products have this issue",
    "we don't care",
    "not our problem",
    "refund automatically",
    "free replacement no questions",
  ],
  warranty_policy:
    "Tower offers a 1-year warranty against manufacturing defects. Proof of purchase required. Accidental damage, misuse, and normal wear are not covered. Replacement or repair at Tower's discretion. Contact support@towercookware.com with order ID and photos.",
  support_policy:
    "Customers should reach out via support@towercookware.com or the marketplace messaging system. Response target: 24 hours. Escalate to category management if same issue exceeds 5% of recent reviews for a SKU.",
  locale_rules: {
    en: {
      tone: "Direct but warm. Use first name if available. Offer clear next steps.",
      greeting: "Hi there,",
      closing: "Thanks for your patience — Tower Support",
    },
    hi: {
      tone: "Respectful and warm. Mix Hindi and English naturally (Hinglish). Use 'aap' for respect.",
      greeting: "Namaste,",
      closing: "Dhanyawaad — Tower Support Team",
    },
    ar: {
      tone: "Formal and respectful. Use formal Arabic address. Emphasize care and quality commitment.",
      greeting: "عزيزي العميل،",
      closing: "مع خالص التقدير — فريق دعم تاور",
    },
    id: {
      tone: "Friendly and polite. Use formal 'Anda'. Keep sentences short.",
      greeting: "Halo,",
      closing: "Terima kasih — Tim Dukungan Tower",
    },
  },
  approved_response_examples: {
    handle_breakage: [
      "We're sorry to hear about the handle issue. This isn't the experience we want for you. Please email support@towercookware.com with your order ID and a photo so we can look into this right away.",
    ],
    coating_peeling: [
      "Thank you for letting us know about the coating. We'd like to understand what happened. Please reach out to support@towercookware.com with details and we'll advise on next steps under warranty.",
    ],
  },
};

export const brands: Record<string, Brand> = {
  brand_tower: towerBrand,
};
