# Layout check: original behaviour vs fixed

Generated 2026-09-19T14:04:13.931Z with headless Chromium.

"Original" is an approximation of the behaviour measured on stow.mystorage.vn: the same kind of failure (content centred in a fixed-height area that cannot scroll, with the composer laid over it), but not Stow's own CSS, so the exact pixels differ. Measured on Stow itself at 320×568: heading top y=22 under a 57 px header, third shortcut y=403–449, composer textbox y=410–464; no overlap from 360×640 up. "Fixed" is the same look with the fixes applied.

## Welcome screen

"Reachable" means visible at rest or scrollable into view by the user. In the fixed mode a shortcut below the fold is clipped by the scroll area, not covered by the composer, and scrolls into view.

| Viewport | Mode | Heading fully visible | Shortcuts reachable (of 3) | Heading top / 3rd shortcut / composer box (px, at rest) | Horizontal overflow | Page errors |
|---|---|---|---|---|---|---|
| 280×480 | original | NO | 0 | 30 / 440-486 / 325-435 | 0px | 0 |
| 320×568 | original | yes | 1 | 92 / 466-512 / 413-523 | 0px | 0 |
| 360×640 | original | yes | 2 | 145 / 484-530 / 502-612 | 0px | 0 |
| 390×844 | original | yes | 3 | 258 / 575-621 / 706-816 | 0px | 0 |
| 414×736 | original | yes | 3 | 204 / 521-567 / 598-708 | 0px | 0 |
| 568×320 | original | NO | 0 | 41 / 272-337 / 182-292 | 0px | 0 |
| 844×390 | original | yes | 0 | 76 / 307-372 / 252-362 | 0px | 0 |
| 768×1024 | original | yes | 3 | 393 / 624-689 / 886-996 | 0px | 0 |
| 1280×720 | original | yes | 3 | 241 / 472-537 / 582-692 | 0px | 0 |
| 280×480 | fixed | yes | 3 | 73 / 416-462 / 325-435 | 0px | 0 |
| 320×568 | fixed | yes | 3 | 73 / 416-462 / 413-523 | 0px | 0 |
| 360×640 | fixed | yes | 3 | 113 / 391-437 / 502-612 | 0px | 0 |
| 390×844 | fixed | yes | 3 | 213 / 530-576 / 706-816 | 0px | 0 |
| 414×736 | fixed | yes | 3 | 173 / 490-536 / 598-708 | 0px | 0 |
| 568×320 | fixed | yes | 3 | 64 / 219-284 / 260-314 | 0px | 0 |
| 844×390 | fixed | yes | 3 | 75 / 230-295 / 330-384 | 0px | 0 |
| 768×1024 | fixed | yes | 3 | 347 / 579-644 / 886-996 | 0px | 0 |
| 1280×720 | fixed | yes | 3 | 195 / 427-492 / 582-692 | 0px | 0 |

## Conversation with an attached image: room left for the chat

| Viewport | Mode | Chat area (px) | Share of screen height | Horizontal overflow |
|---|---|---|---|---|
| 280×480 | original | 107 | 22% | 0px |
| 320×568 | original | 195 | 34% | 0px |
| 360×640 | original | 283 | 44% | 0px |
| 390×844 | original | 487 | 58% | 0px |
| 414×736 | original | 379 | 51% | 0px |
| 568×320 | original | -37 | -12% | 0px |
| 844×390 | original | 33 | 8% | 0px |
| 768×1024 | original | 667 | 65% | 0px |
| 1280×720 | original | 363 | 50% | 0px |
| 280×480 | fixed | 207 | 43% | 0px |
| 320×568 | fixed | 295 | 52% | 0px |
| 360×640 | fixed | 384 | 60% | 0px |
| 390×844 | fixed | 588 | 70% | 0px |
| 414×736 | fixed | 480 | 65% | 0px |
| 568×320 | fixed | 151 | 47% | 0px |
| 844×390 | fixed | 221 | 57% | 0px |
| 768×1024 | fixed | 768 | 75% | 0px |
| 1280×720 | fixed | 464 | 64% | 0px |

## Accessibility (measured at 390×844)

| Check | Original | Fixed |
|---|---|---|
| Closed menu removed from the tab order (inert or aria-hidden) | NO | yes |
| Tab key never lands inside the closed menu | NO | yes |
| Menu button exposes aria-expanded | NO | yes |
| Composer has a real label (not only the placeholder) | NO | yes |
| Chat has a live region for new replies | NO | yes |
