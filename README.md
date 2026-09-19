# Stow audit

Black-box audit of https://stow.mystorage.vn (own account, real UI, one message at a time) plus two prototypes.

| Path | What it is |
|---|---|
| `reports/submission.pdf` (source `reports/submission.md`) | The audit report: scope, method, findings, prototypes, what I rejected from AI output, time spent |
| `prototype/` | Grounded-answer pipeline and evaluation set (`prototype/README.md`), the Answer Inspector (`prototype/demo/index.html`) and the responsive/accessibility fix (`prototype/ui/index.html`) |
| `src/`, `tests/`, `evidence/`, `findings/` | The Playwright audit harness, its prompts, transcripts, screenshots and finding notes |

Secrets are never committed: `.env` files and `auth/storage-state.json` are in `.gitignore`.

---

# Stow audit harness

Black-box audit of https://stow.mystorage.vn using my own account, through the real UI, one message at a time.
Not a penetration test: no auth, rate-limit or CAPTCHA bypass, no bookings, no purchases.

## Setup

```
npm install
npx playwright install chromium   # only if Chromium is not installed yet
npm run typecheck
```

Needs Node 24+ (runs the `.ts` files directly).

## 1. Log in (you, by hand)

```
npm run auth
```

A Chromium window opens on Stow. Log in yourself, then press Enter in the terminal.
The login state is saved to `auth/storage-state.json` (gitignored, never printed).

## 2. Recon (sends NO message)

```
npm run recon
```

Loads Stow with the saved login and writes `evidence/recon/recon.png`, `aria-snapshot.yml` and `elements.json`.
These may show your name or email; they are gitignored. Selectors in `src/lib/selectors.ts` are filled in from them.

## 3. Audit (only after selectors are set)

```
npm run audit                      # all 12 cases in tests/cases.json
npm run audit -- --only=T01,T02,T03   # a subset, e.g. the pilot
```

Guarantees:
- one headed Chromium, one message at a time, no retries;
- fixed 65 s minimum gap between submitted messages, also enforced across separate runs;
- a message id is recorded before it is sent and is never sent twice (`evidence/state/sent.json`);
- T12 (the single prompt-injection message) must be last;
- stops on HTTP 429, two or more 5xx from mystorage.vn, 401/403, a login redirect, CAPTCHA, or a reply timeout (90 s).

Output per test: `evidence/transcripts/<id>.md` and `evidence/screenshots/<id>.png`.
Only HTTP errors (method, host, path, status) are logged, to `evidence/network/errors.jsonl`. No cookies, headers or tokens.

## Layout

```
src/auth.ts  src/recon.ts  src/audit.ts
src/lib/{config,guards,selectors,evidence}.ts
tests/cases.json      the approved messages
findings/             plan, candidates, decision log, time log
```
