import { existsSync, appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { MIN_GAP_MS, REPLY_STABLE_MS, REPLY_TIMEOUT_MS, STOW_URL, paths } from './lib/config.ts';
import { selectors } from './lib/selectors.ts';
import { readSent, recordSent, writeTranscript } from './lib/evidence.ts';
import type { TestCase } from './lib/evidence.ts';

type RetryCase = TestCase & { retryId: string };
type ErrorEvent = { time: string; method: string; host: string; path: string; status: number };

const retryDir = resolve('evidence/retry429');
const networkPath = resolve(retryDir, 'network-errors.jsonl');
mkdirSync(retryDir, { recursive: true });

const allCases: TestCase[] = JSON.parse(readFileSync(paths.cases, 'utf8'));
const requested: RetryCase[] = ['T23', 'T24'].map((id) => {
  const test = allCases.find((candidate) => candidate.id === id);
  if (!test) throw new Error(`Missing source case ${id}`);
  return { ...test, id: `R429-${id}`, retryId: id };
});

if (existsSync(resolve(retryDir, 'results.json'))) {
  throw new Error('Retry results already exist; refusing to send these cases again.');
}

const sent = readSent();
for (const test of requested) {
  if (sent.some((entry) => entry.id === test.id)) throw new Error(`Retry ID already recorded: ${test.id}`);
}

const pause = (ms: number) => new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));
const results: unknown[] = [];
const saveResult = (result: unknown) => {
  results.push(result);
  writeFileSync(resolve(retryDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
};

function eventFor(response: import('playwright').Response): ErrorEvent {
  const url = new URL(response.url());
  return {
    time: new Date().toISOString(),
    method: response.request().method(),
    host: url.host,
    path: url.pathname,
    status: response.status(),
  };
}

function isStowHost(host: string): boolean {
  return host === 'stow.mystorage.vn' || host.endsWith('.mystorage.vn');
}

async function waitForReply(page: import('playwright').Page, before: number): Promise<{ text: string; links: unknown[]; totalMs: number }> {
  const started = Date.now();
  let lastText = '';
  let stableSince = Date.now();
  for (;;) {
    const elapsed = Date.now() - started;
    if (elapsed > REPLY_TIMEOUT_MS) throw new Error('Reply did not stabilise within 90 seconds');
    const busy = await selectors.busyIndicator(page).isVisible().catch(() => false);
    const count = await page.locator('div.prose').count();
    const text = count > before ? await page.locator('div.prose').last().innerText().catch(() => '') : '';
    if (text !== lastText) {
      lastText = text;
      stableSince = Date.now();
    }
    const sendExists = await selectors.sendButton(page).count() > 0;
    if (lastText && !busy && sendExists && Date.now() - stableSince >= REPLY_STABLE_MS) {
      const links = await page.locator('div.prose').last().locator('a').evaluateAll((elements) =>
        elements.map((element) => ({ text: element.textContent?.trim() ?? '', url: (element as HTMLAnchorElement).href })),
      );
      return { text: lastText, links, totalMs: Date.now() - started };
    }
    await pause(500);
  }
}

async function waitForGap(): Promise<void> {
  const current = readSent();
  const last = current.at(-1);
  if (!last) return;
  const remaining = Date.parse(last.submittedAt) + MIN_GAP_MS - Date.now();
  if (remaining > 0) {
    console.log(`Waiting ${Math.ceil(remaining / 1000)} seconds for the production message gap.`);
    await pause(remaining);
  }
}

if (readSent().some((entry) => entry.id === 'R429-T23' || entry.id === 'R429-T24')) {
  throw new Error('A retry case is already present in sent.json');
}

const browser = await chromium.launch({ headless: true });
try {
  for (const test of requested) {
    await waitForGap();
    const context = await browser.newContext({ storageState: paths.storageState, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors: ErrorEvent[] = [];
    const pageErrors: string[] = [];
    let stopReason: string | null = null;
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() < 400) return;
      const event = eventFor(response);
      errors.push(event);
      if (isStowHost(event.host) && event.status === 429) stopReason = `HTTP 429 from STOW origin ${event.host}${event.path}`;
      if (isStowHost(event.host) && (event.status === 401 || event.status === 403)) stopReason = `Auth response ${event.status} from ${event.host}${event.path}`;
      if (isStowHost(event.host) && event.status >= 500) stopReason = `Server response ${event.status} from ${event.host}${event.path}`;
    });

    const submittedAt = new Date().toISOString();
    let response = '[No completed assistant response captured]';
    let status = 'stopped';
    let totalMs: number | null = null;
    try {
      await page.goto(STOW_URL, { waitUntil: 'load' });
      await selectors.composer(page).waitFor({ timeout: 20_000 });
      if (await page.locator('div.prose').count()) throw new Error('Fresh context already contains assistant history');
      await selectors.composer(page).fill(test.message);
      recordSent({ id: test.id, submittedAt });
      console.log(`${test.id} (${test.retryId}) sending`);
      await selectors.sendButton(page).click();
      const reply = await waitForReply(page, 0);
      response = reply.text;
      totalMs = reply.totalMs;
      status = 'completed';
      writeTranscript({
        test,
        timestamp: submittedAt,
        response,
        notes: [
          `Retry of ${test.retryId} after an earlier external telemetry 429.`,
          `Fresh browser context; completed in ${totalMs} ms.`,
          `Links in response: ${JSON.stringify(reply.links)}`,
          `Screenshot: evidence/retry429/${test.id}.png`,
          ...(errors.length ? [`HTTP >= 400 events: ${JSON.stringify(errors)}`] : []),
        ],
      });
    } catch (error) {
      stopReason = stopReason ?? String(error);
      writeTranscript({
        test,
        timestamp: submittedAt,
        response,
        notes: [
          `Retry of ${test.retryId}.`,
          `INCOMPLETE: ${stopReason}`,
          'No automatic retry will be attempted.',
        ],
      });
    } finally {
      await page.screenshot({ path: resolve(retryDir, `${test.id}.png`), fullPage: true }).catch(() => undefined);
      if (status === 'completed') {
        await page.locator('div.prose').last().screenshot({ path: resolve(retryDir, `${test.id}-answer.png`) }).catch(() => undefined);
      }
      if (errors.length) appendFileSync(networkPath, errors.map((event) => JSON.stringify({ testId: test.id, ...event })).join('\n') + '\n');
      saveResult({
        id: test.id,
        originalId: test.retryId,
        status,
        submittedAt,
        totalMs,
        stopReason,
        pageErrors,
        errors,
        screenshot: `evidence/retry429/${test.id}.png`,
        answerScreenshot: status === 'completed' ? `evidence/retry429/${test.id}-answer.png` : null,
      });
      await context.close();
    }
    if (stopReason && status !== 'completed') break;
  }
} finally {
  await browser.close();
}
