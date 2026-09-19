import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { STOW_URL, ensureDirs, log, paths } from './lib/config.ts';
import { Guard, StopRun } from './lib/guards.ts';

// READ-ONLY. Loads Stow with the saved session and records how the page is
// built so selectors can be chosen from evidence. It never types or clicks.
ensureDirs();
if (!existsSync(paths.storageState)) {
  console.error('No saved login. Run `npm run auth` first.');
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });
try {
  const context = await browser.newContext({ storageState: paths.storageState });
  const page = await context.newPage();
  const guard = new Guard(page);

  log('Opening Stow (no message will be sent).');
  await page.goto(STOW_URL, { waitUntil: 'load' });
  await page.waitForTimeout(5_000); // let the chat UI render
  await guard.check();

  await page.screenshot({ path: resolve(paths.recon, 'recon.png'), fullPage: true });

  const aria = await page.locator('body').ariaSnapshot();
  writeFileSync(resolve(paths.recon, 'aria-snapshot.yml'), aria);

  // Interactive elements and live regions only: tag, role, label, placeholder,
  // state. Input values are never read.
  const elements = await page.evaluate(() => {
    const query = 'textarea, input, button, a, select, [role], [contenteditable], [aria-live]';
    return Array.from(document.querySelectorAll(query))
      .slice(0, 150)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLive: el.getAttribute('aria-live'),
        placeholder: el.getAttribute('placeholder'),
        type: el.getAttribute('type'),
        testId: el.getAttribute('data-testid'),
        disabled: (el as HTMLButtonElement).disabled ?? null,
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
      }));
  });
  writeFileSync(resolve(paths.recon, 'elements.json'), JSON.stringify(elements, null, 2));

  log(`Landed on path: ${new URL(page.url()).pathname}`);
  log('Saved evidence/recon/{recon.png, aria-snapshot.yml, elements.json}.');
  log('These files may show your name or email. They are gitignored; do not share them unreviewed.');
} catch (error) {
  if (error instanceof StopRun) console.error(`STOPPED: ${error.message}`);
  else throw error;
  process.exitCode = 1;
} finally {
  await browser.close();
}
