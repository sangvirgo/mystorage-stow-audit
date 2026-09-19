# Grounded-answer prototype for Stow

An evaluation set plus a small source-grounded answer pipeline for the repeated Stow findings: missing booking links, a generic "about 40% cheaper" claim, an unsourced District 7 opening, missing insurance and luggage figures, wrong wine and delivery-hour facts, and a discount shown as fixed.

Open `demo/index.html` in a browser to see it: recorded Stow reply, evidence, and proposed reply side by side. No server needed.

## What is compared

All model answers use `gemini-3.5-flash-lite` at temperature 0, with the whole source registry in the prompt (12 chunks, about 3,000 tokens, so there is no retrieval step that could miss a fact).

| Column | What it is |
|---|---|
| **Stow (recorded)** | The unedited reply Stow gave in production (`evals/baseline/T*.md`). One sample per case. Problem evidence, not a like-for-like comparison. |
| **Naive** | Same model, same sources, same prices, one plain instruction (`prompts/baseline.md`). |
| **Proposed, first pass** | Rules prompt (`prompts/system.md`), reply language and price percentages decided in code, bracketed source ids stripped. |
| **Proposed, final** | First pass, then a runtime check (`src/validate.ts`); if it finds a problem, one repair call. |

```
question ─┬─ language detected in code ──────────────┐
sources ──┤                                           ├─▶ rules prompt ─▶ model ─▶ runtime check ─┬─ ok ─▶ reply
prices ───┴─ percentages computed in code (pricing.ts)┘                                          └─ problem ─▶ one repair call ─▶ reply
```

Runtime check (needs no knowledge of the right answer): every VND amount must appear in the sources or the pricing tool; every percentage must be computed from the quoted prices in the right direction or be stated by a source; figures need a cited source URL; booking questions need a booking link or contact; the reply must not leak the system prompt.

## Results (as run on 2026-09-19)

Checks passed / answers scored. Three runs per case.

| Set | Naive | Proposed, first pass | Proposed, final | Stow recorded |
|---|---|---|---|---|
| Dev (10 cases, tuned on) | 18/30 | 29/30 | 30/30 | 1/10 pass (the 9 finding cases fail by construction; the injection case passes) |
| Holdout (12 cases, frozen before tuning) | 26/36 | 35/36 | 35/36 | not applicable |

Full tables: `results/dev/summary.md`, `results/holdout/summary.md`, every answer in the matching `results.json`.

What the numbers do and do not say:

- **Dev is not evidence of generalisation.** The prompt, validator and some checks were changed after reading dev answers. History is kept in `results/dev-run1-before-tuning`, `dev-run2-after-prompt-fix` and `dev-run3-before-check-fixes` (proposed final answer 20/30 → 22/30 → 26/30 across those rounds; the last round changed only the checks listed below, which gave 30/30).
- **Holdout was run once with the frozen prompt.** Its first attempt stopped at H08 run 2 with an API timeout (log kept in `results/holdout-attempt1-aborted.log`). I had seen the pass/fail lines for H01 to H08 in that log before re-running; nothing was changed except adding a single retry on timeout.
- **The gap is smaller than versus Stow** because the naive baseline already sees the same sources. The gains come from: English questions answered in Vietnamese by the naive prompt (language is now decided in code), the model repeating a computed 324,000 VND total when pushed (H04, naive 1/3), giving no contact path for a service that is not in the sources (H08, naive 1/3), and declining to reveal its instructions (E10, naive 0/3).
- **The repair path is exercised.** The runtime check fired often on holdout (mostly a missing source URL) and every repaired reply passed afterwards. It caught one false alarm in dev (a range "5% đến 10%") that turned out to be a validator bug and was fixed.
- **The sources were written from the same public pages that produced the findings.** The proposed side is easier here than in production, where the knowledge base is larger and messier.

## Known checker artefacts (found by reading answers, not edited out of the numbers)

- H12, naive 0/3: the answers say "humidity of 60% to 70%", which is correct; the check only accepts "60-70". True difference on H12 is about zero.
- H09, proposed run 3: the answer writes "Binh Lợi" (mixed diacritics) and misses the "Binh Loi" pattern.
- H04, naive runs 1 and 2: flagged for repeating "324,000" while explaining it is only an estimate; also flagged, correctly, for replying in Vietnamese to an English question.
- H09, naive runs 1 and 2: "Says the team should confirm" needs the word "xác nhận"/"confirm"; the naive replies say to contact the team without it.
- Dev checks corrected after reading answers (both sides re-scored by re-running): a waitlist phrase caught negated text, "coming soon" caught unrelated text, and "5% đến 10%" was not accepted as the 5-10% range.

## Run it (Docker)

```
cd prototype
docker compose run --rm test        # 13 unit tests, no key
docker compose run --rm baseline    # scores Stow's recorded replies, no key
cp .env.example .env                # put your Gemini key in .env yourself (gitignored)
docker compose run --rm eval node src/run.ts --set=dev --runs=3
docker compose run --rm eval node src/run.ts --set=holdout --runs=3
docker compose run --rm demo        # rebuilds demo/index.html from results/
```

Without Docker (Node 22.18 or newer, no dependencies): `npm test`, `npm run baseline`, `node --env-file=.env src/run.ts --set=holdout --runs=3`, `npm run demo`.

The key is read from the environment only and is never printed or written by the code. Model answers vary a little between runs, so a re-run will not reproduce the tables exactly.

## Files

- `sources/corpus.json`: 12 chunks with source URL, retrieval date and provenance. Several pages were read through a web-fetch summary and say so; re-check them by eye.
- `evals/cases.json` (dev, 10), `evals/holdout.json` (12): question, expected facts, prohibited claims, behavioural properties. `evals/golden.json`: hand-written correct answers used only to prove the checks can pass.
- `src/checks.ts` scoring; `src/validate.ts` runtime check; `src/pricing.ts` percentages both directions; `src/answer.ts` the pipeline; `src/run.ts` the runner; `src/build-demo.ts` the page.

## Limits

- Regex checks can miss a bad answer or flag a fine one (see artefacts above).
- The price fixtures used for comparison cases are numbers Stow itself quoted (transcript T13) standing in for a live pricing tool. They are not an official price table.
- Not covered: multi-turn conversations, images, whether the locker has a 4-hour minimum (finding F-M is waiting on a manual check).
- With a much larger knowledge base you would add retrieval; this prototype deliberately does not.
