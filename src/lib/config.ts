import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const STOW_URL = 'https://stow.mystorage.vn';
export const ROOT = resolve(import.meta.dirname, '..', '..');

export const paths = {
  storageState: resolve(ROOT, 'auth', 'storage-state.json'),
  cases: resolve(ROOT, 'tests', 'cases.json'),
  transcripts: resolve(ROOT, 'evidence', 'transcripts'),
  screenshots: resolve(ROOT, 'evidence', 'screenshots'),
  network: resolve(ROOT, 'evidence', 'network'),
  recon: resolve(ROOT, 'evidence', 'recon'),
  sentLog: resolve(ROOT, 'evidence', 'state', 'sent.json'),
};

// Production load control only. Fixed, not randomised.
export const MIN_GAP_MS = 65_000;
export const REPLY_TIMEOUT_MS = 90_000;
export const REPLY_STABLE_MS = 5_000;

export function ensureDirs(): void {
  for (const dir of [paths.transcripts, paths.screenshots, paths.network, paths.recon]) {
    mkdirSync(dir, { recursive: true });
  }
  mkdirSync(resolve(ROOT, 'evidence', 'state'), { recursive: true });
  mkdirSync(resolve(ROOT, 'auth'), { recursive: true });
}

export function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
