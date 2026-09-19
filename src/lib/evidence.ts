import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { paths } from './config.ts';
import type { NetworkEvent } from './guards.ts';

export interface TestCase {
  id: string;
  category: string;
  message: string;
}

export interface Transcript {
  test: TestCase;
  timestamp: string;
  response: string;
  notes: string[];
}

/** The observed response is written verbatim; only the wrapper is ours. */
export function writeTranscript(t: Transcript): void {
  const body = [
    `# ${t.test.id}`,
    '',
    `Timestamp: ${t.timestamp}`,
    `Category: ${t.test.category}`,
    '',
    '## Customer message',
    '',
    t.test.message,
    '',
    '## Stow response',
    '',
    t.response,
    '',
    '## Notes',
    '',
    ...(t.notes.length ? t.notes.map((n) => `- ${n}`) : ['- none']),
    '',
  ].join('\n');
  writeFileSync(resolve(paths.transcripts, `${t.test.id}.md`), body);
}

export function appendNetwork(testId: string, events: NetworkEvent[]): void {
  if (events.length === 0) return;
  const lines = events.map((e) => JSON.stringify({ testId, ...e })).join('\n') + '\n';
  appendFileSync(resolve(paths.network, 'errors.jsonl'), lines);
}

/** Record of messages already submitted, so a re-run can never resend one. */
export interface SentEntry {
  id: string;
  submittedAt: string;
}

export function readSent(): SentEntry[] {
  return existsSync(paths.sentLog) ? JSON.parse(readFileSync(paths.sentLog, 'utf8')) : [];
}

export function recordSent(entry: SentEntry): void {
  writeFileSync(paths.sentLog, JSON.stringify([...readSent(), entry], null, 2));
}
