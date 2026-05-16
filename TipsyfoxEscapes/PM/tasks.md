# Escape Room Builder - Prioritized Tasks

This backlog is derived from `PM/escape-room-builder-prd.md` and organized by delivery priority.

## Priority Definitions
- **P0**: Must-have for MVP release.
- **P1**: Should-have enhancements after MVP baseline is stable.
- **P2**: Nice-to-have improvements for later iterations.

## P0 - MVP Critical Path

### P0-01 Input Collection Form
- **Goal**: Capture required planning inputs before generation.
- **Scope**:
  - Number of players at one time
  - Environment type
  - Existing furniture/items
  - Total participants (if different)
- **Acceptance Criteria**:
  - All required fields validate before submission.
  - User cannot proceed to themes with missing required fields.

### P0-02 Theme Suggestion Engine
- **Goal**: Generate initial theme candidates.
- **Scope**:
  - Produce at least 3 theme options per request
  - Include short description for each theme
- **Acceptance Criteria**:
  - At least 3 themes are returned every run.
  - User can select exactly one theme to continue.

### P0-03 Theme Refresh
- **Goal**: Allow users to regenerate theme options.
- **Scope**:
  - "Refresh" action for new options
  - Preserve user inputs while refreshing
- **Acceptance Criteria**:
  - Refresh replaces at least one prior option.
  - User inputs remain intact after refresh.

### P0-04 Puzzle Set Generation (Variety Required)
- **Goal**: Build a theme-aligned puzzle set with balanced types.
- **Scope**:
  - Generate a complete puzzle set
  - Include variety across logic, physical, and electronic categories
- **Acceptance Criteria**:
  - Generated set includes at least 3 puzzle categories.
  - Each puzzle contains objective and solve steps.

### P0-05 Reject and Replace Puzzle
- **Goal**: Let users swap individual puzzles without restarting.
- **Scope**:
  - Reject control per puzzle
  - Regenerate replacement at similar difficulty
- **Acceptance Criteria**:
  - Replacement updates only the rejected puzzle slot.
  - Replacement is not identical to the rejected puzzle.

### P0-06 Session Duplicate Prevention
- **Goal**: Block exact duplicates within one planning session.
- **Scope**:
  - Track generated puzzle IDs or signatures
  - Validate replacements against seen set
- **Acceptance Criteria**:
  - No exact duplicate puzzle is shown in the same session.
  - Repeated replacements continue to avoid already rejected items.

### P0-07 Save/Export Room Plan
- **Goal**: Preserve completed room draft for later use.
- **Scope**:
  - Save final selected theme and puzzles
  - Export in a readable format (e.g., markdown/text)
- **Acceptance Criteria**:
  - Saved plan includes all accepted puzzles and key setup inputs.
  - Export can be reopened and understood without app context.

### P0-08 QA Baseline for MVP
- **Goal**: Validate all P0 acceptance criteria before release.
- **Scope**:
  - Create test cases for FR1-FR5
  - Run functional regression on regenerate flows
- **Acceptance Criteria**:
  - 100% of P0 criteria have at least one test case.
  - All blocking defects are resolved or explicitly waived.

## P1 - Post-MVP Enhancements

### P1-01 Electronic Puzzle Detail Pack
- **Goal**: Provide maker-ready outputs for electronic puzzle ideas.
- **Scope**:
  - Parts list
  - Wiring/build steps
  - Upload/run instructions
  - Example Arduino code
- **Acceptance Criteria**:
  - Every electronic puzzle includes all detail sections.
  - Instructions are understandable by beginner makers.

### P1-02 Difficulty Controls
- **Goal**: Let users choose target challenge level.
- **Scope**:
  - Difficulty selector (easy/medium/hard)
  - Difficulty-aware generation and replacement
- **Acceptance Criteria**:
  - Selected difficulty influences generated puzzle complexity.
  - Replacements stay within the chosen level.

### P1-03 Cross-Session Repeat Deprioritization
- **Goal**: Reduce conceptual repeats across different sessions.
- **Scope**:
  - Persist prior puzzle concepts
  - Ranking penalty for recently used concepts
- **Acceptance Criteria**:
  - Repeated concepts are less likely than unseen alternatives.
  - System still returns results when novelty pool is small.

### P1-04 Structured Content Templates
- **Goal**: Standardize output quality and readability.
- **Scope**:
  - Common schema for themes and puzzles
  - Required fields and formatting guards
- **Acceptance Criteria**:
  - Output is consistent across regenerate attempts.
  - Missing required fields are rejected and retried.

## P2 - Future Improvements

### P2-01 Printable Host Pack
- **Goal**: Create print-friendly run sheets and puzzle cards.
- **Scope**:
  - Export formatted host instructions
  - Optional player-facing puzzle cards
- **Acceptance Criteria**:
  - Printable files are clear and usable during live sessions.

### P2-02 Budget and Materials Estimator
- **Goal**: Estimate build cost and required materials.
- **Scope**:
  - Cost ranges by puzzle
  - Consolidated shopping list
- **Acceptance Criteria**:
  - Output includes estimated total and per-puzzle breakdown.

### P2-03 Collaborative Planning
- **Goal**: Support multiple planners working together.
- **Scope**:
  - Shared editing workflow
  - Comment or approval mechanism
- **Acceptance Criteria**:
  - Multiple users can contribute without overwriting each other.

### P2-04 Analytics and Recommendation Feedback
- **Goal**: Improve suggestions over time with usage feedback.
- **Scope**:
  - Track accepted vs rejected puzzle patterns
  - Tune ranking weights from outcomes
- **Acceptance Criteria**:
  - Recommendation quality measurably improves over baseline.

## Suggested Execution Order
1. P0-01 -> P0-04 (core generation flow)
2. P0-05 -> P0-06 (iterative refinement + duplicate safety)
3. P0-07 -> P0-08 (completion + quality gate)
4. P1 series after MVP stabilization
5. P2 series based on user demand

