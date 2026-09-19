/**
 * Makes numbers and ranges comparable: "1.509.000" and "1,509,000" both become
 * "1509000", and "12 – 15" becomes "12-15". Other text is left alone.
 */
export function normalize(text: string): string {
  let t = text.replace(/[–—−]/g, '-').replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
  // Thousand separators: a . or , between a digit and exactly three digits.
  while (/(\d)[.,](\d{3})(?!\d)/.test(t)) t = t.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2');
  return t;
}

const VIETNAMESE_LETTERS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi;

/** Share of letters that carry Vietnamese diacritics (0 to 1). */
export function vietnameseRatio(text: string): number {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const marked = text.match(VIETNAMESE_LETTERS)?.length ?? 0;
  return letters === 0 ? 0 : marked / letters;
}

export const isVietnamese = (text: string): boolean => vietnameseRatio(text) > 0;

// A negation word shortly before a match means the sentence denies the claim
// ("chưa có kế hoạch mở", "not confirmed"). Heuristic, so outputs are read by a human too.
const NEGATION = /(?:^|[\s,;(])(?:không|chưa|no|not|never|cannot|unable)(?=[\s,.;)])|n['’]t\b/i;

/** True if `pattern` occurs in `text` and at least one occurrence is not negated. */
export function isAffirmed(text: string, pattern: RegExp): boolean {
  const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  for (const m of text.matchAll(global)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}
