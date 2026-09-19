import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Quote } from './pricing.ts';

export const ROOT = resolve(import.meta.dirname, '..');

export interface Fact {
  text: string;
  /** Regex sources (case-insensitive). One match is enough. Matched against normalised text. */
  anyOf: string[];
}

export interface Prohibited {
  text: string;
  pattern: string;
  /** true: ignore matches that are negated ("not confirmed"). false: any match fails. */
  affirmed: boolean;
}

export type Property = 'bookingPath' | 'languageMatch' | 'noLeak' | 'groundedPercentages' | 'asksQuestion';

export interface EvalCase {
  id: string;
  finding: string;
  /** Id of the recorded production Stow transcript that showed this problem, if any. */
  stowTranscript?: string;
  question: string;
  expectedFacts: Fact[];
  prohibited: Prohibited[];
  properties: Property[];
  quotes?: Quote[];
  quotesProvenance?: string;
  note?: string;
}

export interface Chunk {
  id: string;
  title: string;
  source_url: string;
  retrieved: string;
  provenance: string;
  text: string;
}

export type CaseSet = 'dev' | 'holdout';

const readJson = <T>(...parts: string[]): T => JSON.parse(readFileSync(resolve(ROOT, ...parts), 'utf8'));
const readText = (...parts: string[]): string => readFileSync(resolve(ROOT, ...parts), 'utf8');

export const loadCases = (set: CaseSet): EvalCase[] => readJson('evals', set === 'dev' ? 'cases.json' : 'holdout.json');
export const loadCorpus = (): Chunk[] => readJson('sources', 'corpus.json');
export const loadGolden = (): Record<string, string> => readJson('evals', 'golden.json');
export const loadPrompt = (name: 'system' | 'baseline'): string => readText('prompts', `${name}.md`);

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`Section "${heading}" not found`);
  const body = markdown.slice(start + heading.length + 3);
  const next = body.search(/\n## /);
  return (next === -1 ? body : body.slice(0, next)).trim();
}

/** The recorded, unedited Stow reply and customer message for a transcript id. */
export function loadStowTranscript(id: string): { message: string; response: string } {
  const md = readText('evals', 'baseline', `${id}.md`);
  return { message: section(md, 'Customer message'), response: section(md, 'Stow response') };
}
