# Professional Build Pipeline Checklist

This checklist is the production workflow for designing and launching a professional escape room experience.

## Stage 1 - Concept

### Goals
- Define the player fantasy, mission objective, and success condition.
- Set target audience, runtime, and team size.
- Confirm physical environment constraints (existing room, fixtures, non-removable items).

### Checklist
- [ ] Theme name and theme description finalized.
- [ ] Mission objective written as a player-facing statement.
- [ ] Room constraints documented (doors, outlets, furniture, prohibited modifications).
- [ ] Session length target defined (min/max).
- [ ] Difficulty target defined (beginner/intermediate/advanced).
- [ ] Accessibility baseline requirements listed.
- [ ] Business constraints captured (budget, staffing, reset time target).

### Exit Criteria
- [ ] Stakeholder sign-off on theme + mission objective.
- [ ] Scope approved for build planning.

---

## Stage 2 - PDG (Puzzle Dependency Graph)

### Goals
- Architect puzzle progression and reveals.
- Prevent logic leaps by defining clue provenance and output flow.
- Ensure active engagement via parallelism (minimum two required solves per reveal stage).

### Checklist
- [ ] Every puzzle is a node in a dependency graph.
- [ ] Every node has input clue(s), action, output artifact, and next dependency.
- [ ] Stage gates require at least two solved elements before reveal.
- [ ] Story role defined for each puzzle (why it exists in narrative).
- [ ] Theme-fit rationale defined for each puzzle.
- [ ] Existing user-provided puzzles mapped to intended stage.
- [ ] Fallback/hint design defined for each puzzle (hint tier 1/2/3).

### Exit Criteria
- [ ] PDG reviewed and no orphan nodes or dead ends remain.
- [ ] Stage flow walkthrough passes with no logic ambiguities.

---

## Stage 3 - Safety Review

### Goals
- Validate life safety, emergency egress, and electrical safety before prototyping.
- Confirm operational safety with realistic failure scenarios.

### Checklist
- [ ] Emergency exit strategy defined and tested (unlock override / fail-safe behavior).
- [ ] Electrical plan reviewed (voltage domains, fuses, wire gauge, insulation).
- [ ] Manual bypass procedures documented for each critical lock/control system.
- [ ] Monitoring plan defined (camera/audio coverage where needed).
- [ ] Trip/fire/sharp-edge hazards identified and mitigated.
- [ ] Accessibility accommodations planned (mobility, reach, sensory alternatives).
- [ ] Local code/compliance review completed (AHJ/building/fire/electrical as applicable).

### Exit Criteria
- [ ] Safety sign-off recorded.
- [ ] No unresolved Sev-1 safety risks.

---

## Stage 4 - Tech Prototype

### Goals
- Prove critical mechanics under realistic conditions.
- Validate reliability, reset workflow, and observability.

### Checklist
- [ ] Prototype each critical puzzle mechanism (especially electronics).
- [ ] Sensor input reliability tested (debounce/noise false-positive checks).
- [ ] Lock control path tested under power loss/restart scenarios.
- [ ] Full-state reset procedure implemented and timed.
- [ ] Logging/diagnostics implemented for key state transitions.
- [ ] Spare parts list and serviceability plan prepared.
- [ ] Wiring diagrams and pin maps versioned in docs.

### Exit Criteria
- [ ] Prototype pass rate >= 95% across repeated runs.
- [ ] Reset target met within operational SLA.

---

## Stage 5 - Alpha Playtest

### Goals
- Validate puzzle clarity, pacing, and narrative coherence.
- Find breakpoints before external player exposure.

### Checklist
- [ ] Internal/cold tester sessions completed with observation notes.
- [ ] Solve time captured per puzzle and per stage.
- [ ] Hint usage frequency captured.
- [ ] Confusion points and logic-leap incidents logged.
- [ ] Narrative comprehension checked (do players understand mission and progression?).
- [ ] Puzzle difficulty adjusted to meet target runtime window.

### Exit Criteria
- [ ] No critical progression blockers remain.
- [ ] Runtime distribution within target (p50/p75/p90 acceptable).

---

## Stage 6 - Beta Ops

### Goals
- Validate room under realistic operating conditions.
- Confirm staff procedures, reset quality, and safety consistency.

### Checklist
- [ ] Staff runbook completed (launch, hinting, recovery, emergency procedures).
- [ ] Incident triage process active (Sev1-Sev4).
- [ ] Reset checklist validated over multiple back-to-back games.
- [ ] Throughput and staffing assumptions tested live.
- [ ] Accessibility and safety checks re-verified in production configuration.
- [ ] Post-game feedback loop established and reviewed weekly.

### Exit Criteria
- [ ] No Sev-1/Sev-2 unresolved issues.
- [ ] Operations sign-off for launch readiness.

---

## Readiness Gates Summary

- Concept Gate: vision + constraints approved
- PDG Gate: complete graph + no logic gaps
- Safety Gate: hazards mitigated + egress verified
- Prototype Gate: reliability + reset SLA met
- Alpha Gate: pacing and clarity validated
- Beta Gate: operations stable + launch approved

