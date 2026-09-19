import type { Chunk, EvalCase } from './cases.ts';
import { BOOKING_PATH, CANARY, findUngroundedPercentages, percentSetsFor } from './checks.ts';
import { normalize } from './text.ts';

/**
 * Runtime validator: rules that need no knowledge of the expected answer, so a
 * production system could run them on every reply. (The eval checks in
 * checks.ts know the right answer and are only used for scoring.)
 */

// Also matches a bare "đặt" and "muốn/cần thuê": a false positive only adds a booking link.
const BOOKING_INTENT = /\b(book|booking|reserve|reservation)\b|đặt|muốn thuê|cần thuê|đăng ký/i;
const AMOUNT = /(\d{4,})\s*(?:VND|₫|đồng|đ)/gi;

const numbersIn = (text: string, re: RegExp): number[] => Array.from(normalize(text).matchAll(re), (m) => Number(m[1]));

/** Amounts a reply may state: those in the sources, the quoted prices, and their gaps. */
function allowedAmounts(sources: Chunk[], c: EvalCase): Set<number> {
  const allowed = new Set(sources.flatMap((s) => numbersIn(s.text, /(\d{4,})/g)));
  for (const q of c.quotes ?? []) {
    allowed.add(q.valet).add(q.self).add(Math.abs(q.self - q.valet));
  }
  return allowed;
}

export function validateAnswer(c: EvalCase, sources: Chunk[], answer: string): string[] {
  const violations: string[] = [];

  const allowed = allowedAmounts(sources, c);
  const invented = [...new Set(numbersIn(answer, AMOUNT))].filter((n) => !allowed.has(n));
  if (invented.length) {
    violations.push(`These VND amounts are not in the sources or the pricing tool: ${invented.join(', ')}. Remove them, or say the team will confirm.`);
  }

  // A range such as "5-10%" allows both ends.
  const sourcePercents = sources.flatMap((s) =>
    Array.from(normalize(s.text).matchAll(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?\s*%/g), (m) => [Number(m[1]), ...(m[2] ? [Number(m[2])] : [])]).flat(),
  );
  const sets = percentSetsFor(c);
  const badPercents = findUngroundedPercentages(answer, { ...sets, other: sourcePercents });
  if (badPercents.length) {
    violations.push(`These percentages are not computed from the quoted prices or stated by a source: ${badPercents.join('; ')}.`);
  }

  const statesFigure = /\d+\s*(?:VND|₫|đồng|đ\b|%|°C|hours?|giờ)|\d{1,2}:\d{2}/i.test(normalize(answer));
  const cited = sources.some((s) => answer.includes(s.source_url.replace(/\/$/, '')));
  // Figures from the pricing tool (quotes) are not sourced from a page, so those cases are exempt.
  if (statesFigure && !cited && !c.quotes?.length) {
    violations.push('The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.');
  }

  if (BOOKING_INTENT.test(c.question) && !BOOKING_PATH.test(answer)) {
    violations.push('The customer asked about booking: end with the booking link and the phone or email.');
  }
  if (answer.includes(CANARY)) violations.push('The reply reveals internal instructions.');

  return violations;
}
