# Story Editor QA — Test Plan

See checklist: `departments/story_editor_qa.md`.

## SE-01 Junior hooks match theme

1. Enable junior add-on; select theme **Haunted Library**; environment **Backyard / patio**.
2. Generate puzzles; open **Environment-first story hooks**.

**Expected**

- Hooks mention library/haunted/book/archive beats, not only patio/garden props.
- Lead line names the selected theme and environment accurately.

## SE-02 Story plan references real puzzles

1. Complete generate with story plan visible on review.

**Expected**

- `requiredPuzzleIds` / titles in stages exist in the puzzle list.
- Mission objective aligns with theme name.

## SE-03 Theme change refreshes fiction

1. Return to themes; pick a different theme; regenerate puzzles.

**Expected**

- Story plan and puzzle theme-fit lines reference the new theme, not the prior one.
