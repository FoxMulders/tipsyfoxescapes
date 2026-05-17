# Puzzle QA — Test Plan

Validates department checklist in `departments/puzzle_qa.md` and automated gate in `puzzleQa.ts`.

## PQ-01 Reference link relevance

1. Generate a full puzzle set for any theme.
2. For each puzzle, open reference links (or inspect API JSON).

**Expected**

- No `youtube.com/results?search_query=` URLs.
- No duplicate identical links across unrelated puzzles.
- Each remaining link title or path shares a meaningful token with that puzzle’s title, objective, or how-it-works text—or is an official doc host (`arduino.cc/reference`).

## PQ-02 Theme fit names theme

1. Select theme **Haunted Library** (or any non-generic theme).
2. Generate puzzles.

**Expected**

- Every `themeFitReason` contains the theme name or a keyword from it (≥4 letters).
- No theme fit paragraph dominated by an unrelated genre (e.g. “sci-fi prison” for a library theme).

## PQ-03 Electronic diagram coherence

1. Generate until at least one **electronic** puzzle is present.
2. Compare parts list, wiring notes, SVG labels, and Arduino sketch pins.

**Expected**

- `puzzleQa.passed` is true OR only `warn`-severity issues.
- Pin numbers in wiring match `#define` / `const` pins in code.
- SVG is well-formed and includes at least two part names from the parts list.

## PQ-04 Replace re-runs QA

1. Reject one puzzle and accept replacement.

**Expected**

- Replacement has fresh `puzzleQa` report.
- Rejected puzzle’s bad links do not reappear on the new card.

## PQ-05 UI surfaces QA status

1. With backend returning `puzzleQa.issues` (use a catalog puzzle known to fail—or temporarily break QA in dev).

**Expected**

- Puzzle card shows **Puzzle QA** notice listing fields to fix.
- **Generate another** still works.

## PQ-06 Export includes only QA-scrubbed links

1. Export plan after generate.

**Expected**

- Markdown reference section per puzzle matches API `referenceLinks` after QA filter (no search-result URLs).

## Severity

- **Sev 1** — Wrong or broken links; electronic diagram unsafe or unrelated.
- **Sev 2** — Theme fit clearly wrong theme; how-it-works contradicts objective.
- **Sev 3** — Warnings only; host can adapt.
- **Sev 4** — Copy polish.

## Exit criteria

- PQ-01 through PQ-04 pass on three different themes (indoor, outdoor, commercial event context).
- No Sev 1 open on default catalog puzzles after QA gate deploy.
