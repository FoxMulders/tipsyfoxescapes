# Workflow QA department

## Scope

- Documented API routes exist in `server.ts` and `AGENTS.md`
- Live game routes (`/api/live/*`) and frontend routes (`/gm/:sessionId`, player display)
- Export UX anchors: `HomePostExportModal`, `export-live-actions`
- Deploy health handler (`Dev/app/api/health.js`)

## Automation

- `QA/automation/workflow-qa.mjs`

## Manual test plan

See `QA/mvp_test_plan.md` for end-to-end planning → theme → puzzles → export → live console flows.

## Home vs venue

| Tier | Post-export |
|------|-------------|
| Home Party | Runbook + player screen (timer + hints) |
| Commercial Venue | GM Live Console (4 tabs) + player display + SSE sync |
