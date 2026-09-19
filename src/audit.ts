import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import type { Locator, Page } from 'playwright';
import { MIN_GAP_MS, REPLY_STABLE_MS, REPLY_TIMEOUT_MS, STOW_URL, ensureDirs, log, paths } from './lib/config.ts';
import { appendNetwork, readSent, recordSent, writeTranscript } from './lib/evidence.ts';
import type { TestCase } from './lib/evidence.ts';
import { Guard, StopRun } from './lib/guards.ts';
import { selectors } from './lib/selectors.ts';
import type { ChatSelectors } from './lib/selectors.ts';

const INJECTION_ID = 'T12';
const POLL_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function selectCases(): TestCase[] {
  const all: TestCase[] = JSON.parse(readFileSync(paths.cases, 'utf8'));
  const flag = process.argv.find((a) => a.startsWith('--only='));
  if (!flag) return all;
  const wanted = flag.slice('--only='.length).split(',');
  const unknown = wanted.filter((id) => !all.some((c) => c.id === id));
  if (unknown.length) throw new Error(`Unknown test id(s): ${unknown.join(', ')}`);
  return all.filter((c) => wanted.includes(c.id)); // keeps cases.json order
}

/** Wait out the gap since the last submitted message, even across runs. */
async function waitForGap(): Promise<void> {
  const sent = readSent();
  if (sent.length === 0) return;
  const last = Date.parse(sent[sent.length - 1].submittedAt);
  const remaining = last + MIN_GAP_MS - Date.now();
  if (remaining > 0) await countdown(remaining, 'gap since previous message');
}

async function countdown(ms: number, why: string): Promise<void> {
  log(`Waiting ${Math.ceil(ms / 1000)}s (${why}).`);
  await sleep(ms);
}

/**
 * Waits until the newest assistant message is complete, using behaviour seen
 * in production: while generating, "Dừng" is shown instead of "Gửi".
 *   1. a new assistant message exists (or "Dừng" has appeared)
 *   2. "Dừng" is gone and "Gửi" is back in the accessibility tree (at idle it is
 *      present but disabled and not visibly painted, so isVisible() would be wrong)
 *   3. the newest assistant message text has not changed for REPLY_STABLE_MS
 * Only that newest message is read, never the whole page.
 */
async function readReply(page: Page, s: ChatSelectors, messages: Locator, before: number, guard: Guard) {
  const start = Date.now();
  const timedOut = (what: string) => {
    if (Date.now() - start > REPLY_TIMEOUT_MS) throw new Error(`Timed out waiting for: ${what}`);
  };

  let sawBusy = false;
  let firstSeenMs = 0;
  while (!sawBusy) {
    await guard.check();
    timedOut('the assistant to start replying');
    sawBusy = await s.busyIndicator(page).isVisible();
    if (!sawBusy && (await messages.count()) > before) break; // reply started and finished very fast
    await sleep(POLL_MS);
  }

  while ((await s.busyIndicator(page).isVisible()) || (await s.sendButton(page).count()) === 0) {
    await guard.check();
    timedOut('"Dừng" to disappear and "Gửi" to return');
    await sleep(POLL_MS);
  }

  let last = '';
  let stableSince = Date.now();
  for (;;) {
    await guard.check();
    timedOut('the reply text to stabilise');
    const newest = (await messages.count()) > before ? await messages.last().innerText() : '';
    if (newest !== last) {
      last = newest;
      stableSince = Date.now();
      firstSeenMs ||= Date.now() - start;
    }
    if (last.length > 0 && Date.now() - stableSince >= REPLY_STABLE_MS) break;
    await sleep(POLL_MS);
  }

  const links = await messages.last().getByRole('link').evaluateAll((els) =>
    els.map((a) => `${(a.textContent ?? '').trim()} (${(a as HTMLAnchorElement).href})`),
  );
  return { text: last, links, firstSeenMs, totalMs: Date.now() - start };
}

/**
 * Discovery run: no reply selector is known yet, so send ONE message and save
 * the page before and after (ARIA + text). The reply is the text that is new
 * after sending, minus the customer's own message. Provisional, for choosing
 * the real selector from evidence.
 */
async function runDiscovery(page: Page, s: ChatSelectors, guard: Guard, test: TestCase): Promise<void> {
  const snap = async (name: string) => {
    writeFileSync(resolve(paths.recon, `discovery-${test.id}-${name}.yml`), await page.locator('body').ariaSnapshot());
    return page.locator('body').innerText();
  };
  const textBefore = await snap('before');

  await s.composer(page).fill(test.message);
  const submittedAt = new Date().toISOString();
  recordSent({ id: test.id, submittedAt });
  log(`${test.id} sending (discovery run)`);
  const start = Date.now();
  await s.sendButton(page).click();

  // Finished = the "Dừng" (stop) button has been seen and is gone again, and the
  // page text has been unchanged for 5 s. Within the timeout.
  let last = textBefore;
  let stableSince = Date.now();
  let sawBusy = false;
  for (;;) {
    await guard.check();
    if (Date.now() - start > REPLY_TIMEOUT_MS) throw new Error('Page did not settle within the timeout');
    const text = await page.locator('body').innerText();
    if (text !== last) {
      last = text;
      stableSince = Date.now();
    }
    const busy = await s.busyIndicator(page).isVisible();
    sawBusy ||= busy;
    if (sawBusy && !busy && Date.now() - stableSince >= 5_000 && last !== textBefore) break;
    await sleep(POLL_MS);
  }
  const totalMs = Date.now() - start;
  await snap('after');

  const known = new Set(textBefore.split('\n').map((l) => l.trim()));
  const fresh = last.split('\n').map((l) => l.trim()).filter((l) => l && !known.has(l) && l !== test.message.trim());

  const errors = guard.drain();
  appendNetwork(test.id, errors);
  await page.screenshot({ path: resolve(paths.screenshots, `${test.id}.png`), fullPage: true });
  writeTranscript({
    test,
    timestamp: submittedAt,
    response: fresh.join('\n'),
    notes: [
      'PROVISIONAL extraction: lines that are new in the page text after sending. No reply selector existed yet. Verify against the screenshot.',
      `Page settled after ${totalMs} ms.`,
      ...(errors.length ? [`HTTP >= 400 responses seen: ${errors.map((e) => `${e.status} ${e.path}`).join(', ')}`] : []),
    ],
  });
  log(`${test.id} discovery done in ${totalMs}ms; snapshots in evidence/recon/`);
}

async function runCase(page: Page, s: ChatSelectors, messages: Locator, guard: Guard, test: TestCase): Promise<void> {
  const before = await messages.count();
  const notes: string[] = [];

  await s.composer(page).fill(test.message);
  if (await s.sendButton(page).isDisabled()) throw new Error('Send button is disabled after typing');

  // Recorded BEFORE clicking: if anything fails afterwards we still never resend.
  const submittedAt = new Date().toISOString();
  recordSent({ id: test.id, submittedAt });
  log(`${test.id} sending`);
  await s.sendButton(page).click();

  const reply = await readReply(page, s, messages, before, guard);
  log(`${test.id} reply complete in ${reply.totalMs}ms`);

  notes.push(`First reply text visible after ${reply.firstSeenMs} ms; finished after ${reply.totalMs} ms.`);
  if (reply.links.length) notes.push(`Links in reply: ${reply.links.join('; ')}`);
  const errors = guard.drain();
  if (errors.length) notes.push(`HTTP >= 400 responses seen: ${errors.map((e) => `${e.status} ${e.path}`).join(', ')}`);
  appendNetwork(test.id, errors);

  await page.screenshot({ path: resolve(paths.screenshots, `${test.id}.png`), fullPage: true });
  writeTranscript({ test, timestamp: submittedAt, response: reply.text, notes });
}

async function main(): Promise<void> {
  if (!existsSync(paths.storageState)) {
    console.error('No saved login. Run `npm run auth` first.');
    process.exit(1);
  }
  ensureDirs();

  const alreadySent = new Set(readSent().map((e) => e.id));
  const cases = selectCases();
  const repeats = cases.filter((c) => alreadySent.has(c.id));
  if (repeats.length) {
    console.error(`Refusing to resend: ${repeats.map((c) => c.id).join(', ')} already submitted. Delete evidence/state/sent.json only if you are sure.`);
    process.exit(1);
  }
  if (cases.some((c) => c.id === INJECTION_ID) && cases[cases.length - 1].id !== INJECTION_ID) {
    console.error(`${INJECTION_ID} (prompt injection) must be the final test in the run.`);
    process.exit(1);
  }

  const discovery = !selectors.assistantMessages;
  if (discovery && cases.length !== 1) {
    console.error('assistantMessages selector is not set: only a single-case discovery run is allowed (e.g. --only=T01).');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ storageState: paths.storageState });
    const page = await context.newPage();
    const guard = new Guard(page);
    await page.goto(STOW_URL, { waitUntil: 'load' });
    await guard.check();

    for (const [i, test] of cases.entries()) {
      await waitForGap();
      await guard.check();
      if (selectors.assistantMessages) await runCase(page, selectors, selectors.assistantMessages(page), guard, test);
      else await runDiscovery(page, selectors, guard, test);
      if (i < cases.length - 1) await countdown(MIN_GAP_MS, 'minimum gap before next message');
    }
    log('Run complete. Not continuing without your review.');
  } catch (error) {
    if (error instanceof StopRun) console.error(`STOPPED by guard: ${error.message}`);
    else console.error(`STOPPED on error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
