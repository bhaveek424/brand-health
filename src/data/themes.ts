import { Theme } from "@/lib/schema";

export const themes: Theme[] = [
  {
    id: "theme_handle_breakage",
    label: "Handle Breakage",
    description: "Reviews mentioning broken, loose, cracked, or detaching handles.",
    severity: "critical",
    keyword_signature: [
      "broke",
      "broken",
      "loose",
      "detached",
      "cracked",
      "falling off",
      "came off",
      "snapped off",
      "handle broke",
      "handle broken",
      "handle detached",
      "handle cracked",
      "handle loose",
      "handle came off",
      "handel tuta",
      "हैंडल",
      "handle tuta",
      "handle alag",
      "مقبض مكسور",
      "مقبض كسر",
      "انفصل المقبض",
      "انكسر المقبض",
      "كسر المقبض",
      "انفصل",
      "انكسر",
    ],
  },
  {
    id: "theme_coating_peeling",
    label: "Coating Peeling",
    description: "Non-stick coating flaking, peeling, or scratching off prematurely.",
    severity: "high",
    keyword_signature: [
      "coating",
      "peel",
      "peeling",
      "flaking",
      "scratch",
      "non stick gone",
      "coating came off",
      "coating peel",
      "coating damage",
      "coating scratch",
    ],
  },
  {
    id: "theme_late_delivery",
    label: "Late Delivery",
    description: "Product arrived significantly later than promised.",
    severity: "low",
    keyword_signature: ["late delivery", "delayed", "not delivered on time", "shipping delay", "took too long"],
  },
  {
    id: "theme_wrong_item",
    label: "Wrong Item Received",
    description: "Customer received a different product than ordered.",
    severity: "medium",
    keyword_signature: ["wrong item", "different product", "not what i ordered", "incorrect item"],
  },
  {
    id: "theme_packaging_damage",
    label: "Packaging Damage",
    description: "Damaged box or packaging upon arrival.",
    severity: "low",
    keyword_signature: ["box damaged", "packaging torn", "damaged package", "poor packaging"],
  },
  {
    id: "theme_size_mismatch",
    label: "Size / Expectation Mismatch",
    description: "Product size or quality did not meet customer expectations.",
    severity: "medium",
    keyword_signature: ["smaller than expected", "not as described", "size issue", "expectation", "misleading"],
  },
  {
    id: "theme_warranty_support",
    label: "Warranty / Support Friction",
    description: "Difficulty with warranty claims, support responsiveness, or returns.",
    severity: "high",
    keyword_signature: ["warranty", "support", "no response", "refund issue", "return rejected", "customer service"],
  },
];

export function getThemeById(id: string) {
  return themes.find((t) => t.id === id);
}

export function findThemesByKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return themes
    .filter((t) => t.keyword_signature.some((kw) => lower.includes(kw.toLowerCase())))
    .map((t) => t.id);
}
