# Evaluation results: holdout set

Generated 2026-09-19T10:47:39.106Z.
Model: gemini-3.5-flash-lite, temperature 0, 3 run(s) per case, whole source registry in the prompt.
Frozen inputs (sha256, first 12 chars): system prompt c5fdad6ad8e6, naive prompt 47182439d51c, sources cc47bd191d74, dev cases 44d961819e4f, holdout cases 1a1ef5757893.

- **Stow (recorded)**: the unedited production reply in the audit transcript. One sample, shown as problem evidence, not as a like-for-like comparison.
- **Naive (same model)**: same model, same sources, same prices, plain one-line instruction.
- **Proposed, first pass**: rules prompt plus code-computed percentages, before the runtime check.
- **Proposed, final**: after the runtime check and at most one repair call.

A case passes only if every check passes. Checks are regex heuristics: read the answers too.

| Case | Finding | Stow (recorded) | Naive (same model) | Proposed, first pass | Proposed, final | Repaired |
|---|---|---|---|---|---|---|
| H01 | Holdout, paraphrase of F-B: Vietnamese booking question | - | 3/3 | 3/3 | 3/3 | 0/3 |
| H02 | Holdout, paraphrase of F-C: direct percentage question | - | 3/3 | 3/3 | 3/3 | 0/3 |
| H03 | Holdout, missing information: three suitcases, 8 hours, District 2 | - | 3/3 | 3/3 | 3/3 | 2/3 |
| H04 | Holdout, pressure to confirm an estimate as a certain total | - | 1/3 | 3/3 | 3/3 | 0/3 |
| H05 | Holdout, paraphrase of F-D: fire damage question in Vietnamese | - | 3/3 | 3/3 | 3/3 | 1/3 |
| H06 | Holdout, related to F-H: discount for paying a year upfront | - | 3/3 | 3/3 | 3/3 | 0/3 |
| H07 | Holdout, access hours at a specific self-storage site (An Phu) | - | 3/3 | 3/3 | 3/3 | 3/3 |
| H08 | Holdout, service not in the sources: car storage | - | 1/3 | 3/3 | 3/3 | 0/3 |
| H09 | Holdout, conflicting sources: which site is opening soon | - | 1/3 | 2/3 | 2/3 | 0/3 |
| H10 | Holdout, keep-as-is: simple contact question the baseline should already get right | - | 3/3 | 3/3 | 3/3 | 0/3 |
| H11 | Holdout, missing information: vague price question | - | 2/3 | 3/3 | 3/3 | 0/3 |
| H12 | Holdout, paraphrase of F-F: wine humidity | - | 0/3 | 3/3 | 3/3 | 3/3 |
| **Total** | | | 26/36 | 35/36 | 35/36 | |

## Failed checks

### H01
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H02
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H03
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
- Proposed run 3: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
### H04
- Naive run 1: Does not confirm 324,000 as the total; Replies in the customer's language (English) [Vietnamese-letter ratio 0.231]
- Naive run 2: Does not confirm 324,000 as the total; Replies in the customer's language (English) [Vietnamese-letter ratio 0.245]
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H05
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
### H06
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H07
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
- Proposed run 2: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
- Proposed run 3: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
### H08
- Naive run 1: Gives a booking link or contact (URL, phone or email); Replies in the customer's language (English) [Vietnamese-letter ratio 0.234]
- Naive run 2: none
- Naive run 3: Gives a booking link or contact (URL, phone or email)
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H09
- Naive run 1: Says the team should confirm
- Naive run 2: Says the team should confirm
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: Mentions Binh Loi (llms.txt)
### H10
- Naive run 1: none
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H11
- Naive run 1: Asks a clarifying question
- Naive run 2: none
- Naive run 3: none
- Proposed run 1: none
- Proposed run 2: none
- Proposed run 3: none
### H12
- Naive run 1: Humidity range 60-70%
- Naive run 2: Humidity range 60-70%
- Naive run 3: Humidity range 60-70%
- Proposed run 1: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
- Proposed run 2: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
- Proposed run 3: none (first reply broke: The reply states figures but cites no source. Add the full URL of the source page from SOURCES for each fact.; still broken after repair: nothing)
