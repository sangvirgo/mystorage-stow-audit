import { existsSync, appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { MIN_GAP_MS, REPLY_STABLE_MS, REPLY_TIMEOUT_MS, STOW_URL, paths } from './lib/config.ts';
import { selectors } from './lib/selectors.ts';
import { readSent, recordSent, writeTranscript } from './lib/evidence.ts';
import type { TestCase } from './lib/evidence.ts';

const targetIds = ['T25', 'T26', 'T27', 'T28', 'T29', 'T30', 'T31', 'T32'];
const outDir = resolve('evidence/remaining50');
const resultPath = resolve(outDir, 'results.json');
const networkPath = resolve(outDir, 'network-errors.jsonl');
mkdirSync(outDir, { recursive: true });

if (existsSync(resultPath)) throw new Error('Remaining-case results already exist; refusing to resend.');
if (!existsSync(paths.storageState)) throw new Error('Missing auth/storage-state.json');

const allCases: TestCase[] = JSON.parse(readFileSync(resolve('tests/round5.json'), 'utf8')).chat;
const tests = targetIds.map((id) => {
  const test = allCases.find((candidate) => candidate.id === id);
  if (!test) throw new Error(`Missing case ${id}`);
  return test;
});
const sent = readSent();
const alreadySent = tests.filter((test) => sent.some((entry) => entry.id === test.id));
if (alreadySent.length) throw new Error(`Refusing to resend: ${alreadySent.map((test) => test.id).join(', ')}`);

type ErrorEvent = { time: string; method: string; host: string; path: string; status: number };
const results: unknown[] = [];
const pause = (ms: number) => new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));
const save = (result: unknown) => {
  results.push(result);
  writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
};
const isStowHost = (host: string) => host === 'stow.mystorage.vn' || host.endsWith('.mystorage.vn');

async function waitForGap(): Promise<void> {
  const previous = readSent().at(-1);
  if (!previous) return;
  const remaining = Date.parse(previous.submittedAt) + MIN_GAP_MS - Date.now();
  if (remaining > 0) {
    console.log(`Waiting ${Math.ceil(remaining / 1000)} seconds for the production message gap.`);
    await pause(remaining);
  }
}

async function readReply(page: import('playwright').Page): Promise<{ text: string; links: unknown[]; totalMs: number }> {
  const start = Date.now();
  let lastText = '';
  let stableSince = Date.now();
  for (;;) {
    if (Date.now() - start > REPLY_TIMEOUT_MS) throw new Error('Reply did not stabilise within 90 seconds');
    const busy = await selectors.busyIndicator(page).isVisible().catch(() => false);
    const count = await page.locator('div.prose').count();
    const text = count ? await page.locator('div.prose').last().innerText().catch(() => '') : '';
    if (text !== lastText) {
      lastText = text;
      stableSince = Date.now();
    }
    if (lastText && !busy && await selectors.sendButton(page).count() > 0 && Date.now() - stableSince >= REPLY_STABLE_MS) {
      const links = await page.locator('div.prose').last().locator('a').evaluateAll((elements) =>
        elements.map((element) => ({ text: element.textContent?.trim() ?? '', url: (element as HTMLAnchorElement).href })),
      );
      return { text: lastText, links, totalMs: Date.now() - start };
    }
    await pause(500);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const test of tests) {
    await waitForGap();
    const context = await browser.newContext({ storageState: paths.storageState, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors: ErrorEvent[] = [];
    const pageErrors: string[] = [];
    let ownOriginStop: string | null = null;
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() < 400) return;
      const url = new URL(response.url());
      const event: ErrorEvent = { time: new Date().toISOString(), method: response.request().method(), host: url.host, path: url.pathname, status: response.status() };
      errors.push(event);
      if (isStowHost(event.host) && (event.status === 429 || event.status === 401 || event.status === 403 || event.status >= 500)) {
        ownOriginStop = `Own-origin response ${event.status} from ${event.host}${event.path}`;
      }
    });

    const submittedAt = new Date().toISOString();
    let status = 'stopped';
    let stopReason: string | null = null;
    let totalMs: number | null = null;
    try {
      await page.goto(STOW_URL, { waitUntil: 'load' });
      await selectors.composer(page).waitFor({ timeout: 20_000 });
      if (await page.locator('div.prose').count()) throw new Error('Fresh context already contains assistant history');
      await selectors.composer(page).fill(test.message);
      recordSent({ id: test.id, submittedAt });
      console.log(`${test.id} sending`);
      await selectors.sendButton(page).click();
      const reply = await readReply(page);
      totalMs = reply.totalMs;
      status = 'completed';
      writeTranscript({
        test,
        timestamp: submittedAt,
        response: reply.text,
        notes: [
          'Fresh browser context; no previous assistant messages.',
          `Completed in ${totalMs} ms.`,
          `Links in response: ${JSON.stringify(reply.links)}`,
          `Screenshot: evidence/remaining50/${test.id}.png`,
          ...(errors.length ? [`HTTP >= 400 events: ${JSON.stringify(errors)}`] : []),
        ],
      });
    } catch (error) {
      stopReason = ownOriginStop ?? String(error);
      writeTranscript({
        test,
        timestamp: submittedAt,
        response: '[No completed assistant response captured]',
        notes: [`INCOMPLETE: ${stopReason}`, 'The remaining run stopped and was not retried automatically.'],
      });
    } finally {
      await page.screenshot({ path: resolve(outDir, `${test.id}.png`), fullPage: true }).catch(() => undefined);
      if (status === 'completed') await page.locator('div.prose').last().screenshot({ path: resolve(outDir, `${test.id}-answer.png`) }).catch(() => undefined);
      if (errors.length) appendFileSync(networkPath, errors.map((event) => JSON.stringify({ testId: test.id, ...event })).join('\n') + '\n');
      save({ id: test.id, status, submittedAt, totalMs, stopReason, pageErrors, errors, screenshot: `evidence/remaining50/${test.id}.png`, answerScreenshot: status === 'completed' ? `evidence/remaining50/${test.id}-answer.png` : null });
      await context.close();
    }
    if (status !== 'completed' || ownOriginStop) break;
  }
} finally {
  await browser.close();
}
