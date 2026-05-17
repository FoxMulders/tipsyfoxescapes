# Story Editor QA

**Mission:** Every narrative surface matches the **selected theme**, **physical environment**, and **audience** (main crew vs junior add-on). Fiction may stretch props, but it must not contradict the room the host actually has.

## Owns

- Theme brief and custom-theme coach output
- `storyPlan` (situation, premise, stages, puzzle links, staging diagram)
- Junior add-on **story hooks** (`filterJuniorStoryHooks` / environment-first inspiration block)
- Export prose that describes fiction, pacing, and merge beats

## Checklist (each review)

1. **Theme lock** — Copy names the selected theme (or unmistakable equivalent). No stock scenario that reads like a different genre without re-skinning instructions.
2. **Environment lock** — Staging references props and zones that exist in `environmentType` and `availableItems`, not a different room type (e.g. library fiction in a patio unless explicitly re-skinned).
3. **Junior track** — Hooks score on **theme first**, then environment; lead text must not claim a filter that still shows off-theme hooks.
4. **Progression** — Stages and `puzzleLinks` reference puzzles that exist in the current set; required IDs resolve.
5. **Tone & safety** — Junior beats stay bright, in-place, and age-appropriate; no true darkness, real utilities as play surfaces, or immersion-breaking modern clutter when theme forbids it.
6. **Host read-through** — Situation and mission objective are speakable in one minute; no placeholder or duplicate paragraphs.

## Sign-off

| Reviewer | Theme | Environment | Pass / fail | Notes |
|----------|-------|-------------|-------------|-------|
| | | | | |

## Escalation

- **Fail** → block export approval flag; host must refresh story or edit theme/environment inputs.
- **Warn** → allow export with visible warning in review step.
