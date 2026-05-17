# Escape Room Builder — QA

Quality assurance is split into **departments**. Each department owns a checklist, test plan, and (where implemented) automated gates in the app.

| Department | Scope | Checklist | Test plan |
|------------|--------|-----------|-----------|
| **MVP / flow** | Planning → theme → puzzles → export | `mvp_test_plan.md` | Same file |
| **Story Editor** | Narrative, theme alignment, junior hooks, story plan beats | `departments/story_editor_qa.md` | `story_editor_qa_test_plan.md` |
| **Puzzle** | Per-puzzle copy, references, electronics, diagrams | `departments/puzzle_qa.md` | `puzzle_qa_test_plan.md` |

## When to run which department

- **Every puzzle generate or replace** → Puzzle QA (automated in backend) + Story Editor QA when story plan / hooks are shown.
- **Every export or save** → MVP integrity + Puzzle QA on all puzzles in the plan.
- **Theme or environment change** → Story Editor QA on hooks and staging copy.

## Automation

- Backend: `Dev/app/backend/src/puzzleQa.ts` runs on puzzle generate, replace, and saved-plan hydration.
- Frontend: puzzle cards show a **Puzzle QA** banner when the server reports open issues (replace or edit before build night).

Update department checklists when product behavior changes; link new features from `AGENTS.md`.
