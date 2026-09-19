# STOW audit evidence images

All images in this folder are captured from the Playwright audit or the read-only UI checks. For chat cases, the `Txx.png` file is the full-page capture and `Txx-answer.png` is the cropped assistant answer. `R429-*` files are the one authorized retry of the cases previously stopped by the external Sentry `429` guard.

## Chat cases

| Cases | Evidence |
|---|---|
| T01–T22 | `T01.png` through `T22.png` |
| T23 retry | [R429-T23 full](R429-T23.png) · [answer](R429-T23-answer.png) |
| T24 original stop | [T24 stopped](T24-stopped.png) |
| T24 retry | [R429-T24 full](R429-T24.png) · [answer](R429-T24-answer.png) |
| T25 | [full](T25.png) · [answer](T25-answer.png) |
| T26 | [full](T26.png) · [answer](T26-answer.png) |
| T27 | [full](T27.png) · [answer](T27-answer.png) |
| T28 | [full](T28.png) · [answer](T28-answer.png) |
| T29 | [full](T29.png) · [answer](T29-answer.png) |
| T30 | [full](T30.png) · [answer](T30-answer.png) |
| T31 | [full](T31.png) · [answer](T31-answer.png) |
| T32 | [full](T32.png) · [answer](T32-answer.png) |

## Responsive and accessibility cases

| Cases | Evidence |
|---|---|
| Existing responsive captures | `R1-320x568.png`, `R1-360x640-control.png`, `R2-280x480.png`, `R2-568x320-landscape.png`, `R2-844x390-landscape.png` |
| R5-U01–U13 | `U01.png` through `U13.png` |
| R5-U14 | [full](U14.png) · [menu-open capture](U14-open.png) |
| R5-U15–U18 | `U15.png` through `U18.png` |

The measurements and verdicts for these images are in [round5-evidence.md](../round5-evidence.md). The execution ledger is [round5 results](../round5/results.json); the new chat retries are in [retry results](../retry429/results.json) and the final T25–T32 run is in [remaining results](../remaining50/results.json).
