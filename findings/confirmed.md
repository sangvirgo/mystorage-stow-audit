# Confirmed Findings (2026-09-19)

## Round 5 addendum (18:17 Vietnam time)

New measurements and screenshots are recorded in [Round 5 evidence](round5-evidence.md). The harness now records 24 chat attempts (T01–T24), plus 18 specifically logged Round 5 UI cases: 42 tracked attempts, not 50. T24 stopped on an external Sentry HTTP 429 without an assistant answer; T25–T32 remain unsent. Manual tests are additional and not included in that total.

This pass reproduces welcome-screen shortcut occlusion at 320×568, 568×320, 667×375, 844×390 and 390×400 using screenshots plus centre-point hit-tests. It therefore supplies new evidence for the previously unreported landscape finding below. It does not prove that scrolling cannot reveal the controls. Closed-drawer off-screen focus is reproduced; open-drawer focus reaches background controls. Escape closes the drawer successfully. Empty-send, multiline-draft scrolling and draft retention on rotation passed their specific checks.

The prior findings and manual confirmations below are preserved as historical context. Full measurements: `evidence/round5/results.json`. Ready-to-share addendum: `reports/round5-evidence.docx`.

Confirmation basis: the user re-ran the questions by hand in fresh chats, and Claude cross-checked replies against public mystorage.vn pages. Items marked **PENDING** still need one manual check by the user before they go in the report.

Message budget note: the plan was 12 messages. More were sent later (T13–T23 in the other tool's report, plus manual re-tests and one image upload). State the real total in the report.

## Confirmed

### F-A — Assistant asserts an unsourced District 7 expansion
- **Severity:** Medium
- **Evidence:** T08 (shared chat), T17 (fresh), manual re-test (fresh): each time Stow says a large self-storage branch will open in District 7 "this year". The last one calls it "official" and offers a waitlist, with no source. The public locations page shows no such facility, and llms.txt names Binh Loi instead.
- **Note:** this shows the claim is unsourced and inconsistent with public sources. It does not prove the plan is false.
- **Fix:** ground location and roadmap facts in a dated source, and say "our team can confirm" when the roadmap is not public.

### F-B — Booking answer omits the booking link and contact
- **Severity:** Medium
- **Evidence:** T03 and a manual fresh re-test: no booking URL, phone or email. T15 (user asked for the link) included them.
- **Fix:** end every booking answer with booking.mystorage.vn and the phone/email.

### F-C — Hard-coded "about 40% cheaper" contradicts Stow's own prices
- **Severity:** Medium–Low
- **Evidence:** T09, T11, T17 and a manual fresh re-test state valet is "about 40%" cheaper unprompted. Stow's own prices give 28.8% (AC) and 20.2% (Non-AC). When asked to compute with prices (T13, two manual re-tests) it is correct.
- **Fix:** compute percentages in code from the two prices shown, or drop the generic figure.

### F-D — Insurance question gets no coverage figures
- **Severity:** Medium
- **Evidence:** T05 and a manual fresh re-test give no amount. The protection page says Basic pays 500,000 VND/CBM up to 10,000,000 VND, and lists Silver/Gold/Platinum limits and exclusions. The fresh reply also says the free plan covers "fire, natural disasters"; not checked against the protection page.
- **Fix:** state the Basic figures and cap first, then link the policy.

### F-E — Luggage price question is not answered
- **Severity:** Low–Medium
- **Evidence:** T07, T16 and two manual re-tests give no amount, only a booking link and a "4-hour minimum". The luggage page says "from 54,000 VND/hr".
- **Caveat:** it is unclear whether 54,000/hr applies to the Ministop locker. Do not suggest multiplying 54,000 × 6.
- **Fix:** state the published starting price with a caveat, then link the live price.

### F-F — Wine specs are wrong or narrowed
- **Severity:** Medium
- **Evidence:** T19 (fresh): humidity "55–65%" and "approximately 15°C", link to the homepage only. The wine page says 12–15°C and 60–70%, with backup power. T10 also gave "approximately 15°C".

### F-G — Valet delivery and warehouse hours are wrong
- **Severity:** Medium
- **Evidence:** T04 and T20: delivery "Monday to Saturday, 9:00–18:00" and an unsourced "off-hours surcharge". Terms say service warehouse Mon–Fri 9:00–17:00 and Sat 9:00–12:00, delivery requests 48 hours ahead (weekends excluded), urgent delivery under 48 hours costs 30% extra. (T20's "support hours Mon–Sat 9–18" matches llms.txt and is not the error. Its "closed Sundays" contradicts llms.txt's remote Sunday support.)

### F-H — Six-month discount presented as fixed
- **Severity:** Low–Medium
- **Evidence:** T09 and T14 say "10% fixed". The FAQ says "normally 5–10%".
- **Caveat:** Stow's internal price data may be newer than the FAQ, so this is overconfidence, not proven error.

### F-I — Menu drawer stays in the keyboard tab order
- **Severity:** Low–Medium
- **Evidence:** measured at 390×844: the drawer is at x=-320..0, no `aria-hidden`, not `inert`. Tab reaches "Đóng menu" and "Cuộc trò chuyện mới" outside the viewport.

### F-J — No live region for chat replies; composer has no label
- **Severity:** Low–Medium
- **Evidence:** 0 `aria-live` and 0 `role=status` elements; textarea named only by its placeholder. Not tested with a real screen reader.

### F-K — JavaScript error on every page load
- **Severity:** Low
- **Evidence:** `pageerror: Invalid or unexpected token` on every load; a `<script>` whose `src` is a `.css` file is present. The page still renders.

## Confirmed, waiting for one more check

### F-L — 320×568: heading clipped and one shortcut hidden (responsive)
- **Severity:** Low–Medium
- **Evidence:** screenshot from the user's Chrome DevTools at 320×568 and `evidence/screenshots/R1-320x568.png`. First heading line is under the header, third shortcut is hidden behind the composer. Control at 360×640: no problem.
- **PENDING:** the user's report that the content cannot be scrolled to reveal them. Take a second screenshot after trying to scroll.

### F-M — Locker overstay fee not stated (D1 Ministop)
- **Severity:** Low–Medium
- **Evidence:** the public booking page (read by Claude, no login, no clicks) states "phí giữ đồ 108.000 VND cho 2 lượt truy cập" after expiry. Stow's replies (T21 and manual re-tests) only say an overstay fee "applies" and is shown at checkout, never the amount. The same page also says no deposit is required, which matches Stow.
- **PENDING:** Stow repeatedly says a "4-hour minimum". That number is not in the page's static text. The user should select a locker on https://booking.mystorage.vn/ministop/tran-khac-chan (no payment) and check the package list. If there is no 4-hour minimum, add it as a wrong claim.

### F-N — 320×568 with an attachment: the chat area shrinks to about 170 px
- **Severity:** Low–Medium
- **Evidence:** the user's DevTools screenshots at 320×568 with one image attached. The item card ("Cabin Suitcase (20 inch), … 3 đồ vật", truncated), the attachment preview and the composer take about 70% of the height; the conversation area is roughly y=95–265. Scrolling the conversation works (user's report).
- **Fix:** collapse the item card and attachment preview into one compact row on small heights.

### F-O — Replies are slow, and "STOW is thinking…" shows no progress
- **Severity:** Low–Medium
- **Evidence (harness, 20 replies, T02–T22):** time from clicking Send until the reply had finished generating ("Dừng" gone): median 24 s, min 7 s, max 77 s, 5 of 20 over 30 s. T02–T12 median 15 s (run around 01:00); T13–T22 median 44 s, T21 77 s, T16 66 s (run around 15:10–15:35). The user also saw "STOW is thinking…" for a suggested question chip ("Giới thiệu về MyStorage") at 320×568.
- **Caveat:** the transcript label "First reply text visible after N ms" is misleading. The harness only starts reading after "Dừng" disappears, so N is the time to a finished reply, not time to first token. The later runs used different times of day and longer prompts (asking for sources), so this shows a range, not a proven regression.
- **PENDING:** the user times the three suggested chips by hand (see chat), one per fresh chat.
- **Fix:** stream partial text, show progress steps instead of a static "thinking", set a timeout with a retry button, and cache pricing lookups.

## Responsive checks done (read-only)
- Existing conversation at 320×568 and 360×640: no horizontal overflow, no element wider than the viewport; menu drawer 272 px wide of 320, fine. The conversation was short, so long replies, the on-screen keyboard, Safari and Firefox are untested.
- Welcome screen at 360×640 and up: no overlap.
- Observation, not a finding: opening a saved conversation makes one request to the app's backend `conversations` endpoint that returns HTTP 406. The conversation still loads, so user impact is unknown.

## Removed or not reported
- **Cancellation "more than 3 days" (old F-05):** did not reproduce in the fresh re-test. Only a Low issue remains (a terms link was requested, homepage given).
- **Public JavaScript bundle inspection (old F-11) and the RAG architecture section:** outside the rules (no reverse-engineering; findings only from real UI and chat).
- **Timeout T18 (old F-16):** no transcript, not a finding.
- **Landscape and 280×480 overlap claims:** not reproduced by the user; not reported.
- **Slow first response (T16 66 s, T21 76 s):** observation only; can be a Low candidate later.
- **Good behaviour to mention:** T12 refused the polite prompt-injection; T02/T07/T08/T09 answered in the customer's language; an uploaded luggage-size chart was read sensibly.
