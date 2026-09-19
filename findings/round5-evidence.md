---
title: "STOW audit — Round 5 evidence and execution ledger"
date: "19 September 2026"
---

# Outcome and counting method

The requested target was 50 tracked cases, combining message tests and responsive/accessibility tests. The run stopped early when the existing HTTP 429 guard fired. **42 cases were attempted: 24 chat submissions and 18 UI cases.** Of these, 21 historical chat replies and 18 new UI cases have completed evidence; three chat attempts ended without a completed captured answer (T18, T23, T24). **T25–T32 were not sent.** No retry was performed.

This is a harness ledger, not the lifetime total of all account activity. Previously reported manual conversations, uploads and older UI observations are additional and are not included in the 42. UI case identifiers in this report are scoped to **Round 5** (R5-U01, etc.); they are not the U01–U03 originally proposed in `findings/test-plan.md`.

Files: `tests/round5.json` defines the 27 planned new cases; `src/round5.ts` executes them; `evidence/round5/results.json` contains measurements; `evidence/state/sent.json` contains chat submission timestamps. The latest submission draft and prototype were preserved.

# Method and limitations

- Own saved authenticated account, real browser UI, headless Chromium.
- The 18 UI cases reused one initial page load and changed viewport or local UI state. No message was sent during those cases. They are not 18 independent reloads.
- No transaction, booking, upload or additional injection test was performed.
- Planned chat messages use fresh browser contexts and at least 65 seconds between submissions. The harness rejects existing assistant history, duplicate IDs and rerunning this round over its saved results.
- The existing guard stops on any 429, authentication problems, CAPTCHA or repeated own-origin server errors. T24 hit that guard.
- Screenshots, bounding rectangles and `elementFromPoint` hit-tests support layout findings. Hit-tests check the centre of each shortcut, not every pixel or every possible scroll position.
- Short-height viewport testing is not a real mobile keyboard test. 320-CSS-pixel reflow is not a browser-zoom test. No Safari, Firefox, physical phone or screen reader was used.
- Proposed fixes are recommendations; no STOW source code was changed.

# Responsive finding R5-R1: shortcut controls are obscured

**Status:** reproduced. **Severity:** Medium for landscape; Low–Medium for 320×568.

**Steps:** open the empty chat and set the viewport to the dimensions below. Inspect the welcome shortcuts and composer without sending a message.

**Expected:** every welcome shortcut remains visible and reachable without being covered by the composer.

**Actual:** shortcut rectangles intersect the composer and their centre hit-tests resolve to another element.

| Case | Viewport | Shortcuts intersecting composer | Shortcut centres not hitting the shortcut |
|---|---|---:|---:|
| R5-U01 | 320×568 | 1 of 3 | 1 of 3 |
| R5-U05 | 568×320 | 3 of 3 | 3 of 3 |
| R5-U06 | 667×375 | 3 of 3 | 3 of 3 |
| R5-U07 | 844×390 | 3 of 3 | 3 of 3 |
| R5-U11 | 390×400 | 2 of 3 | 2 of 3 |
| R5-U18 | 844×390 after rotating a draft | 3 of 3 | 3 of 3 |

The initial 844×390 screenshot visibly shows the composer replacing the area where all three shortcuts lie. At 568×320 the heading also starts above the viewport (y=-32.3). Controls at 360×640, 390×844, 412×915, 768×1024, 1024×768, 1280×720 and 320×900 had no shortcut/composer intersections.

**Impact:** customers on short-height screens lose visible access to suggested entry points. This affects discoverability and the first interaction with the assistant.

**Fix:** use a content region with reserved composer space, reduce vertical centring on short viewports, and ensure scrolling can expose the entire final shortcut above the composer. Add height-sensitive layout checks. The present evidence does not establish that scrolling can never recover the controls.

![R5-U07: all shortcut centres are behind the composer at 844×390](../evidence/round5/U07.png){width=6.2in}

![R5-U01: narrow, short portrait viewport](../evidence/round5/U01.png){width=3in}

# Accessibility finding R5-A1: closed drawer remains tabbable

**Status:** reproduced. **Severity:** Low–Medium.

**Steps:** at 390×844, keep the drawer closed, focus the composer and press Tab. R5-U13 captured 16 focus transitions.

**Expected:** focus moves only through visible, available controls.

**Actual:** Tab reaches the off-screen close button at x=-52 and the new-conversation button at x=-300. Both were outside the viewport.

**Impact:** keyboard users lose visible focus and encounter unavailable navigation actions.

**Fix:** make the closed drawer inert or unmount its interactive subtree; restore focus to the opener on close. Avoid applying `aria-hidden` alone while retaining focusable descendants.

**Evidence:** `evidence/round5/results.json`, entry U13, `detail.sequence`. A still screenshot alone does not demonstrate the off-screen focus transitions.

# Accessibility finding R5-A2: open drawer does not manage focus

**Status:** reproduced. **Severity:** Low–Medium.

**Steps:** open the menu at 390×844, inspect focus, then press Tab repeatedly (R5-U14).

**Expected:** an overlay drawer moves focus into its content and prevents focus moving to covered content while it is open; its trigger communicates open/closed state.

**Actual:** initial focus remains on the opener. Tab reaches welcome shortcuts, the composer and voice controls before the drawer buttons. The opener has neither `aria-expanded` nor `aria-controls`.

**Positive control:** Escape closes the drawer (x becomes -320). Do not report Escape as broken.

**Impact:** keyboard navigation does not follow the visible overlay and can reach covered controls.

**Fix:** choose explicit modal or non-modal drawer semantics. For the mobile overlay, move focus inside, manage focus containment, expose trigger state and restore focus on close.

![R5-U14: drawer open during the focus-order check](../evidence/round5/U14-open.png){width=3in}

# Accessibility observation R5-A3: composer and announcement metadata

**Status:** DOM observations reproduced. **Severity:** Low–Medium; screen-reader impact requires assistive-technology testing.

R5-U17 found no explicit textarea label, `aria-label` or `aria-labelledby`. The placeholder remains present. The empty chat had zero `[aria-live]`, `role=status` or `role=log` regions. This round does not prove that no live region is inserted after a successful reply, nor that the field has no computed accessible name. The language button can derive a name from image alternative text; an empty text/ARIA-label result alone is not a bug.

**Fix:** add a persistent composer label and a tested announcement strategy for incoming replies. Verify with NVDA or VoiceOver before claiming an actual announcement failure.

# Runtime observation R5-E1: load-time parse error reproduced

**Status:** reproduced. **Severity:** Low.

Both actual page loads in this round (the shared UI page and the fresh T24 page) emitted `Invalid or unexpected token`. UI entries carry the shared load's error as context; these are **not 18 separate errors or reloads**. The page rendered. No root cause was established in this round.

**Fix:** inspect the error stack and deployed asset references internally; fail a page-load smoke test on unexpected `pageerror` events.

# Chat attempt T24: no completed response captured before guard stop

Submitted at **2026-09-19 11:15:44.916 UTC / 18:15:44.916 Vietnam time**. The question asked which location was opening soon and requested official sources.

At **11:17:03.901 UTC**, the browser received HTTP 429 from the external Sentry ingestion endpoint. The harness stopped, saved a screenshot, and captured no assistant text. The screenshot shows the submitted message but no response. This is a delivery/reliability observation, not evidence of a false factual answer. It is also not proof that STOW's own chat endpoint was rate-limited or that Sentry caused the missing response. Stopping the client prevents observing any later completion.

**Evidence:** `evidence/transcripts/T24.md`, `evidence/round5/T24-stopped.png`, `evidence/network/errors.jsonl`, `evidence/round5/results.json`.

**Recommended investigation:** correlate the submitted time with server logs, request completion and conversation persistence. Separate telemetry failures from chat failures in the product's monitoring. Keep the stopped test marked incomplete.

![T24 at guard stop: user question visible, no assistant answer captured](../evidence/round5/T24-stopped.png){width=6.2in}

# Positive controls

- R5-U15: empty and whitespace-only drafts keep Send disabled; nothing was submitted.
- R5-U16: a 12-line draft grows the textarea to 180 px and scrolls internally (`scrollHeight=327`, `overflow-y:auto`), without shortcut overlap at 390×844.
- R5-U18: draft text survives the viewport change from portrait to landscape; the landscape shortcut defect still occurs.
- R5-U12: at 320×900, no document horizontal overflow or shortcut overlap was measured. The short-height failures are not universal small-width failures.
- Escape closes the open drawer.

# Planned message cases not executed

| Case | Purpose | Status |
|---|---|---|
| T25 | Luggage per-locker/per-suitcase unit, quote certainty and booking link | Not sent |
| T26 | Both percentage denominators from user-supplied prices | Not sent |
| T27 | Published discount range and illustrative six-month total | Not sent |
| T28 | Basic protection per-CBM amount, cap and exclusions | Not sent |
| T29 | Pre-move cancellation versus post-move termination | Not sent |
| T30 | Friday-to-Sunday delivery notice and urgent surcharge | Not sent |
| T31 | Wine specification versus live reading | Not sent |
| T32 | Unaccented Vietnamese, ambiguous product choice and booking path | Not sent |

The prompts are ready in `tests/round5.json`; their presence does not mean they passed or were submitted. This round adds responsive and accessibility evidence but no completed new response-content test.

# Public reference checks

Official pages were consulted to prepare the remaining tests. The public locations page itself still has conflicting presentation: its summary says District 9 is opening soon while its MT Eastmark section says the lockers are operating. That prevents treating either side of T24 as a simple unquestionable answer. [Locations](https://mystorage.vn/storage-facility/).

Other references: [FAQ](https://mystorage.vn/faqs/), [protection plans](https://www.mystorage.vn/protection-plans/), [terms](https://www.mystorage.vn/vi/dieu-khoan-dich-vu/), [wine](https://mystorage.vn/wine-storage/), [luggage](https://www.mystorage.vn/services/luggage-storage-saigon/). These source checks do not count as additional product test cases.
