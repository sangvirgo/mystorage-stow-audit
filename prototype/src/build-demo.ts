import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, loadCorpus } from './cases.ts';

/**
 * Builds demo/index.html: one static file, no server and no dependencies.
 * All data is embedded from results/*.json, so the page shows only what was run.
 */
const read = (set: string) => JSON.parse(readFileSync(resolve(ROOT, 'results', set, 'results.json'), 'utf8'));
const data = { dev: read('dev'), holdout: read('holdout'), sources: loadCorpus() };
// "<" is escaped so that model text can never close the script tag.
const json = JSON.stringify(data).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>STOW Answer Inspector</title>
<style>
  :root { --bg:#f7f8fa; --panel:#fff; --text:#1b2330; --muted:#5b6678; --line:#d9dee7; --accent:#1f5fbf; --ok:#146c43; --okbg:#e3f4ea; --bad:#a4262c; --badbg:#fbe7e8; --warn:#8a5a00; --warnbg:#fff3d6; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#12161d; --panel:#1a2029; --text:#e6eaf0; --muted:#9aa5b6; --line:#2d3646; --accent:#6ea2f5; --ok:#6fd39b; --okbg:#173325; --bad:#ff8d92; --badbg:#3a1c1f; --warn:#f0c15a; --warnbg:#3a2f12; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.5 system-ui, sans-serif; }
  header, main, footer { max-width:1280px; margin:0 auto; padding:16px; }
  h1 { margin:0 0 4px; font-size:1.5rem; } h2 { margin:0 0 8px; font-size:1rem; } h3 { margin:12px 0 4px; font-size:.9rem; }
  .muted { color:var(--muted); } .small { font-size:.85rem; }
  table { border-collapse:collapse; width:100%; font-size:.9rem; } th, td { border:1px solid var(--line); padding:6px 8px; text-align:left; } th { background:var(--panel); }
  .controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin:16px 0; }
  select, button { font:inherit; color:var(--text); background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:6px 10px; }
  select { min-width:min(100%, 420px); } button[aria-pressed="true"] { border-color:var(--accent); outline:2px solid var(--accent); }
  :focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
  .grid { display:grid; gap:12px; grid-template-columns:1fr; } @media (min-width: 960px) { .grid { grid-template-columns:1fr 1fr 1fr; } }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; min-width:0; }
  .badge { display:inline-block; padding:1px 8px; border-radius:999px; font-size:.8rem; font-weight:600; }
  .pass { background:var(--okbg); color:var(--ok); } .fail { background:var(--badbg); color:var(--bad); } .note { background:var(--warnbg); color:var(--warn); }
  .answer { white-space:pre-wrap; overflow-wrap:anywhere; border-left:3px solid var(--line); padding-left:10px; margin:8px 0; }
  ul.checks { list-style:none; margin:4px 0; padding:0; } ul.checks li { padding:3px 0; border-bottom:1px dashed var(--line); font-size:.9rem; }
  details { margin-top:8px; } summary { cursor:pointer; } .source { margin:8px 0; font-size:.85rem; overflow-wrap:anywhere; }
  #totals-table { overflow-x:auto; }
  .controls > * { max-width:100%; }
</style>
</head>
<body>
<header>
  <h1>STOW Answer Inspector</h1>
  <p class="muted">Recorded production replies from stow.mystorage.vn next to a local prototype. Every number on this page comes from <code>results/*.json</code>.</p>
</header>
<main>
  <section aria-labelledby="totals"><h2 id="totals">Totals (checks passed / answers scored)</h2><div id="totals-table"></div></section>
  <div class="controls">
    <label for="case">Case</label><select id="case"></select>
    <span id="runs" role="group" aria-label="Prototype run"></span>
  </div>
  <div class="grid" aria-live="polite">
    <section class="panel" aria-labelledby="orig-h"><h2 id="orig-h">Original answer</h2><div id="orig"></div></section>
    <section class="panel" aria-labelledby="ev-h"><h2 id="ev-h">Evidence</h2><div id="evidence"></div></section>
    <section class="panel" aria-labelledby="prop-h"><h2 id="prop-h">Proposed answer</h2><div id="prop"></div></section>
  </div>
</main>
<footer class="small muted">
  <h2>How to read this</h2>
  <ul>
    <li><b>Stow (recorded)</b> is the unedited reply Stow gave in production on the date of the audit. One sample per case. It is problem evidence, not a like-for-like comparison.</li>
    <li><b>Naive</b> and <b>Proposed</b> use the same model and the same source registry. Proposed adds a rules prompt, language and percentages decided in code, and a runtime check with at most one repair call.</li>
    <li>The source registry was written from the same public pages that produced the findings, so the proposed side is easier here than it would be in production. The holdout set was written before tuning and run once.</li>
    <li>Checks are regex heuristics. A few false results were found by reading answers; they are listed in the README and were not edited out of the holdout numbers.</li>
  </ul>
</footer>
<script id="data" type="application/json">${json}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const rows = { dev: D.dev.rows, holdout: D.holdout.rows };
const frac = (items) => items.length ? items.filter((i) => i.pass).length + '/' + items.length : 'not run';
const total = (set, key) => frac(rows[set].flatMap((r) => r[key]));

function renderTotals() {
  const t = el('table');
  t.append(el('tr', {}, ...['Set','Naive (same model)','Proposed, first pass','Proposed, final','Stow recorded'].map((h) => el('th', { scope: 'col', textContent: h }))));
  for (const set of ['dev', 'holdout']) {
    const stow = rows[set].filter((r) => r.stow);
    t.append(el('tr', {}, el('td', { textContent: set + ' (' + D[set].runs + ' runs per case)' }), el('td', { textContent: total(set, 'naive') }), el('td', { textContent: total(set, 'firstPass') }), el('td', { textContent: total(set, 'proposed') }), el('td', { textContent: stow.length ? stow.filter((r) => r.stow.pass).length + '/' + stow.length + ' pass' : '-' })));
  }
  document.getElementById('totals-table').replaceChildren(t);
}

const badge = (pass) => el('span', { className: 'badge ' + (pass ? 'pass' : 'fail'), textContent: pass ? 'all checks pass' : 'checks failed' });
const failedHas = (ans, text) => !!ans && ans.failed.some((f) => f.startsWith(text));
const answerBlock = (ans) => el('div', { className: 'answer', textContent: ans.text });

function otherFailures(row, ans) {
  const known = [...row.expectedFacts, ...row.prohibited];
  return ans.failed.filter((f) => !known.some((k) => f.startsWith(k)));
}

function panel(label, row, ans) {
  const box = el('div');
  box.append(el('p', { className: 'small muted', textContent: label }), badge(ans.pass), answerBlock(ans));
  const other = otherFailures(row, ans);
  if (other.length) box.append(el('p', { className: 'small', textContent: 'Also failed: ' + other.join('; ') }));
  return box;
}

let current = { set: 'dev', id: null, run: 0 };

function render() {
  const row = rows[current.set].find((r) => r.id === current.id);
  const stowRecorded = row.stow;
  const origAns = stowRecorded || row.naive[0];
  const origLabel = stowRecorded ? 'Stow, recorded production reply (' + row.stowTranscript + ')' : 'Naive prompt, same model (run 1). No production transcript exists for this holdout case.';
  const prop = row.proposed[current.run];

  document.getElementById('orig').replaceChildren(origAns ? panel(origLabel, row, origAns) : el('p', { textContent: 'Not run.' }));

  const ev = el('div');
  ev.append(el('h3', { textContent: 'Customer message' }), el('div', { className: 'answer', textContent: row.question }), el('p', { className: 'small muted', textContent: row.finding }));
  const list = el('ul', { className: 'checks' });
  const mark = (ans, text) => !ans ? '-' : failedHas(ans, text) ? 'FAIL' : 'ok';
  for (const [kind, texts] of [['Expected', row.expectedFacts], ['Must not', row.prohibited]]) {
    for (const t of texts) list.append(el('li', {}, el('b', { textContent: kind + ': ' }), t, el('br'), el('span', { className: 'small muted', textContent: 'original ' + mark(origAns, t) + '   proposed ' + mark(prop, t) })));
  }
  ev.append(el('h3', { textContent: 'What a good answer needs' }), list);
  if (prop && prop.violations.length) {
    ev.append(el('h3', { textContent: 'Runtime check' }), el('p', { className: 'badge note', textContent: 'caught and repaired' }), el('p', { className: 'small', textContent: prop.violations.join(' | ') + (prop.remaining.length ? ' Still broken: ' + prop.remaining.join(' | ') : ' Fixed after one repair call.') }));
  }
  const d = el('details');
  d.append(el('summary', { textContent: 'Source registry (' + D.sources.length + ' chunks, whole registry is in the prompt)' }));
  for (const s of D.sources) d.append(el('div', { className: 'source' }, el('b', { textContent: s.title }), el('br'), el('a', { href: s.source_url, textContent: s.source_url, rel: 'noreferrer' }), el('br'), el('span', { className: 'muted', textContent: 'retrieved ' + s.retrieved + '; ' + s.provenance }), el('br'), s.text));
  ev.append(d);
  document.getElementById('evidence').replaceChildren(ev);

  document.getElementById('prop').replaceChildren(prop ? panel('Proposed pipeline, local prototype, run ' + (current.run + 1) + ' of ' + row.proposed.length + ' (' + D[current.set].model + ')', row, prop) : el('p', { textContent: 'Not run.' }));

  const runs = document.getElementById('runs');
  runs.replaceChildren(...row.proposed.map((_, i) => { const b = el('button', { type: 'button', textContent: 'Run ' + (i + 1) }); b.setAttribute('aria-pressed', String(i === current.run)); b.onclick = () => { current.run = i; render(); }; return b; }));
}

function init() {
  renderTotals();
  const sel = document.getElementById('case');
  for (const set of ['dev', 'holdout']) {
    const g = el('optgroup', { label: set === 'dev' ? 'Development cases (from real findings)' : 'Holdout cases (frozen before tuning)' });
    for (const r of rows[set]) g.append(el('option', { value: set + ':' + r.id, textContent: r.id + ' - ' + r.finding }));
    sel.append(g);
  }
  sel.onchange = () => { const [set, id] = sel.value.split(':'); current = { set, id, run: 0 }; render(); };
  const [set, id] = sel.value.split(':'); current = { set, id, run: 0 };
  render();
}
init();
</script>
</body>
</html>
`;

mkdirSync(resolve(ROOT, 'demo'), { recursive: true });
writeFileSync(resolve(ROOT, 'demo', 'index.html'), html);
console.log(`Wrote demo/index.html (${html.length} bytes)`);
