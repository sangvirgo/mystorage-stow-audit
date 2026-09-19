// Measures app.html in both modes at several viewport sizes and writes ui/layout-results.md.
// Needs Playwright (root `npm install`). Usage: node prototype/ui/check-layout.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = `file://${resolve(import.meta.dirname, 'app.html')}`;
const VIEWPORTS = [[280, 480], [320, 568], [360, 640], [390, 844], [414, 736], [568, 320], [844, 390], [768, 1024], [1280, 720]];

function measure() {
  const rect = (el) => el.getBoundingClientRect();
  const header = rect(document.querySelector('.top'));
  const dock = rect(document.getElementById('dock'));
  const stage = document.getElementById('stage');
  const scrollable = ['auto', 'scroll'].includes(getComputedStyle(stage).overflowY) && stage.scrollHeight > stage.clientHeight;
  const visible = (el) => { const r = rect(el); return r.top >= header.bottom - 1 && r.bottom <= dock.top + 1; };
  // A control counts as reachable if it is visible at rest, or the user can scroll it into view.
  const reachable = (el) => { if (visible(el)) return true; if (!scrollable) return false; el.scrollIntoView({ block: 'center' }); return visible(el); };
  const out = { hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, chatAreaPx: Math.round(dock.top - header.bottom) };
  if (document.documentElement.dataset.state === 'welcome') {
    stage.scrollTop = 0;
    out.headingVisible = visible(document.getElementById('hello'));
    out.headingTop = Math.round(rect(document.getElementById('hello')).top);
    out.chipsReachable = [...document.querySelectorAll('.chip')].filter(reachable).length;
    stage.scrollTop = 0;
    out.chip3 = `${Math.round(rect(document.querySelectorAll('.chip')[2]).top)}-${Math.round(rect(document.querySelectorAll('.chip')[2]).bottom)}`;
    out.composer = `${Math.round(rect(document.getElementById('composer')).top)}-${Math.round(rect(document.getElementById('composer')).bottom)}`;
  }
  return out;
}

const browser = await chromium.launch();
const rows = [];
const a11y = {};
try {
  for (const mode of ['original', 'fixed']) {
    for (const state of ['welcome', 'chat']) {
      for (const [w, h] of VIEWPORTS) {
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${APP}?mode=${mode}&state=${state}`);
        await page.waitForTimeout(150);
        rows.push({ mode, state, w, h, errors: errors.length, ...(await page.evaluate(measure)) });
        if (state === 'welcome' && w === 390) {
          const info = await page.evaluate(() => {
            const drawer = document.getElementById('drawer');
            const ta = document.querySelector('textarea');
            return {
              drawerInertOrHidden: drawer.inert || drawer.getAttribute('aria-hidden') === 'true',
              menuHasExpanded: document.getElementById('menu-btn').hasAttribute('aria-expanded'),
              composerHasLabel: !!(ta.labels && ta.labels.length) || ta.hasAttribute('aria-label'),
              liveRegion: !!document.querySelector('[aria-live], [role=log], [role=status]'),
            };
          });
          let tabbedIntoClosedDrawer = false;
          for (let i = 0; i < 14; i++) {
            await page.keyboard.press('Tab');
            if (await page.evaluate(() => !!document.activeElement?.closest('#drawer'))) tabbedIntoClosedDrawer = true;
          }
          a11y[mode] = { ...info, tabbedIntoClosedDrawer };
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const yn = (b) => (b ? 'yes' : 'NO');
const lines = [
  '# Layout check: original behaviour vs fixed',
  '',
  `Generated ${new Date().toISOString()} with headless Chromium.`,
  '',
  '"Original" is an approximation of the behaviour measured on stow.mystorage.vn: the same kind of failure (content centred in a fixed-height area that cannot scroll, with the composer laid over it), but not Stow\'s own CSS, so the exact pixels differ. Measured on Stow itself at 320×568: heading top y=22 under a 57 px header, third shortcut y=403–449, composer textbox y=410–464; no overlap from 360×640 up. "Fixed" is the same look with the fixes applied.',
  '',
  '## Welcome screen',
  '',
  '"Reachable" means visible at rest or scrollable into view by the user. In the fixed mode a shortcut below the fold is clipped by the scroll area, not covered by the composer, and scrolls into view.',
  '',
  '| Viewport | Mode | Heading fully visible | Shortcuts reachable (of 3) | Heading top / 3rd shortcut / composer box (px, at rest) | Horizontal overflow | Page errors |',
  '|---|---|---|---|---|---|---|',
  ...rows.filter((r) => r.state === 'welcome').map((r) => `| ${r.w}×${r.h} | ${r.mode} | ${yn(r.headingVisible)} | ${r.chipsReachable} | ${r.headingTop} / ${r.chip3} / ${r.composer} | ${r.hOverflow}px | ${r.errors} |`),
  '',
  '## Conversation with an attached image: room left for the chat',
  '',
  '| Viewport | Mode | Chat area (px) | Share of screen height | Horizontal overflow |',
  '|---|---|---|---|---|',
  ...rows.filter((r) => r.state === 'chat').map((r) => `| ${r.w}×${r.h} | ${r.mode} | ${r.chatAreaPx} | ${Math.round((r.chatAreaPx / r.h) * 100)}% | ${r.hOverflow}px |`),
  '',
  '## Accessibility (measured at 390×844)',
  '',
  '| Check | Original | Fixed |',
  '|---|---|---|',
  `| Closed menu removed from the tab order (inert or aria-hidden) | ${yn(a11y.original.drawerInertOrHidden)} | ${yn(a11y.fixed.drawerInertOrHidden)} |`,
  `| Tab key never lands inside the closed menu | ${yn(!a11y.original.tabbedIntoClosedDrawer)} | ${yn(!a11y.fixed.tabbedIntoClosedDrawer)} |`,
  `| Menu button exposes aria-expanded | ${yn(a11y.original.menuHasExpanded)} | ${yn(a11y.fixed.menuHasExpanded)} |`,
  `| Composer has a real label (not only the placeholder) | ${yn(a11y.original.composerHasLabel)} | ${yn(a11y.fixed.composerHasLabel)} |`,
  `| Chat has a live region for new replies | ${yn(a11y.original.liveRegion)} | ${yn(a11y.fixed.liveRegion)} |`,
  '',
];
writeFileSync(resolve(import.meta.dirname, 'layout-results.md'), lines.join('\n'));
console.log(lines.join('\n'));
