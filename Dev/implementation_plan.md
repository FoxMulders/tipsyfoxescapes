# Escape Room Builder - Implementation Plan

This plan maps `PM/tasks.md` tickets to concrete implementation work in `Dev`.

## 1. Delivery Strategy
- Build MVP in vertical slices (input -> themes -> puzzles -> replacement -> export).
- Keep AI generation logic behind service interfaces so provider changes are low risk.
- Treat duplicate prevention as a core service used by both generation and replacement.

## 2. Proposed Tech Stack (MVP)
- Frontend: React + TypeScript
- Backend API: Node.js + Express + TypeScript
- Validation: Zod schemas
- Persistence: SQLite (simple local MVP data store)
- Testing: Vitest (unit), Playwright (E2E)

## 3. Project Structure
```text
Dev/
  app/
    frontend/
      src/
        features/planning/
        features/themes/
        features/puzzles/
        features/export/
        shared/api/
    backend/
      src/
        routes/
        services/
        repositories/
        models/
        validators/
  docs/
    architecture.md
    api_contract.md
  scripts/
```

## 4. Ticket-to-Module Mapping

### P0-01 Input Collection Form
- Frontend:
  - `features/planning/PlanningForm.tsx`
  - `features/planning/planning.schema.ts`
- Backend:
  - `validators/planningInput.schema.ts`
  - `routes/planning.routes.ts`

### P0-02 Theme Suggestion Engine
- Backend:
  - `services/themeGenerator.service.ts`
  - `models/theme.model.ts`
  - `routes/theme.routes.ts`
- Frontend:
  - `features/themes/ThemeList.tsx`
  - `shared/api/themeApi.ts`

### P0-03 Theme Refresh
- Backend:
  - Reuse `services/themeGenerator.service.ts` with `refresh=true` signal
- Frontend:
  - `features/themes/ThemeRefreshButton.tsx`
  - state management in `features/themes/theme.state.ts`

### P0-04 Puzzle Set Generation
- Backend:
  - `services/puzzleSetGenerator.service.ts`
  - `services/puzzleBalancer.service.ts`
  - `models/puzzle.model.ts`
- Frontend:
  - `features/puzzles/PuzzleSetView.tsx`
  - `shared/api/puzzleApi.ts`

### P0-05 Reject and Replace Puzzle
- Backend:
  - `routes/puzzle.routes.ts` (`POST /puzzles/:id/replace`)
  - `services/puzzleReplacement.service.ts`
- Frontend:
  - `features/puzzles/PuzzleCard.tsx` reject action
  - optimistic state update handler

### P0-06 Session Duplicate Prevention
- Backend:
  - `services/duplicationGuard.service.ts`
  - session-level `seenPuzzleSignatures` store
- Integration:
  - called from both initial generation and replacement services

### P0-07 Save/Export Room Plan
- Backend:
  - `routes/export.routes.ts`
  - `services/exportPlan.service.ts`
  - `repositories/roomPlan.repository.ts`
- Frontend:
  - `features/export/ExportButton.tsx`

### P0-08 QA Baseline
- Tests:
  - Unit: `backend/src/services/**/*.test.ts`
  - API integration: `backend/src/routes/**/*.int.test.ts`
  - E2E: `frontend/e2e/mvp-flow.spec.ts`

## 5. API Contract (MVP Endpoints)
- `POST /api/planning/session` -> create planning session
- `POST /api/themes/generate` -> return >= 3 themes
- `POST /api/themes/refresh` -> return refreshed themes
- `POST /api/puzzles/generate` -> return mixed puzzle set
- `POST /api/puzzles/:puzzleId/replace` -> replace one puzzle
- `POST /api/plans/:sessionId/export` -> save/export plan

## 6. Data Contracts (Core)
- PlanningInput:
  - playersConcurrent: number
  - participantsTotal: number
  - environmentType: string
  - availableItems: string[]
- Theme:
  - id: string
  - name: string
  - description: string
- Puzzle:
  - id: string
  - category: "logic" | "physical" | "electronic"
  - title: string
  - objective: string
  - solveSteps: string[]
  - difficulty: "easy" | "medium" | "hard"

## 7. Build Sequence (Execution Order)
1. Foundation setup: repo skeleton, linting, validation, session model.
2. Implement P0-01 through P0-04 end-to-end.
3. Add P0-05 and P0-06 services.
4. Add P0-07 export/save.
5. Complete P0-08 test coverage and defect fixes.

## 8. Definition of Ready (Dev)
- PM acceptance criteria mapped to testable scenarios.
- API request/response shapes agreed.
- Required environment variables documented.

## 9. Definition of Done (Dev)
- Feature meets mapped acceptance criteria.
- Unit/integration tests added and passing.
- No regression in E2E MVP flow.
- Updated docs for API or schema changes.

