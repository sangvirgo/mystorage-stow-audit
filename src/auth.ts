import { chmodSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { chromium } from 'playwright';
import { STOW_URL, ensureDirs, log, paths } from './lib/config.ts';

// You log in by hand in the browser. This script never sees or prints your
// credentials, and never reads the saved file back.
ensureDirs();
const browser = await chromium.launch({ headless: false });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(STOW_URL);
  log('Log in to Stow in the browser window (password / OTP are typed by you only).');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('When you are fully logged in and can see the chat, press Enter here... ');
  rl.close();

  await context.storageState({ path: paths.storageState });
  chmodSync(paths.storageState, 0o600);
  log('Saved login state to auth/storage-state.json (contents not printed, gitignored).');
} finally {
  await browser.close();
}
