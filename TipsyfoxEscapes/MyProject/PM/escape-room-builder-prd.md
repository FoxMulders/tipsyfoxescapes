# Escape Room Builder - Product Requirements (MVP)

## 1. Product Goal
Help a host quickly design a custom escape room by generating theme and puzzle ideas based on room constraints, while keeping puzzle variety high and repetition low.

## 2. Target User
- Casual hosts setting up home, office, or event escape rooms.
- DIY creators who may want electronic puzzle options (Arduino-based).

## 3. Problem Statement
Planning an escape room manually takes too long and often results in repetitive puzzle ideas that do not fit the available space or materials.

## 4. MVP Scope
The MVP should:
- The app and browser load a lightweight AI client; the actual intelligence runs in a controlled orchestration layer or selectively on‑device
- Collect setup inputs (player count, environment, available furniture/items).
- Suggest multiple room themes and allow refresh/regeneration.
- Generate a puzzle set for the selected theme with mixed puzzle types.
- Allow the user to reject and replace individual puzzles.
- Avoid suggesting the same puzzle patterns too often.
- For electronic puzzles, provide build plans, parts list, and setup/code instructions.
- Room should have enough to keep 6 people busy at one time. 

## 5. User Flow (MVP)
1. User enters room and participation details.
2. App suggests themes.
3. User selects a theme (or refreshes suggestions and the suggestions should not be the same as any previous).
4. App proposes a mixed puzzle set.
5. User rejects any puzzle they dislike.
6. App regenerates replacements while preserving variety.
7. User exports/saves room plan.

## 6. Functional Requirements
### FR1 - Input Collection
- System asks:
  - Number of players at one time.
  - Environment type.
  - Existing room furniture/items.
  - Number of participants (if different from concurrent players).

Acceptance Criteria:
- User can submit all four inputs.
- Inputs are required before theme generation.

### FR2 - Theme Suggestions
- System generates at least 3 theme options.
- User can refresh for new themes.

Acceptance Criteria:
- Refresh replaces at least 1 prior option.
- User can select exactly 1 theme to continue.

### FR3 - Puzzle Set Generation
- System generates a set of puzzles tied to selected theme.
- Set includes puzzle variety across:
  - Thinking/logic
  - Physical/mechanical
  - Electronic/interactive (optional based on user preference)

Acceptance Criteria:
- Puzzle set contains at least 3 puzzle types.
- Every puzzle includes objective and solve steps.

### FR4 - Puzzle Rejection and Replacement
- User can reject any puzzle.
- System replaces rejected puzzle with a different one in same difficulty range.

Acceptance Criteria:
- Replacement appears without changing other accepted puzzles.
- Replacement cannot be identical to rejected puzzle.

### FR5 - Repetition Control
- System tracks recent suggestions to reduce repeats.

Acceptance Criteria:
- In a session, exact puzzle duplicates are blocked.
- Across sessions, repeated puzzle concepts are deprioritized.

### FR6 - Electronic Puzzle Details
- For electronic puzzle suggestions, system provides:
  - Parts list
  - Wiring/build steps
  - Upload/run instructions
  - Example Arduino code

Acceptance Criteria:
- Electronic puzzle output includes all four detail sections.
- Instructions are complete enough for a beginner maker to execute.

## 7. Non-Functional Requirements
- Response time: theme or puzzle generation should complete in under 5 seconds for typical requests.
- Usability: user can complete a full room draft in under 15 minutes.
- Reliability: regenerate actions should not lose previously accepted puzzle selections.

## 8. Out of Scope (MVP)
- Full 3D room layout builder.
- Budget optimization engine.
- Real-time collaborative editing.
- Mobile app packaging.

## 9. Risks and Open Questions
- How should puzzle difficulty be set and balanced?
- Should electronic puzzles be optional by default?
- Do users need printable exports (PDF/cards) in MVP or phase 2?
- How much historical memory is needed for repeat-avoidance quality?

## 10. Milestones
- M1: Requirements finalized.
- M2: Theme + puzzle generation prototype.
- M3: Rejection/replacement and repetition controls.
- M4: Electronic puzzle detail generator.
- M5: QA validation and MVP release readiness.

## 11. Initial Task Backlog
- Define data model for theme and puzzle objects.
- Draft prompt templates for theme and puzzle generation.
- Implement input collection form and validation.
- Implement theme refresh flow.
- Implement puzzle generation with type balancing.
- Implement reject-and-replace behavior.
- Implement duplicate/repetition tracking strategy.
- Implement electronic puzzle detail templates (parts, wiring, code).
- Add save/export of final room plan.
- Create QA test cases tied to acceptance criteria.

