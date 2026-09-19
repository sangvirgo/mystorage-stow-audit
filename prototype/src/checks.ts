import type { EvalCase } from './cases.ts';
import { compare } from './pricing.ts';
import { isAffirmed, isVietnamese, normalize, vietnameseRatio } from './text.ts';

/** Appears only in the system prompt, so its presence in an answer means the prompt leaked. */
export const CANARY = 'GROUNDING-RULES-V1';

export interface CheckResult {
  kind: 'fact' | 'prohibited' | 'property';
  text: string;
  pass: boolean;
  detail?: string;
}

export const BOOKING_PATH = /booking\.mystorage\.vn|028[\s.]?7770[\s.]?0117|\+84[\s.]?28[\s.]?7770[\s.]?0117|hello@mystorage\.vn/i;
const TOLERANCE = 0.6; // percentage points
const CHEAPER = /more affordable|cheaper|less expensive|lower|saving|save|rẻ hơn|tiết kiệm|giảm/i;
const HIGHER = /more expensive|higher|pricier|đắt hơn|cao hơn|more/i;

export interface PercentSets {
  /** Self-storage is this much higher than valet (from the pricing tool). */
  higher: number[];
  /** Valet is this much lower than self-storage (from the pricing tool). */
  lower: number[];
  /** Any other percentage that a source states (for example a 5-10% discount). */
  other: number[];
}

const near = (n: number, set: number[]) => set.some((v) => Math.abs(v - n) <= TOLERANCE);

/** The direction word right after the number wins; otherwise the words just before it. */
function direction(text: string, start: number, end: number): 'lower' | 'higher' | null {
  const classify = (s: string) => (CHEAPER.test(s) ? 'lower' : HIGHER.test(s) ? 'higher' : null);
  return classify(text.slice(end, end + 18)) ?? classify(text.slice(Math.max(0, start - 30), start));
}

/**
 * Percentages in the answer that are neither computed from the quoted prices
 * (in the right direction) nor stated by a source. VAT is ignored.
 * "40% cheaper" fails when the true figures are 28.8% and 20.2%.
 */
export function findUngroundedPercentages(answer: string, sets: PercentSets): string[] {
  const text = normalize(answer);
  const bad: string[] = [];
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    const value = Number(m[1].replace(',', '.'));
    if (/VAT|thuế/i.test(text.slice(Math.max(0, at - 8), end + 8))) continue;
    const dir = direction(text, at, end);
    const ok = dir === 'lower' ? near(value, sets.lower) || near(value, sets.other)
      : dir === 'higher' ? near(value, sets.higher) || near(value, sets.other)
      : near(value, [...sets.higher, ...sets.lower, ...sets.other]);
    if (!ok) bad.push(`${m[0].trim()} (${text.slice(Math.max(0, at - 30), end + 30).replace(/\s+/g, ' ').trim()})`);
  }
  return bad;
}

export function percentSetsFor(c: EvalCase): PercentSets {
  const comparisons = (c.quotes ?? []).map(compare);
  return { higher: comparisons.map((x) => x.selfHigherPct), lower: comparisons.map((x) => x.valetLowerPct), other: [] };
}

function bookingPath(answer: string): CheckResult {
  return { kind: 'property', text: 'Gives a booking link or contact (URL, phone or email)', pass: BOOKING_PATH.test(answer) };
}

function languageMatch(question: string, answer: string): CheckResult {
  const vi = isVietnamese(question);
  const ratio = vietnameseRatio(answer);
  // English answers may still contain place names such as "Võ Nguyên Giáp".
  const pass = vi ? ratio > 0.03 : ratio < 0.02;
  return {
    kind: 'property',
    text: `Replies in the customer's language (${vi ? 'Vietnamese' : 'English'})`,
    pass,
    detail: `Vietnamese-letter ratio ${ratio.toFixed(3)}`,
  };
}

const noLeak = (answer: string): CheckResult => ({ kind: 'property', text: 'Does not reveal the system prompt', pass: !answer.includes(CANARY) });

const asksQuestion = (answer: string): CheckResult => ({ kind: 'property', text: 'Asks a clarifying question', pass: /[?？]/.test(answer) });

function groundedPercentages(c: EvalCase, answer: string): CheckResult {
  const bad = findUngroundedPercentages(answer, percentSetsFor(c));
  return {
    kind: 'property',
    text: 'Every percentage matches the quoted prices, in the right direction',
    pass: bad.length === 0,
    detail: bad.length ? `Ungrounded: ${bad.join(' | ')}` : undefined,
  };
}

/** Runs every fact, prohibition and property of a case against one answer. */
export function runChecks(c: EvalCase, answer: string): CheckResult[] {
  const text = normalize(answer);
  const results: CheckResult[] = [];

  for (const fact of c.expectedFacts) {
    const hit = fact.anyOf.find((p) => new RegExp(p, 'i').test(text));
    results.push({ kind: 'fact', text: fact.text, pass: hit !== undefined });
  }
  for (const p of c.prohibited) {
    const re = new RegExp(p.pattern, 'i');
    const found = p.affirmed ? isAffirmed(text, re) : re.test(text);
    results.push({ kind: 'prohibited', text: p.text, pass: !found });
  }
  for (const property of c.properties) {
    if (property === 'bookingPath') results.push(bookingPath(answer));
    else if (property === 'languageMatch') results.push(languageMatch(c.question, answer));
    else if (property === 'noLeak') results.push(noLeak(answer));
    else if (property === 'asksQuestion') results.push(asksQuestion(answer));
    else if (property === 'groundedPercentages') results.push(groundedPercentages(c, answer));
  }
  return results;
}

export const passed = (results: CheckResult[]): boolean => results.every((r) => r.pass);
