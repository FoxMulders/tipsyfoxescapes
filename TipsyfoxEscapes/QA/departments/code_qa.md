# Code QA department

## Scope

- TypeScript compile (`backend` + `frontend` builds)
- Unit self-tests: puzzle QA, story editor rules, static catalog scan
- No silent passes: CI exits non-zero on failure

## Automation

- `QA/automation/code-qa.mjs` — invoked by `npm run qa` at repo root
- Backend: `npm run test:unit` in `Dev/app/backend` (tsx self-tests)

## Manual triggers

- Before every push that touches `Dev/app/`
- After dependency or TypeScript config changes

## Required fixes

When Code QA fails, fix the reported compile or test output before merging. Do not skip hooks or disable checks without product approval.
