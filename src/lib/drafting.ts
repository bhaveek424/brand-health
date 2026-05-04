import { DraftResponse, ChecklistResult, Language, Review } from "@/lib/schema";
import { towerBrand } from "@/data/brands";

// Deterministic response drafting with brand guardrails
// Production seam: swap for LLM generation with same interface

const CHAR_LIMIT: Record<string, number> = {
  amazon_in: 2000,
  flipkart_in: 1500,
  noon_uae: 2000,
  noon_ksa: 2000,
};

// Localized support-path text per language
const SUPPORT_PATH: Record<Language, string> = {
  en: "Please email support@towercookware.com with your order ID and a photo so we can assist you promptly.",
  hi: "Kripya support@towercookware.com par apna order ID aur ek photo bhejein taaki hum turant madad kar saken.",
  ar: "يرجى إرسال بريد إلكتروني إلى support@towercookware.com مع رقم الطلب وصورة حتى نتمكن من مساعدتك فوراً.",
  id: "Harap email support@towercookware.com dengan ID pesanan dan foto agar kami dapat segera membantu.",
};

export function draftResponse(review: Review, themeLabel: string): DraftResponse {
  const locale = towerBrand.locale_rules[review.language];
  const greeting = locale.greeting;
  const closing = locale.closing;
  const charLimit = CHAR_LIMIT[review.marketplace] ?? 2000;

  const generated = generateText(review, themeLabel, greeting, closing);

  const checklist: ChecklistResult = {
    language_match: checkLanguageMatch(generated, review.language),
    mentions_exact_issue: checkMentionsExactIssue(generated, review.language, themeLabel),
    empathetic_tone: hasEmpathy(generated),
    avoids_prohibited_claims: !towerBrand.forbidden_phrases.some((fp) =>
      generated.toLowerCase().includes(fp.toLowerCase())
    ),
    includes_support_path: checkSupportPath(generated),
    within_character_limit: generated.length <= charLimit,
    avoids_over_admitting_fault: !hasOverAdmission(generated),
  };

  return {
    id: `draft_${review.id}`,
    review_id: review.id,
    language: review.language,
    generated_text: generated,
    checklist_results: checklist,
    status: "draft",
  };
}

function generateText(
  review: Review,
  themeLabel: string,
  greeting: string,
  closing: string
): string {
  const issueWord = resolveIssueWord(review.language, themeLabel);
  const supportPath = SUPPORT_PATH[review.language];

  if (review.language === "en") {
    return `${greeting} We\'re sorry to hear about the ${issueWord} problem you experienced. Your safety and satisfaction matter to us, and we\'d like to make this right. ${supportPath}\n\n${closing}`;
  }

  if (review.language === "hi") {
    return `${greeting} Aapke ${issueWord} ki samasya sunke hume afsos hua. Aapki suraksha aur santushti hamare liye zaroori hai, aur hum isko sahi karna chahte hain. ${supportPath}\n\n${closing}`;
  }

  if (review.language === "ar") {
    return `${greeting} نأسف لسماع مشكلة ${issueWord} التي واجهتها. سلامتك ورضاك يهمنا، ونريد أن نصحح الأمور. ${supportPath}\n\n${closing}`;
  }

  if (review.language === "id") {
    return `${greeting} Kami menyesal mendengar masalah ${issueWord} yang Anda alami. Keselamatan dan kepuasan Anda penting bagi kami, dan kami ingin memperbaiki hal ini. ${supportPath}\n\n${closing}`;
  }

  return `${greeting} We are sorry to hear about the ${issueWord} problem. ${supportPath}\n\n${closing}`;
}

function resolveIssueWord(lang: Language, themeLabel: string): string {
  const lower = themeLabel.toLowerCase();
  const isHandle = lower.includes("handle");
  const isCoating = lower.includes("coating");

  if (lang === "ar") {
    if (isHandle) return "المقبض";
    if (isCoating) return "الطلاء";
    return "المنتج";
  }
  if (lang === "hi") {
    if (isHandle) return "handle";
    if (isCoating) return "coating";
    return "samasyaa";
  }
  if (lang === "id") {
    if (isHandle) return "handle";
    if (isCoating) return "coating";
    return "produk";
  }
  // English fallback
  if (isHandle) return "handle";
  if (isCoating) return "coating";
  return "issue";
}

function checkLanguageMatch(text: string, lang: Language): boolean {
  switch (lang) {
    case "en":
      return /^[A-Za-z0-9\s.,'!\-—?@$%&*(){}:;/"]+$/m.test(text.substring(0, 200));
    case "hi":
      return /[\u0900-\u097F]/.test(text) || /\b(afsos|suraksha|santushti|zaroori|sahi|karna|chahte)\b/i.test(text);
    case "ar":
      return /[\u0600-\u06FF]/.test(text);
    case "id":
      return /\b(Kami|Anda|menyesal|penting|bagi|memperbaiki|segera| membantu)\b/i.test(text);
    default:
      return true;
  }
}

function checkMentionsExactIssue(text: string, lang: Language, themeLabel: string): boolean {
  const lower = text.toLowerCase();
  const tlower = themeLabel.toLowerCase();
  if (tlower.includes("handle")) {
    if (lang === "ar") return /المقبض/.test(text);
    if (lang === "hi") return /handle|हैंडल/.test(text.toLowerCase());
    return lower.includes("handle");
  }
  if (tlower.includes("coating")) {
    if (lang === "ar") return /الطلاء/.test(text);
    if (lang === "hi") return /coating|कोटिंग/.test(text.toLowerCase());
    return lower.includes("coating");
  }
  return lower.includes(tlower.split(" ")[0]);
}

function checkSupportPath(text: string): boolean {
  // The email domain must be present regardless of surrounding language
  return text.includes("support@towercookware.com");
}

function hasEmpathy(text: string): boolean {
  const empathyWords = ["sorry", "apologize", "understand", "afso", "afsos", "نأسف", "penyesal", "regret", "menyesal"];
  return empathyWords.some((w) => text.toLowerCase().includes(w));
}

function hasOverAdmission(text: string): boolean {
  const admissionPhrases = [
    "our fault",
    "we caused",
    "defective batch",
    "manufacturing error",
    "recall",
    "all pans have this",
    "guaranteed replacement",
    "automatic refund",
  ];
  return admissionPhrases.some((p) => text.toLowerCase().includes(p));
}
