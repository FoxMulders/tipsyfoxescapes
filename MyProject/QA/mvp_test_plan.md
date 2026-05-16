# Escape Room Builder - MVP Test Plan

This plan validates `P0-01` through `P0-08`.

## 1. Test Scope
- Planning input validation
- Theme generation and refresh
- Puzzle set generation variety
- Puzzle replacement behavior
- Session duplicate prevention
- Save/export plan integrity

## 2. Test Cases

### TC-01 Required Input Validation
- Steps:
  1. Open planning form.
  2. Leave one required field empty.
  3. Submit.
- Expected:
  - Validation error shown.
  - No theme generation request is executed.

### TC-02 Create Session with Valid Input
- Steps:
  1. Fill all required fields with valid values.
  2. Submit.
- Expected:
  - Session is created.
  - User proceeds to theme screen.

### TC-03 Theme Generation Count
- Steps:
  1. Request themes for a valid session.
- Expected:
  - At least 3 themes returned.
  - Exactly one theme can be selected.

### TC-04 Theme Refresh Behavior
- Steps:
  1. Capture current theme IDs.
  2. Press refresh.
- Expected:
  - At least one theme differs from prior set.
  - Planning inputs remain unchanged.

### TC-05 Puzzle Category Variety
- Steps:
  1. Select a theme.
  2. Generate puzzle set.
- Expected:
  - Set includes at least 3 categories (logic/physical/electronic).
  - Each puzzle includes objective and solve steps.

### TC-06 Reject and Replace One Puzzle
- Steps:
  1. Reject one puzzle.
  2. Observe replacement.
- Expected:
  - Only rejected puzzle slot is replaced.
  - Replacement is different from rejected puzzle.

### TC-07 Duplicate Prevention In-Session
- Steps:
  1. Perform multiple replacements.
  2. Track all puzzle IDs/signatures shown.
- Expected:
  - No exact duplicates in current session.

### TC-08 Export Integrity
- Steps:
  1. Export completed plan.
  2. Open output.
- Expected:
  - Includes selected theme, planning input summary, and accepted puzzles.
  - Content is human-readable and complete.

## 3. Defect Severity Guide
- Sev 1: Blocks user from completing core flow.
- Sev 2: Core flow works but with major incorrect behavior.
- Sev 3: Non-blocking bug with workaround.
- Sev 4: Cosmetic/low-impact issue.

## 4. Exit Criteria
- All Sev 1 and Sev 2 defects resolved or waived.
- 100% pass on P0 acceptance criteria tests.

## 5. Playwright smoke checklist

Use when wiring CI or a local `npx playwright test` smoke suite. Assumes frontend (Vite) and backend are running with a reachable `baseURL`.

| # | Check | Pass criteria |
|---|--------|----------------|
| S1 | Home / builder loads | `[data-testid="mission-flow-map"]` is visible (mission progress UI). |
| S2 | Error surface exists when needed | After a failing action (e.g. bad API), `[data-testid="flow-error-banner"]` appears with non-empty text. |
| S3 | Continue without theme (Build step) | On **Build puzzle set** with no theme selected: `[data-testid="continue-output-review"]` is `disabled` and `[data-testid="continue-output-review-blocked-hint"]` is visible. |
| S4 | Continue with theme | Complete room details → choose a theme → **Build puzzle set**; `[data-testid="continue-output-review"]` becomes enabled; click it → either **Output: Review** content appears or `flow-error-banner` shows a clear message (no silent no-op). |
| S5 | Mobile FAB (optional) | Viewport ≤768px: `[data-testid="continue-output-review-mobile"]` mirrors S3/S4 (disabled until theme; then opens review or shows banner). |
| S6 | Snapshot “Review output” | With a theme selected, `[data-testid="review-output-summary"]` is enabled and does not throw on click (same expectations as S4). |

**Notes**

- Install Playwright in `Dev/app/frontend` (or repo root) and point `baseURL` at your dev server; selectors above match `App.tsx` hooks.
- For authenticated-only flows (save/export), extend smoke with stored `storageState` after a manual or scripted login—keep this list short and unauthenticated-first.
