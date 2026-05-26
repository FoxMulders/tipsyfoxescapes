# Escape Room Builder — agent instructions

You are the **Escape Room Builder** development agent. This repository implements an MVP web app that helps hosts design home or event escape rooms: collect constraints, suggest themes, generate a varied puzzle set, allow per-puzzle replacement, and export or save plans.

## Product goals (non-negotiables)

- **Inputs before generation**: concurrent players, total participants, environment, available items (and optional existing puzzles in the live app).
- **Themes**: at least three options per generation; refresh must offer new options while preserving planning inputs; user selects exactly one theme to continue.
- **Puzzles**: a complete set aligned to the theme with **variety** across **logic**, **physical**, and **electronic** categories (not three copies of the same type).
- **Replace, not restart**: rejecting one puzzle replaces only that slot; other accepted puzzles stay unchanged.
- **Repetition control**: avoid repeating the same puzzle concepts within a session and deprioritize repeats across sessions where the backend tracks skips (see skip history / seen IDs in the server).
- **Electronic puzzles**: when category is electronic, include maker-ready detail: parts list, wiring or build steps, and **Arduino-style code** where the product specifies it (`electronicDetails` on the server puzzle type).
- **Concurrency for play**: designs should support enough parallel work for the stated concurrent player count (PRD calls for ~6 people busy at once when that is the target).

Authoritative product detail: `PM/escape-room-builder-prd.md`. Backlog: `PM/tasks.md`.

## Architecture

- **Frontend**: React + TypeScript + Vite under `Dev/app/frontend/`. Main UI and flow: `src/App.tsx`. Styles: `src/App.css`.
- **Backend**: Express + TypeScript under `Dev/app/backend/`. Single service file: `src/server.ts` (sessions, generation, auth, billing hooks, persistence paths under `data/`).
- **Shared types** (subset): `Dev/app/shared/contracts.ts` — planning input and basic theme/puzzle shapes; the running app uses richer types inline where the contract file lags.
- **Optional on-device enhancement**: `Dev/app/frontend/src/browserAi.ts` uses `window.ai.languageModel` when available to enrich `howItWorks`, `themeFitReason`, optional stages, and `suggestedAdditions` from structured JSON only. If the API is missing, the app still works without it.

Reference architecture notes: `Dev/architecture.md`. API draft (some paths extended in code): `Dev/api_contract.md`.

## HTTP API (implemented)

Base path `/api` unless proxied. Key routes in `server.ts`:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/planning/session` | Create session from planning body |
| PATCH | `/api/planning/session/:sessionId/planning-input` | Update planning fields |
| POST | `/api/planning/session/:sessionId/existing-puzzles` | Set existing puzzle list |
| POST | `/api/themes/generate` | Initial themes for `sessionId` |
| POST | `/api/themes/refresh` | New themes excluding prior ids |
| POST | `/api/themes/custom` | User-supplied custom theme |
| POST | `/api/puzzles/generate` | Full puzzle set for selected theme |
| POST | `/api/puzzles/:puzzleId/replace` | Replace one puzzle |
| POST | `/api/plans/:sessionId/export` | Build export payload |
| POST | `/api/plans/:sessionId/save` | Persist plan for authenticated user |
| GET | `/api/plans/saved` | List saved plans |
| GET | `/api/plans/saved/:planId` | Load one plan |
| DELETE | `/api/plans/saved/:planId` | Delete saved plan |
| POST | `/api/auth/signup`, `/api/auth/login` | Auth |
| GET | `/api/me` | Current user |
| OAuth | `/api/auth/oauth/:provider/start` and `.../callback` | Social login |
| POST | `/api/billing/activate-test` | Test billing (dev; **admin-only**, requires `SUBSCRIPTION_ACTIVATION_KEY`) |
| GET | `/health` | Health check |

Auth uses bearer tokens where applicable; the frontend stores session and sends `x-device-id` for usage ledger behavior.

## Data shapes (runtime)

Match the TypeScript types in `server.ts` and `App.tsx` when editing:

- **Theme**: `id`, `name`, `tldr`, `description`, optional `recommendedPuzzles` (brief picks for the theme card).
- **Puzzle**: `id`, `category`, `themeTags`, `title`, `objective`, `howItWorks`, `themeFitReason`, `referenceLinks`, `solveSteps`, `difficulty`, optional `stageHint`, optional `electronicDetails` (parts, wiring diagram lines, SVG string, build steps, `arduinoCode`).
- **Story plan** (when present): `situation`, `premise`, `missionObjective`, `progressionRule`, `stages[]`, `puzzleLinks[]` — used for narrative staging alongside puzzles.

## Implementation conventions

- **Ship on every change**: after any completed change, run build/QA as needed, commit `TipsyfoxEscapes/` only, push `main`, and deploy (see `.cursor/rules/ship-on-change.mdc`). Do not wait for the user to request release.
- Prefer **small, focused changes**; do not refactor unrelated modules.
- Keep **frontend and backend types** consistent when touching puzzle or theme payloads; update `shared/contracts.ts` only when you are intentionally aligning the shared contract.
- **Validate** JSON bodies on the server before mutating session state; preserve session invariants (selected theme, current puzzles, skip sets) documented in `server.ts`.
- **QA departments** (see `QA/README.md`): **MVP flow** (`mvp_test_plan.md`), **Story Editor** (`departments/story_editor_qa.md`), **Story Design** (`departments/story_design_qa.md`), **Puzzle** (`departments/puzzle_qa.md` + automated gate in `Dev/app/backend/src/puzzleQa.ts`). Run Puzzle QA and Story Design QA on every generate/replace; Story Editor QA on hooks and story plan.

## Local development

- Frontend: from `Dev/app/frontend`, install deps and run the Vite dev script per `package.json`.
- Backend: from `Dev/app/backend`, install deps and run the server per `package.json`; ensure `data/` directory is writable for JSON persistence.

When unsure about behavior, read the relevant route handler in `server.ts` and the matching UI block in `App.tsx` before proposing edits.
