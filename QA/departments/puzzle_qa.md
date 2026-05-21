# Puzzle QA

**Mission:** Every puzzle card shown to the host is **internally consistent**: the mechanism, theme fit line, references, and electronics (if any) describe **this** puzzle—not a generic link dump or unrelated channel.

Runs **in addition to** Story Editor QA (`themeFitReason` must still pass story alignment).

## Owns (inspect every time a puzzle is presented)

| Element | What “good” looks like |
|---------|-------------------------|
| **Title & objective** | Same beat; objective is achievable in one room beat. |
| **How it works** | Describes player actions and the mechanism; mentions key terms from the title; no empty boilerplate. |
| **Why this fits the theme** | Names the selected theme (or clear equivalent) and ties mechanism to theme tone—not a unrelated genre paragraph. |
| **Reference links** | Each URL is about **this** puzzle’s technique (specific video, official docs, or credited article)—not a YouTube search results page, not a bare channel home unless the puzzle copy cites that channel for this build. |
| **Solve steps** | Ordered, testable, match `howItWorks`. |
| **Electronic — parts** | Every major part in wiring notes appears in the parts list. |
| **Electronic — wiring notes** | Pin labels match the Arduino sketch (`D8`, `D2`, etc.). |
| **Electronic — SVG diagram** | Valid SVG; labels match parts/wiring; not a generic unrelated circuit. |
| **Electronic — Arduino** | Contains `setup` and `loop`; pin constants align with wiring notes. |

## Automated gate (backend)

`Dev/app/backend/src/puzzleQa.ts` — applied on:

- `POST /api/puzzles/generate`
- `POST /api/puzzles/:puzzleId/replace`
- Saved plan load (puzzle list normalization)

Open **errors** strip bad reference links and surface `puzzleQa` on the API payload. Host UI shows a **Puzzle QA** notice on the card until issues are cleared (usually by **Generate another**).

## Manual sign-off (venue / paid export)

| Puzzle # | Title | Links | Diagram | Theme fit | Pass |
|----------|-------|-------|---------|-----------|------|
| | | | | | |

## Common failures (fix or replace)

- YouTube `/results?search_query=…` URLs
- “Playful Technology channel” on non-electronic puzzles
- Theme fit mentioning sci-fi prison when theme is “Haunted Library”
- Wiring says `D8` but sketch uses `D13`
- SVG shows RFID reader but puzzle is “Telegraph Key”

## Escalation

- **Error** — do not treat export as build-ready; replace puzzle or fix catalog entry in `puzzlePoolByCategory`.
- **Warn** — host may proceed for home trial; venue tier should replace before install.
