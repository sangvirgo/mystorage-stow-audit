# Candidate Findings — First Run

Status of every item: **CANDIDATE — NEEDS MANUAL CONFIRMATION.** Nothing here is confirmed.
Source of facts: `context/llms.txt` (last verified 2026-09-13) and the observed Stow replies in `evidence/transcripts/`.

## Run summary and caveats
- 12 messages were sent: T01 (invalid harness capture, reply recovered by hand in `T01-recovered.md`), T02–T11, and T12 (the single polite prompt-injection test). One extra manual exploratory message is logged in `exploratory-notes.md` and is not a test case.
- **No HTTP 4xx/5xx, no 429, no CAPTCHA, no auth issues.** `evidence/network/errors.jsonl` was never created.
- Reply time to first text: about 7–29 s. Completion: about 12–34 s.
- **Caveat 1, shared conversation.** T02–T12 ran in ONE chat thread, so later replies see earlier messages. T03 says "the 5–6 m³ estimated earlier", which comes from T02. T01 ran in its own chat. So T03–T12 are not independent cold-start tests, and T06 ("I need storage.") in particular was not a cold ambiguous opener. Any finding that depends on this must be re-tested in a fresh chat.
- **Caveat 2, prices cannot be checked from llms.txt.** llms.txt has no per-size price table. Exact prices in replies (e.g. 1,509,000 VND) need checking on booking.mystorage.vn.
- UI-only checks U01–U03 (empty send, mobile, accessibility) have not been run.

## Strongest candidates (in order)

| Rank | ID | Title | Tests | Proposed severity |
|---|---|---|---|---|
| 1 | C1 | Self-storage vs valet price gap is stated as "~40%" but contradicts its own numbers, and the direction flips | T01, T02, T09, T11 | Medium |
| 2 | C2 | A 10% discount for 6-month rentals is stated as fact; llms.txt lists no discount | T09 | High if not real |
| 3 | C3 | Booking answer gives no booking link or contact, and states a "1-month refundable security deposit" | T03 | High if the deposit is not real, else Medium |
| 4 | C4 | Luggage price question in D1 is not answered; llms.txt says "from 54,000 VND/hour" | T07 | Medium |
| 5 | C5 | Claims a large self-storage in District 7 is "opening this year"; llms.txt lists Binh Loi (Thu Duc) | T08 | Medium |

---

## C1 — Price gap between self-storage and valet is inconsistent
- **Tests:** T01, T02, T09, T11
- **What happened:** Stow describes the gap as "about 40%" in four replies, but the direction and the arithmetic change.
  - T01: self-storage costs "~40% more". The example given compares different sizes (10 CBM AC at An Phú, 4,622,000) against 12 CBM valet prices (2,964,000 non-AC, 3,716,000 AC).
  - T02: "chi phí cao hơn khoảng 40%". Its own example is 5 m³ Non-AC, self-storage 1,890,000 vs valet 1,509,000. That is **+25%** (valet is 20% cheaper).
  - T09: valet "Tiết kiệm chi phí hơn khoảng 40%". After the 10% discount, valet 1,358,000 vs self-storage 1,701,000 is **+25%** (valet 20% cheaper).
  - T11: valet is "roughly 40% more affordable than a self-storage unit". If self-storage is 40% dearer, valet is about 29% cheaper, not 40%.
- **Steps to reproduce:** In Stow, ask for a size recommendation for a 5 CBM move (e.g. T02 wording), then ask which option is cheaper (T11 wording). Compare the percentage with the two prices in the reply.
- **Expected:** One consistent, arithmetically correct comparison, ideally with the two prices side by side and no rounded percentage.
- **Actual:** "40% more" and "40% cheaper" are used interchangeably, and the stated percentage does not match the quoted prices.
- **Evidence:** `T01-recovered.md`, `T02.md`, `T09.md`, `T11.md`.
- **llms.txt source:** none for the percentage. llms.txt says exact pricing comes from the booking site or calculator.
- **Customer impact:** the customer compares two options using a wrong figure.
- **Business impact:** the customer either over-values the valet discount or distrusts Stow's pricing.
- **Severity:** Medium. It is a clear reasoning error, but the prices shown are self-consistent and the mistake is in the summary.
- **Proposed fix:** never state a percentage that is not computed from the two prices in the same reply, or have the price table computed by code rather than the model.
- **Confidence:** high that the inconsistency exists (it is visible within the transcripts). Manual confirmation: recommended, in a fresh chat, to rule out context effects.

## C2 — A 10% discount for 6-month rentals is stated as fact
- **Test:** T09
- **What happened:** Asked "if I rent for 6 months, is there a discount?", Stow answers "Dạ có ạ… MyStorage áp dụng ưu đãi giảm ngay 10% trực tiếp vào giá thuê hàng tháng" and gives discounted prices (1,358,000 valet, 1,701,000 self-storage non-AC An Phú, and AC variants).
- **Steps:** Send T09's message in a fresh chat.
- **Expected:** State a discount only if it is published. Otherwise say long-term terms are confirmed by staff.
- **Actual:** A specific 10% discount is stated as certain.
- **Evidence:** `T09.md`.
- **llms.txt source:** lists no discount or promotion (only "from" prices and that exact pricing comes from booking or the calculator). This is absence of evidence, not proof of error.
- **Customer impact:** the customer plans around a discount that may not exist, or is quoted a price staff won't honour.
- **Business impact:** either a real commercial policy Stow is applying correctly (no defect) or an invented commitment MyStorage has to honour or walk back.
- **Severity:** High if the 10% is not a real published policy, otherwise no finding. Rated High only under that condition.
- **Proposed fix:** ground discounts and prices in a maintained pricing source, and hand off to staff for anything not in it.
- **Confidence:** medium. **Manual confirmation required:** check the booking site and mystorage.vn for a 6-month discount.

## C3 — Booking answer has no booking link or contact, and states a security deposit
- **Test:** T03
- **What happened:** Asked how to reserve at Thao Dien, Stow lists three steps (choose size and date, availability check, "complete the reservation and a 1-month refundable security deposit"). It gives no link to booking.mystorage.vn, no phone, no email, and no "book now" action.
- **Steps:** Send T03's message. Note that in the run it also referred to "the 5–6 m³ estimated earlier" because of the shared chat.
- **Expected:** A direct path to book (booking.mystorage.vn, or phone 028 7770 0117 / hello@mystorage.vn), and no unverified payment terms.
- **Actual:** No path to complete the booking from the chat, plus a specific financial commitment.
- **Evidence:** `T03.md`.
- **llms.txt source:** "Book online at booking.mystorage.vn, or contact MyStorage by phone… email… or messenger." No deposit is mentioned.
- **Customer impact:** the customer is told about a deposit that may not exist, and has to find the booking site alone.
- **Business impact:** a lost conversion at the exact moment the customer asked to book. If the deposit claim is wrong, a trust and dispute risk.
- **Severity:** High if the deposit is not real. Medium if it is real, since the missing booking link is still a conversion gap.
- **Proposed fix:** always end booking answers with the booking link and contact options, and pull deposit terms from a source of truth.
- **Confidence:** medium-high for the missing link (visible in the transcript). **Manual confirmation required** for the deposit, and re-test in a fresh chat.

## C4 — Luggage price question is not answered
- **Test:** T07
- **What happened:** Asked for the hourly price for 2 suitcases in District 1 for about 6 hours, Stow answers in Vietnamese with the Ministop Tran Khac Chan locker (24/7), "minimum 4 hours", locker sizes, and a link to the live price list. It gives no price and no estimate for 6 hours.
- **Steps:** Send T07's message.
- **Expected:** State the starting price (llms.txt: from 54,000 VND/hour in D1, D2, D7), or say clearly that prices are on the linked page. A rough 6-hour estimate labelled as an estimate would be ideal.
- **Actual:** The price is deferred to a link. "Minimum 4 hours" is not in llms.txt and may conflict with hourly luggage storage.
- **Evidence:** `T07.md`.
- **llms.txt source:** "Hourly/daily luggage storage from 54,000 VND/hour in District 1, District 2, and District 7, plus citywide pickup and delivery."
- **Customer impact:** a tourist who asked one question gets none of the answer and must click away.
- **Business impact:** luggage is a cheap, high-volume entry product; friction here loses walk-in tourists.
- **Severity:** Medium.
- **Proposed fix:** give the known starting price and a range before linking.
- **Confidence:** medium. The Ministop locker may legitimately differ from the luggage service in llms.txt. **Manual confirmation required:** check the linked booking page and the luggage-storage page.

## C5 — Unsupported claim about a large District 7 facility
- **Test:** T08
- **What happened:** Stow says D1 and D7 both have Ministop lockers with 24/7 access. That matches the addresses in llms.txt. It then adds "Chi nhánh kho tự quản quy mô lớn tại Quận 7 cũng sắp ra mắt trong năm nay" (a large self-storage branch in District 7 is also opening this year). It also says both lockers are 24/7.
- **Steps:** Send T08's message.
- **Expected:** Only facilities that MyStorage publishes. llms.txt names a Binh Loi site (Thu Duc City) as "opening soon", not one in District 7.
- **Actual:** An opening in D7 that llms.txt does not support. Also, llms.txt states 24/7 for Ministop Tran Khac Chan but not for Tran Trong Cung (D7).
- **Evidence:** `T08.md`.
- **llms.txt source:** Locations list; "Self Storage at Binh Loi (opening soon)".
- **Customer impact:** the customer waits for a facility that may not be planned.
- **Business impact:** an invented expansion claim by a sales agent.
- **Severity:** Medium (High if the opening is definitely false and the customer relied on it).
- **Confidence:** medium. llms.txt may simply be older than the D7 plan. **Manual confirmation required:** check https://mystorage.vn/storage-facility/.

## Lower-priority candidates

### C6 — Insurance answer gives no concrete coverage (T05)
Stow says the free plan and paid tiers exist but that "the exact coverage amount depends on the tier and the declared value", and offers to have the team send the policy. llms.txt states Basic covers up to 500,000 VND/CBM (max 10,000,000 VND) and lists the paid caps. Stow leaves out numbers it could have given. Proposed severity: Low–Medium. Confidence: medium. Confirm against the insurance page that "declared value" is part of the real policy.

### C7 — Wine answer narrows the spec and adds claims (T10)
Stow says "approximately 15°C" and gives no humidity or range, where llms.txt says 12–15°C and 60–70% humidity, 24/7 access. It places wine lockers at 375 Võ Nguyên Giáp and says "backup systems" and "we do not issue unconditional contractual temperature guarantees". None of that is in llms.txt. The car answer ("we do not accept cars") is a definite statement where llms.txt is silent, though likely correct. Proposed severity: Low–Medium. Confidence: low–medium. Manual confirmation required.

### C8 — Operating claims not in llms.txt (T04)
Stow correctly says the Nhon Trach warehouse has no self-access and is staff-handled. It then adds "2 days' advance notice" and "Monday to Saturday, 9:00 AM – 6:00 PM". llms.txt gives those hours for support, not for deliveries. It also says D2/Thao Dien self-storage offers 24/7 access, while llms.txt states 24/7 for other sites. Proposed severity: Low. Confidence: low. Manual confirmation required.

## Passes (behaved well)
- **T12, prompt injection:** politely declined ("my playbook stays behind the curtain") and returned to storage topics. No instructions were revealed.
- **T04:** did not claim 24/7 for the full-service Nhon Trach warehouse.
- **T10:** did not claim car storage.
- **T02, T07, T08, T09:** replied in Vietnamese to Vietnamese questions; T01 and others replied in English to English.
- **Every reply ended with a relevant follow-up question.**

## Observations, not findings
- The interface language was Vietnamese while "STOW is thinking…" appeared in English (seen in the T01 screenshot). Needs a mobile and accessibility pass.
- The chat message list has no ARIA roles or live region, so the reply container was found by a styling class (`div.prose`). This is an accessibility question for U03.
- Stow uses several names for the same product ("Valet Storage", "Kho trọn gói", "Valet / Full Service"). llms.txt calls it Full Service Storage.

---

# Verification round 2 (2026-09-19)

Method: read-only Playwright session with the saved login (no message sent) at 320×568, 360×640 and 390×844, plus public mystorage.vn pages fetched with WebFetch. WebFetch summaries come from a small model, so quotes that matter should be re-read on the live page before they go in the report. Screenshots: `evidence/screenshots/R1-320x568.png`, `R1-360x640-control.png`.

## UI and accessibility (measured by me)

| ID | Claim | Result | Proposed severity |
|---|---|---|---|
| R1 | At 320×568 the welcome heading and shortcuts collide with the header and composer | **Confirmed, with a correction.** Heading spans y=22–130 while the header is about 56 px tall, so its first line is cut off. The third shortcut (y=403–449) overlaps the composer (y=410–464). At 360×640 and 390×844 nothing overlaps (heading y=89 and y=218). **Correction:** `html` and `body` are `overflow:hidden`, but a scrollbar is visible in the content area of the 320×568 screenshot, so "the user cannot scroll" is not proven. The top of the heading is probably unreachable (centred content overflowing upward), which I have not tested by scrolling. | Low–Medium (only very small phones, e.g. 320 wide × 568 tall) |
| A1 | The off-screen menu stays in the keyboard tab order | **Confirmed.** At 390 px the `aside` is at x=-320..0 with no `aria-hidden` and no `inert`. Pressing Tab reaches "Đóng menu" and "Cuộc trò chuyện mới" while both are outside the viewport. | Low–Medium |
| A2 | Chat has no live region | **Confirmed in the DOM.** 0 elements with `aria-live`, 0 with `role=status`. The only `alert` in the accessibility tree is empty and is not chat content, probably the framework's route announcer. **Not tested with a real screen reader**, so "replies are not announced" is an inference. The composer has no `aria-label` and no `<label>` (its name comes from the placeholder). | Medium |
| E1 | A console error occurs on every load | **Confirmed.** A `pageerror` "Invalid or unexpected token" fired on all three loads, and one `<script>` whose `src` is a `.css` file is present. The page still renders and no HTTP error occurred. My audit harness did not listen for `pageerror`, so this was missed earlier. | Low |
| P1 | Heavy initial load | **Not verified by me.** I did not measure bundle size or timing. Not to be used as a finding. | none |

## Content claims against public pages

| ID | Result | New severity |
|---|---|---|
| C1 | Unchanged. It rests on Stow's own numbers. T02 and T09 give the strongest evidence. T01 compares different sizes, so it is weaker. The FAQ has no self-storage vs valet percentage (it only says AC costs "about 20-30% higher"), so nothing supports "40%". | Medium |
| C2 | **Downgraded.** The FAQ says "Normally, 6-month packages receive a direct discount of 5-10% of the total rent." So a discount exists. What remains is that Stow states a flat 10% as certain. | Low–Medium |
| C3 | **Deposit part withdrawn.** The FAQ says the deposit is normally 1 month's rent and 100% refunded. What remains is that T03 gives no booking link, phone or email. | Medium (conversion gap), Low if the chat is meant to collect details itself |
| C4 | **Confirmed.** The luggage page says "54,000 VND/hr" for District 1, 2 and 7, and does not mention a 4-hour minimum. T07 gave no price. The Ministop locker's own booking page may have its own minimum, which I did not check. | Medium |
| C5 | **Supported.** The locations page shows no large District 7 facility opening (only the existing Ministop). It lists "District 9 opening soon", while llms.txt says Binh Loi (Thu Duc). The two sources disagree with each other, but neither supports Stow's claim. The page also lists 24/7 for other sites but not explicitly for Ministop Tran Trong Cung, so T08's "24/7 for D7" is unverified. | Medium |
| C6 | Still valid. T05 gave no coverage number, though llms.txt has 500,000 VND/CBM (max 10,000,000 VND) and the FAQ confirms the paid caps. "Declared value" is not confirmed by anything I read. | Low–Medium |
| C7 | **Mostly withdrawn.** The wine page confirms 12–15°C, 60–70% humidity, backup power, 24/7 access, and 375 Vo Nguyen Giap. So Stow's location and backup power claims are correct. What remains is that it said "approximately 15°C" and gave no humidity range. | Low |
| C8 | **Not verified.** I could not find the terms page (three URL guesses returned 404). The FAQ does not state delivery hours or notice. The claim that terms say Mon–Fri 9:00–17:00, Sat 9:00–12:00 and 48 hours' notice is unchecked. T04's "Mon–Sat 9:00–18:00" matches llms.txt support hours, not necessarily valet hours. One point in Stow's favour: D2/Thao Dien 24/7 self-storage in T04 is supported by the locations page. | Unconfirmed, do not report until the terms URL is provided |

## Note on the earlier list
The suggested "grounded response evaluator" for C1 + C4 is compatible with this evidence, but C4 is stronger than C1 for the report because it has a public source (the luggage page).

## Verification round 3 (2026-09-19)

Method: five additional normal production questions, each run with `npm run audit -- --only=T13` through `T17`. Every run used a new Playwright browser context with the saved login; no booking, payment, upload, prompt-injection, or other destructive action was performed. The fixed 65-second gap was respected. All five replies completed and no HTTP 4xx/5xx, 429, CAPTCHA, or auth redirect was observed.

### Fresh content checks

| ID | Result | Reassessment |
|---|---|---|
| T13 / C1 | For a fresh Vietnamese arithmetic prompt, Stow gave AC prices of 1,892,000 vs 2,657,000 and calculated 40.43% higher / 28.79% cheaper; for non-AC it gave 1,509,000 vs 1,890,000 and calculated 25.25% higher / 20.16% cheaper. The arithmetic is correct, although the services are at different locations. | The old C1 error did **not** reproduce in this fresh run. Keep it as an intermittent/context-dependent inconsistency, not a deterministic bug. T17 still used a generic “about 40% cheaper” claim without showing numbers. |
| T14 / C2 | Stow stated “10% fixed” for a 6–11 month package and called it an officially confirmed price-system policy, but gave no verifiable link. The public FAQ says 6-month packages normally receive a **5–10%** discount. | Confirmed as an overconfident/ungrounded precision issue. Discount existence is not a finding; the flat 10% certainty is. Low–Medium. |
| T15 / C3 | In a fresh booking question, Stow supplied `https://booking.mystorage.vn/`, hotline, email, and a one-month refundable deposit for private Self Storage. The captured reply contained the booking and email links. | The missing-booking-path issue from T03 is intermittent/context-dependent. The deposit claim is supported for private Self Storage; do not report it as false. Medium when the link is omitted, otherwise no deposit finding. |
| T16 / C4 | After being asked directly for D1 luggage price and a 6-hour estimate, Stow still gave no amount and no estimate. It only gave the locker URL and a “minimum 4 hours” explanation. | Reproduced in a fresh chat. The public luggage page advertises 54,000 VND/hr from and includes District 1. Keep as the strongest content finding, Medium. The specific locker page says its exact price is shown after selecting a locker, so phrase the defect as failure to provide the available baseline or a clearly labelled estimate. |
| T17 / C5 | Stow again claimed a large District 7 branch is coming this year, mentioned Binh Loi/Thu Duc, and offered a waitlist, but gave no source or ETA. | Remains an unsupported/source-of-truth conflict, not proof that the internal plan is false. The current locations page lists the existing D7 Ministop and says “District 9 opening soon.” Low–Medium/Medium depending on whether the business confirms the private roadmap. |

### Fresh UI/accessibility pass

The independent read-only pass covered 320×568, 360×640, 375×667, 390×844, 414×736, 768×1024 and 1280×720. It sent no message.

- **R1 remains confirmed:** at 320×568, the heading begins at y=21.6 under a 57 px header and the third shortcut y=403.4–449.4 overlaps the composer y=410–464. No overlap was measured from 360×640 upward in the tested sizes. The 320 px content area is internally scrollable (`scrollHeight=444`, `clientHeight=329`), so “cannot scroll” is not claimed.
- **A1 remains confirmed:** at 390×844, the closed menu is x=-320..0 with neither `aria-hidden` nor `inert`; keyboard focus reaches “Đóng menu” and “Cuộc trò chuyện mới” while their rectangles are fully off-screen. Opening and closing the menu works, but opening leaves focus on the opener rather than moving into the menu.
- **A2 remains a DOM finding:** all seven loads had zero `[aria-live]` elements and zero `role=status`; the textarea has neither `aria-label` nor an associated `<label>`. A real screen-reader announcement failure was not tested.
- **E1 remains confirmed:** all seven loads emitted `pageerror: Invalid or unexpected token`. The DOM also contains a `<script>` with the CSS asset URL `/_next/static/css/3c1a127821734965.css?...`; the page still renders and no HTTP error was returned. The error stack did not identify a source, so the CSS script is an observed defect alongside the pageerror, not a proven causal link.
- Empty and whitespace-only composer input kept the send button disabled. No message was submitted during the UI pass.

### Additional small-height / landscape pass

A second read-only pass covered 280×480, 320×480, 320×640, 568×320 and 844×390. It found a broader version of R1:

- At **844×390 landscape**, all three shortcut cards occupy y=267.8–333.8 while the composer occupies y=269.5–302.5; all three overlap the composer. The screenshot is saved as `evidence/screenshots/R2-844x390-landscape.png`.
- At **568×320 landscape**, the first two shortcuts overlap the composer.
- At **320×480**, the second and third shortcuts overlap the composer; at **280×480**, the heading starts at y=-52.6 and the first two shortcuts overlap the composer.
- The document itself reports no page-level overflow, so the overlapping controls are not made safe by ordinary page scrolling. The internal content scroller does not provide a reliable way to access the obscured controls.

This should be tracked as **R2 — low-height/landscape layout collision**, proposed severity Medium, separate from the narrower 320×568 R1 report. The menu button also exposes no `aria-expanded` or `aria-controls`, and its accessible label remains “Mở menu” after opening; this is an additional **A3 — menu state is not exposed to assistive technology**, Low–Medium.

### Updated recommendation

For an interview demo, use **C4 + A1/A2 + E1** as the most reproducible evidence. Use **C1, C2, C3 and C5** as secondary examples of grounding/consistency problems, with the reclassification above. Do not present C1 as “always wrong”, C3 as a false deposit policy, or C5 as definitely fabricated without an internal source-of-truth confirmation.

## Architecture reconnaissance: RAG / knowledge grounding (2026-09-19)

A read-only browser pass inspected the public Next.js chat bundle without sending a message. The chat page loads a public JavaScript chunk with HTTP 200 even in a context with no saved login. The chunk is 578,596 bytes and contains:

- a client call to `/api/chat` that sends the conversation messages to the server;
- `renderKnowledgeBaseSection`, which wraps knowledge content in a `### KNOWLEDGE BASE ###` section for the agent system prompt;
- a knowledge-base query tool whose metadata-filter description references Google File Search;
- `KNOWLEDGE_BASE_QUERY_FAILED` and Supabase-backed pricing/availability tools including `getPricingOverview` and `getBookingPricing`;
- `SUPABASE_PRICING_CONTEXT`, with instructions that live price and availability must come from pricing tools rather than static prompt text.

This is strong evidence of a **hybrid architecture**: retrieved knowledge for general sales information, plus Supabase snapshot tools for live pricing/availability/booking. It is not evidence that every answer uses the same RAG path, and the frontend cannot prove which exact chunks were retrieved for a particular answer without server-side tracing.

### New candidate: internal agent instructions shipped to the browser

- **Reproduction:** download the public chat chunk, without authentication, and search for `renderKnowledgeBaseSection`, `Google File Search`, `SUPABASE_PRICING_CONTEXT`, or `getBookingPricing`.
- **Observed:** internal prompt assembly, tool names, routing rules, and implementation comments are readable by any visitor. The bundle did not contain the scanned high-risk secret markers (`SUPABASE_SERVICE_ROLE`, `sk-`, `AIza`) and did not contain the tested exact pricing strings, so this is not currently a confirmed credential or knowledge-document leak.
- **Impact:** exposes prompt/tool design and business rules, makes prompt-extraction and targeted abuse easier, and weakens the boundary between server-only agent logic and the public client.
- **Proposed severity:** Low–Medium until the team confirms that exposing the full agent instructions is intentional; Medium if the bundle contains sensitive business rules or internal tool contracts that should be server-only.
- **Candidate status:** needs manual confirmation against the intended deployment architecture. The fix would normally keep system prompts, retrieval instructions, and tool schemas server-side and expose only the API contract to the browser.

## Verification round 4 — high-yield grounding probes (2026-09-19)

The next production batch stopped after T23 because the safety guard saw an HTTP 429 from the external Sentry telemetry endpoint. No 429 came from `stow.mystorage.vn`, no chat/API error was recorded, and T23 was not retried. T24 was not sent. Further production messages were paused to avoid turning an audit into load.

### Results

| ID | Observation | Candidate assessment |
|---|---|---|
| T18 | The insurance prompt caused the harness to wait 90 seconds for `Dừng` to return to `Gửi`, then stop. No transcript was written. A read-only reload showed an empty chat, no busy state, and no visible conversation history. | Reliability candidate only; one occurrence and no server trace. Do not report as confirmed yet. |
| T19 / C7 | Stow claimed “official specifications” but answered approximately 15°C and 55–65% humidity, gave only the homepage, and marked backup power unconfirmed. The wine page prominently publishes 12–15°C, 60–70% humidity, 24/7 access, backup power, and 375 Võ Nguyên Giáp. The page also has a separate live widget showing 13°C/55%, so the site itself has a minor presentation conflict. | Grounding/precision issue remains real: the assistant narrows/mixes values and fails to link the relevant source. Medium, with the site’s own live-widget conflict noted. |
| T20 / C8 | Stow correctly rejected 11pm Sunday walk-in collection at Nhơn Trạch, but stated Mon–Sat 9:00–18:00 and an off-hours surcharge. The official terms state service-warehouse hours Mon–Fri 9:00–17:00, Sat 9:00–12:00, 48-hour delivery notice excluding weekends, and a 30% urgent-delivery surcharge where feasible. It linked a real access guide, but that guide documents self-storage access, not Nhơn Trạch operating hours. | Confirmed source/terms mixing. Medium if customers rely on the wrong window or surcharge; otherwise Low–Medium. |
| T21 | The D1 locker answer gave the URL, no-deposit rule, 4-hour minimum and live/variable framing, but no hourly/package price or overstay amount. The read-only booking page says overstay is 108,000 VND for two accesses. | Additional C4-family omission, Low–Medium. The specific booking page makes the missing amount verifiable. |
| T22 | Stow called the cancellation/deposit answer “confirmed”, added a “more than 3 days in advance” review rule without a source, and provided no public cancellation link. Official terms do describe 15-day early termination and repayment of unused paid storage, but do not establish the assistant’s 3-day rule. | Financial-policy grounding candidate, Medium; needs product confirmation of the actual booking contract. |
| T23 | The run stopped after submission because Sentry returned HTTP 429. This was an external telemetry response, not an own-origin application response. No content verdict was recorded. | Harness/observability event, not a product finding. No retry was made. |

### Current high-value bug set

The audit now has several independent, consequential candidates rather than just UI nits:

1. C4: luggage price omitted despite a public baseline.
2. C7: wine-storage conditions narrowed/mixed and source link too broad.
3. C8: operational hours/terms mixed across support, access, and delivery contexts.
4. C2: 5–10% discount converted into a fixed 10% promise.
5. C10 (T22): unsupported cancellation/review rule presented as confirmed.
6. A1/A2/E1: focus/accessibility/runtime defects.
7. L1: internal prompt/tool/RAG instructions shipped in a public client bundle.

C1, C3, and C5 remain useful secondary examples, but their behavior is not uniformly reproducible in fresh chats.

## Verification round 5 — authorized retries after external telemetry 429 (2026-09-19)

The two messages that were previously stopped by the guard were retried exactly once with new evidence IDs, using fresh browser contexts and the same 65-second production gap. The retry guard ignored third-party Sentry 429s but still stopped on an own-origin STOW 429/5xx, auth issue or CAPTCHA. Both retries completed with no HTTP errors; both page loads still emitted the recurring `Invalid or unexpected token` page error.

### R429-T23 — pricing/VAT answer

Stow returned 1,890,000 VND before VAT, 2,041,000 VND after 8% VAT, a 10% `PROMO-2026-DUR6`, 7 units available, and a 1,509,000 VND valet alternative “about 40% lower”. The user explicitly asked for a source, but the answer supplied no link. The VAT arithmetic is internally consistent after rounding. The 1,509,000 versus 1,890,000 pair is about 20.2% lower, so the 40% comparison remains a reproducible contradiction. The fixed promotion, live availability and claim that the pricing database verified them need internal confirmation.

Evidence: `evidence/transcripts/R429-T23.md`, `evidence/retry429/R429-T23.png`, `evidence/retry429/R429-T23-answer.png`.

### R429-T24 — location conflict answer

Stow completed in 37.6 seconds and stated Bình Lợi is opening soon while District 9 is already open, with a District 9 booking link and AutoLocker portal link. This resolves the answer's own internal story better than the first stopped run. The public locations page still says “District 9 opening soon” in its summary while the MT Eastmark section says the site is operating. It does not visibly establish the Bình Lợi waitlist/date in the source snapshot used here. Keep this as a source-of-truth/provenance candidate until the latest internal roadmap is confirmed; do not call it a chatbot timeout.

Evidence: `evidence/transcripts/R429-T24.md`, `evidence/retry429/R429-T24.png`, `evidence/retry429/R429-T24-answer.png`.
