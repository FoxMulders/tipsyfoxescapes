# Escape Room Builder — QA

Quality assurance is split into **four departments**. Each has a checklist, test plan (where applicable), and automated gates that **fail the build** with required fixes.

| Department | Scope | Checklist | Automation |
|------------|--------|-----------|------------|
| **Code QA** | Builds, unit self-tests | `departments/code_qa.md` | `automation/code-qa.mjs` |
| **Workflow QA** | API surface, live routes, export UX | `departments/workflow_qa.md` | `automation/workflow-qa.mjs` |
| **Story Editor QA** | Narrative, hooks, theme-fit | `departments/story_editor_qa.md` | `automation/story-editor-qa.mjs` |
| **Puzzle QA** | Copy, links, electronics, diagrams | `departments/puzzle_qa.md` | `automation/puzzle-qa.mjs` |

## Run locally

From repository root (`TipsyfoxEscapes/`):

```bash
npm run qa
```

Individual departments: `npm run qa:code`, `qa:workflow`, `qa:story`, `qa:puzzle`.

## CI

GitHub Actions workflow `.github/workflows/qa-suite.yml` runs the full suite on every push and pull request.

## Legacy plans

Older single-file plans remain for reference: `mvp_test_plan.md`, `professional_build_pipeline_qa_execution.md`.

## When to run which department

- **Every push** → all four via `npm run qa`
- **Puzzle generate/replace** → Puzzle QA (backend gate + frontend banner)
- **Story / junior hooks** → Story Editor QA
- **Export or live console changes** → Workflow QA + manual live smoke (GM console + player display)

Update department checklists when product behavior changes; link new features from `AGENTS.md`.
