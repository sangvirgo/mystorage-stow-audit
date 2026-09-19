import { loadCorpus, loadPrompt } from './cases.ts';
import type { Chunk, EvalCase } from './cases.ts';
import { generate } from './gemini.ts';
import type { GeminiConfig } from './gemini.ts';
import { compare, describe } from './pricing.ts';
import { isVietnamese } from './text.ts';
import { validateAnswer } from './validate.ts';

const sourceBlock = (chunks: Chunk[]): string =>
  chunks.map((s) => `[${s.id}] ${s.title}\nURL: ${s.source_url} (retrieved ${s.retrieved}; ${s.provenance})\n${s.text}`).join('\n\n');

const quoteLines = (c: EvalCase): string[] =>
  (c.quotes ?? []).map((q) => `${q.label}: valet ${q.valet.toLocaleString('en-US')} VND, self-storage ${q.self.toLocaleString('en-US')} VND per month`);

/** Same model, same sources, same prices: only a plain instruction and no computed percentages. */
export async function naiveAnswer(cfg: GeminiConfig, c: EvalCase): Promise<string> {
  const quotes = quoteLines(c);
  const prices = quotes.length ? `\n\nPRICE QUOTES (${c.quotesProvenance ?? ''}):\n${quotes.join('\n')}` : '';
  return generate(cfg, loadPrompt('baseline'), `SOURCES:\n${sourceBlock(loadCorpus())}${prices}\n\nCUSTOMER MESSAGE:\n${c.question}`);
}

/** The prompt forbids bracketed source ids, but the model still prints some, so code removes them. */
export function stripSourceTags(text: string, sources: Chunk[]): string {
  const ids = sources.map((s) => s.id.replace(/[-]/g, '\\-')).join('|');
  return text
    .replace(new RegExp(`\\s*\\((?:\\s*\\[(?:${ids})\\]\\s*,?)+\\s*\\)`, 'g'), '')
    .replace(new RegExp(`\\s*\\[(?:${ids})\\]`, 'g'), '');
}

export interface ProposedResult {
  /** Reply that would be shown to the customer. */
  final: string;
  /** First reply, before validation. */
  firstPass: string;
  /** Rules the first reply broke. Empty when no repair was needed. */
  violations: string[];
  /** Rules the final reply still breaks after the single repair. */
  remaining: string[];
}

/**
 * Rules in the prompt, percentages computed by code and handed over as facts,
 * then a runtime check. If the check fails, one repair call gets the violations
 * and the previous reply. The whole source registry (about 3,000 tokens) is in
 * the prompt, so there is no retrieval step to miss a fact.
 */
export async function proposedAnswer(cfg: GeminiConfig, c: EvalCase): Promise<ProposedResult> {
  const sources = loadCorpus();
  const facts = c.quotes?.length
    ? `\n\nCOMPUTED FACTS (from the pricing tool; ${c.quotesProvenance ?? ''}):\n${c.quotes.map((q) => describe(compare(q))).join('\n')}`
    : '';
  // Language is decided in code: the model sometimes answers English questions in Vietnamese.
  const language = `REPLY LANGUAGE: ${isVietnamese(c.question) ? 'Vietnamese' : 'English'}`;
  const user = `SOURCES:\n${sourceBlock(sources)}${facts}\n\n${language}\n\nCUSTOMER MESSAGE:\n${c.question}`;
  const system = loadPrompt('system');

  const firstPass = stripSourceTags(await generate(cfg, system, user), sources);
  const violations = validateAnswer(c, sources, firstPass);
  if (violations.length === 0) return { final: firstPass, firstPass, violations, remaining: [] };

  const repairRequest = `${user}\n\nYOUR PREVIOUS REPLY:\n${firstPass}\n\nIT BROKE THESE RULES:\n${violations.map((v) => `- ${v}`).join('\n')}\n\nWrite the corrected reply to the customer. Fix only these problems.`;
  const final = stripSourceTags(await generate(cfg, system, repairRequest), sources);
  return { final, firstPass, violations, remaining: validateAnswer(c, sources, final) };
}
