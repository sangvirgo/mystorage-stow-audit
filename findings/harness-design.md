# Playwright Harness Design

Status: design only. Nothing has contacted stow.mystorage.vn.

## Layout

```
package.json               scripts: auth, recon, audit
playwright.config.ts       chromium, headed, workers 1, retries 0
.gitignore                 auth/storage-state.json, evidence/network/
tests/cases.json           the approved prompts (id, category, message)
src/
  auth.ts                  npm run auth
  recon.ts                 npm run recon (sends no message)
  audit.ts                 npm run audit
  lib/stow-page.ts         locators and send/wait/extract
  lib/guards.ts            stop conditions
  lib/evidence.ts          transcripts, screenshots, safe network log
auth/storage-state.json    gitignored, never read or printed
evidence/{transcripts,screenshots,network}/
```

I plan to use plain Node scripts that call the Playwright library rather than the `@playwright/test` runner. The runner adds retries, workers and reporters we do not want, and every one of those could send a duplicate production prompt. A plain script that loops over a JSON list is easier to explain.

## Modes

**`npm run auth`** opens headed Chromium at the site. You log in by hand. The script waits for Enter in the terminal, then calls `context.storageState({ path })`. It never reads the file back or prints it.

**`npm run recon`** is new and I would like your approval for it. It loads the site with the saved session and sends no message. It writes an ARIA snapshot and a screenshot of the chat page to `evidence/recon/`. I need this because I do not know the Stow DOM yet, and you asked me not to guess selectors. If the composer or reply container is not reachable by role or label, I will stop and ask you to show me the element.

**`npm run audit`** loads the state, runs the cases in order, and stops on any guard. Optional `--only T04` runs a single case, which is useful for re-checking one finding.

## Per-message flow

1. Log `[time] T01 sending`.
2. Locate the composer by role or label (`getByRole('textbox')` or `getByPlaceholder`, confirmed in recon), fill it with the exact text, press the send button by accessible name.
3. Record the count of assistant messages before sending, so we know which reply is new.
4. Wait for completion: send button re-enabled and the reply text unchanged for 3 s. If recon shows a streaming or typing indicator, use its disappearance as the primary signal. Timeout 90 s. On timeout, save what is visible, mark the transcript "incomplete" and stop.
5. Extract the new reply's `innerText`. Store links as `text (href)`. No normalising.
6. Save the screenshot and transcript, including timing.
7. Sleep 65 s, logged as a countdown, before the next case. No sleep after the last case.

No retries. If a step throws, the run stops and the failure is logged. A failed send is not repeated, because we cannot tell whether the message was already delivered.

## Guards (stop immediately)

- Any response with status 429.
- Two or more 5xx responses to Stow's own origin.
- Page URL moves to a login or auth path, or the composer disappears.
- A CAPTCHA or challenge element (iframe from a known challenge provider, or text like "verify you are human").
- Any request that looks like checkout, payment or final booking. The harness never clicks such controls, and the guard aborts if one appears in the flow.

## Evidence and privacy

- Transcripts follow your format, plus a "Response time" line under Notes.
- Network log records only method, URL path (no query string), status and duration, and only for status >= 400. No headers, cookies, tokens or bodies.
- Screenshots may show your name or email in the UI. I will check the first one with you before anything is committed.
- `auth/` and `evidence/network/` are gitignored.

## Mobile and accessibility (U02, U03)

Run after all messages, in the same session, with no new message. U02 reloads at 390×844 and screenshots. U03 saves the ARIA snapshot and lists unnamed buttons and inputs.

## Open questions

1. Approve adding the message-free `recon` step before the first audit run?
2. Is the 65 s gap fine, or do you want longer?
3. Should messages T02, T07, T08 and T09 keep their Vietnamese diacritics exactly as written? (I assume yes.)
