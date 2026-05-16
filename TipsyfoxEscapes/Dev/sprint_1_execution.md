# Sprint 1 Execution Plan (P0 Foundation)

Sprint goal: deliver a working MVP flow from planning input to puzzle replacement.

## Scope Included
- P0-01 Input Collection Form
- P0-02 Theme Suggestion Engine
- P0-03 Theme Refresh
- P0-04 Puzzle Set Generation
- P0-05 Reject and Replace Puzzle
- P0-06 Session Duplicate Prevention (session level)

## Week Plan
- Day 1:
  - Repo skeleton and TypeScript setup
  - Shared schema contracts
  - Session creation endpoint
- Day 2:
  - Theme generation endpoint + UI list
  - Theme refresh endpoint + UI action
- Day 3:
  - Puzzle set generation endpoint + UI rendering
  - Category balancer in generator
- Day 4:
  - Replace endpoint + per-puzzle reject button
  - Duplicate prevention service integration
- Day 5:
  - Stabilization, bug fixes, and regression pass
  - Demo walkthrough of full MVP flow

## Task Ownership Template
- Backend owner:
  - endpoints, generators, duplicate guard, persistence hooks
- Frontend owner:
  - forms, views, state transitions, error handling
- QA owner:
  - acceptance test mapping, execution logs, bug filing

## Exit Criteria
- Full flow demo succeeds:
  - input -> theme generation -> refresh -> puzzle generation -> replace
- No duplicate puzzles in same session.
- All in-scope acceptance criteria pass.

