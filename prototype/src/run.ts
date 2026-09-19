import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { naiveAnswer, proposedAnswer } from './answer.ts';
import { ROOT, loadCases, loadStowTranscript } from './cases.ts';
import type { CaseSet, EvalCase } from './cases.ts';
import { passed, runChecks } from './checks.ts';
import { configFromEnv } from './gemini.ts';

interface Scored {
  text: string;
  pass: boolean;
  failed: string[];
}

type Proposed = Scored & { violations: string[]; remaining: string[] };

interface Row {
  c: EvalCase;
  stow: Scored | null;
  naive: Scored[];
  firstPass: Scored[];
  proposed: Proposed[];
}

const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const baselineOnly = process.argv.includes('--baseline');
const set = (flag('set') ?? 'dev') as CaseSet;
const runs = Number(flag('runs') ?? 1);
const only = flag('only')?.split(',');

function score(c: EvalCase, text: string): Scored {
  const results = runChecks(c, text);
  return {
    text,
    pass: passed(results),
    failed: results.filter((r) => !r.pass).map((r) => (r.detail ? `${r.text} [${r.detail}]` : r.text)),
  };
}

const hash = (...parts: string[]): string =>
  createHash('sha256').update(parts.map((p) => readFileSync(resolve(ROOT, p), 'utf8')).join('\n')).digest('hex').slice(0, 12);

const fraction = (items: Scored[]): string => (items.length === 0 ? 'not run' : `${items.filter((i) => i.pass).length}/${items.length}`);

async function main(): Promise<void> {
  const cases = loadCases(set).filter((c) => !only || only.includes(c.id));
  const outDir = resolve(ROOT, 'results', set);
  mkdirSync(outDir, { recursive: true });
  const cfg = baselineOnly ? null : configFromEnv();

  const rows: Row[] = [];
  for (const c of cases) {
    let stow: Scored | null = null;
    if (c.stowTranscript) {
      const recorded = loadStowTranscript(c.stowTranscript);
      if (recorded.message.trim() !== c.question.trim()) throw new Error(`${c.id}: question differs from transcript ${c.stowTranscript}`);
      stow = score(c, recorded.response);
    }

    const naive: Scored[] = [];
    const firstPass: Scored[] = [];
    const proposed: Proposed[] = [];
    if (cfg) {
      for (let run = 1; run <= runs; run++) {
        naive.push(score(c, await naiveAnswer(cfg, c)));
        const p = await proposedAnswer(cfg, c);
        firstPass.push(score(c, p.firstPass));
        proposed.push({ ...score(c, p.final), violations: p.violations, remaining: p.remaining });
        console.log(`${c.id} run ${run}: naive ${naive[run - 1].pass ? 'pass' : 'FAIL'}, proposed ${proposed[run - 1].pass ? 'pass' : 'FAIL'}${p.violations.length ? ' (repaired)' : ''}`);
      }
    }
    rows.push({ c, stow, naive, firstPass, proposed });
  }

  const total = (pick: (r: Row) => Scored[]) => {
    const all = rows.flatMap(pick);
    return all.length === 0 ? 'not run' : `${all.filter((s) => s.pass).length}/${all.length}`;
  };
  const lines = [
    `# Evaluation results: ${set} set`,
    '',
    `Generated ${new Date().toISOString()}.`,
    cfg ? `Model: ${cfg.model}, temperature 0, ${runs} run(s) per case, whole source registry in the prompt.` : 'Model answers: not run (baseline-only mode).',
    `Frozen inputs (sha256, first 12 chars): system prompt ${hash('prompts/system.md')}, naive prompt ${hash('prompts/baseline.md')}, sources ${hash('sources/corpus.json')}, dev cases ${hash('evals/cases.json')}, holdout cases ${hash('evals/holdout.json')}.`,
    '',
    '- **Stow (recorded)**: the unedited production reply in the audit transcript. One sample, shown as problem evidence, not as a like-for-like comparison.',
    '- **Naive (same model)**: same model, same sources, same prices, plain one-line instruction.',
    '- **Proposed, first pass**: rules prompt plus code-computed percentages, before the runtime check.',
    '- **Proposed, final**: after the runtime check and at most one repair call.',
    '',
    'A case passes only if every check passes. Checks are regex heuristics: read the answers too.',
    '',
    '| Case | Finding | Stow (recorded) | Naive (same model) | Proposed, first pass | Proposed, final | Repaired |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.c.id} | ${r.c.finding} | ${r.stow ? (r.stow.pass ? 'pass' : 'FAIL') : '-'} | ${fraction(r.naive)} | ${fraction(r.firstPass)} | ${fraction(r.proposed)} | ${r.proposed.filter((p) => p.violations.length).length}/${r.proposed.length} |`),
    `| **Total** | | | ${total((r) => r.naive)} | ${total((r) => r.firstPass)} | ${total((r) => r.proposed)} | |`,
    '',
    '## Failed checks',
    '',
    ...rows.flatMap((r) => [
      `### ${r.c.id}`,
      ...(r.stow ? [`- Stow recorded (${r.c.stowTranscript}): ${r.stow.failed.join('; ') || 'none'}`] : []),
      ...r.naive.map((n, i) => `- Naive run ${i + 1}: ${n.failed.join('; ') || 'none'}`),
      ...r.proposed.map((p, i) => `- Proposed run ${i + 1}: ${p.failed.join('; ') || 'none'}${p.violations.length ? ` (first reply broke: ${p.violations.join(' | ')}; still broken after repair: ${p.remaining.join(' | ') || 'nothing'})` : ''}`),
    ]),
  ];
  writeFileSync(resolve(outDir, 'summary.md'), lines.join('\n') + '\n');
  writeFileSync(
    resolve(outDir, 'results.json'),
    JSON.stringify({ set, model: cfg?.model ?? null, runs: cfg ? runs : 0, generatedAt: new Date().toISOString(), rows: rows.map((r) => ({ id: r.c.id, finding: r.c.finding, question: r.c.question, stowTranscript: r.c.stowTranscript ?? null, expectedFacts: r.c.expectedFacts.map((f) => f.text), prohibited: r.c.prohibited.map((p) => p.text), stow: r.stow, naive: r.naive, firstPass: r.firstPass, proposed: r.proposed })) }, null, 2),
  );
  console.log(lines.slice(0, 22 + rows.length).join('\n'));
}

await main();
