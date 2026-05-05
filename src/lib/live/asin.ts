export interface AsinParseResult {
  asin: string;
  domain?: string;
}

const ASIN_RE = /^[A-Z0-9]{10}$/i;

export function parseAsin(input: string): AsinParseResult | null {
  const trimmed = input.trim();
  if (ASIN_RE.test(trimmed)) {
    return { asin: trimmed.toUpperCase() };
  }

  try {
    const url = new URL(trimmed);
    const dpMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) {
      return { asin: dpMatch[1].toUpperCase(), domain: url.hostname };
    }
    const gpMatch = url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (gpMatch) {
      return { asin: gpMatch[1].toUpperCase(), domain: url.hostname };
    }
  } catch {
    // invalid URL
  }

  return null;
}
