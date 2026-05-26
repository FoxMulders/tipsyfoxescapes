# Story Design QA

**Mission:** Every generated **output review** page reads like a coherent escape-room story a host can build — not builder meta, not filler inventory, and not nonsense prop pairings.

## Owns

- Output review: premise, situation, progression rule, puzzle–story links
- Inventory anchor copy on puzzles (`physical_anchor_prop`, `themeFitReason` tie-ins)
- Suggested staging / props lists (no repeated generic beats per item)
- Flowchart labels that must match puzzle stations

## Checklist (each puzzle generate / replace)

1. **Book-cover premise** — Hook reads like back-cover copy; no “fake room”, “cast inside”, or builder-tool language.
2. **In-fiction situation** — Stakes name the theme and environment; no fourth-wall breaks.
3. **Per-puzzle progression** — Progression rule lists each puzzle, what solving it earns, and what opens next.
4. **Prop affordances** — Listed inventory anchors match mechanism (lamp → light beats; bookshelf → book/spine beats; not magnetic locks on floor lamps).
5. **No filler inventory** — Do not repeat the same zone tip on every prop; only surface props tied to a puzzle beat.
6. **Story Editor handoff** — Theme lock and stage puzzle IDs still pass Story Editor QA.

## Sign-off

| Reviewer | Theme | Pass / fail | Notes |
|----------|-------|-------------|-------|
| | | | |

## Escalation

- **Fail (prop mismatch, meta premise)** → strip bad anchors, re-run annotation, rewrite premise/progression before response.
- **Warn** → show in review step; host may continue but should edit before export approval.

## Automation

- Shared rules: `Dev/app/shared/qa/storyDesignRules.ts`
- Backend gate: `Dev/app/backend/src/storyDesignQa.ts`
- CI: `QA/automation/story-design-qa.mjs`
