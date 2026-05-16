# Professional Build Pipeline QA Execution Guide

This document operationalizes QA for each pipeline stage.

## Severity Definitions

- **Sev-1**: Safety risk, blocked egress, or impossible progression.
- **Sev-2**: Major functional failure with no practical workaround.
- **Sev-3**: Degraded experience, confusing clueing, timing imbalance.
- **Sev-4**: Cosmetic/non-blocking polish issue.

## Required Artifacts

- Test session log (date, build version, tester profile)
- Puzzle timing matrix (start/solve/hint count)
- Defect log (with reproduction steps)
- Safety verification checklist
- Reset verification checklist

---

## Stage-by-Stage QA Plan

## 1) Concept QA

### Checks
- [ ] Mission objective is unambiguous and testable.
- [ ] Success/failure conditions are explicit.
- [ ] Runtime target is realistic for player count.
- [ ] Environment constraints are documented and acknowledged.

### Deliverables
- [ ] Concept QA memo with risks and open questions.

---

## 2) PDG QA

### Checks
- [ ] Every puzzle has defined prerequisites and outputs.
- [ ] No circular dependencies unless intentionally designed.
- [ ] Stage progression enforces at least two required solves.
- [ ] Every reveal is reachable from available clues.
- [ ] Hint ladders exist for each critical puzzle.

### Test Method
- Perform dry-run walkthroughs from graph only (without room props).
- Simulate wrong-order attempts and verify recovery path.

### Deliverables
- [ ] PDG verification report.

---

## 3) Safety QA

### Checks
- [ ] Emergency egress works during normal and fault conditions.
- [ ] Fail-safe behavior confirmed for lock/control components.
- [ ] Electrical integrity checks pass (temperature, exposed conductors, shorts).
- [ ] Hazard scan complete (trip points, pinch points, sharp edges, low visibility risks).
- [ ] Accessibility alternatives verified for required interactions.

### Test Method
- Execute failure injection:
  - power interruption
  - lock controller restart
  - sensor stuck-high/stuck-low simulation

### Deliverables
- [ ] Safety sign-off sheet.
- [ ] Exception list with mitigation owner/date.

---

## 4) Tech Prototype QA

### Checks
- [ ] Sensor reliability >= 95% in repeated trials.
- [ ] False-positive/false-negative rates recorded.
- [ ] Reset process completes within target time.
- [ ] Manual override works for all critical devices.

### Test Method
- Repeat each puzzle mechanism for at least 20 cycles.
- Validate behavior across fast/slow user interaction patterns.

### Deliverables
- [ ] Prototype reliability report.
- [ ] Reset SLA report.

---

## 5) Alpha Playtest QA

### Checks
- [ ] Puzzle completion times align with runtime target.
- [ ] Two-solve stage gates are functioning as designed.
- [ ] Theme-fit and narrative comprehension validated by tester feedback.
- [ ] Hint cadence avoids both over-assist and deadlock.

### Metrics to Capture
- Puzzle solve time: p50/p75/p90
- Hint count per puzzle/stage
- Drop-off or confusion events
- Stage transition latency

### Deliverables
- [ ] Alpha playtest summary.
- [ ] Ranked defect list with recommended fixes.

---

## 6) Beta Ops QA

### Checks
- [ ] Full runbook execution validated by live staff.
- [ ] Consecutive game resets remain within SLA.
- [ ] Incident response drill completed.
- [ ] Throughput assumptions hold under realistic load.

### Exit Criteria
- [ ] All Sev-1 and Sev-2 defects resolved or formally waived.
- [ ] Launch readiness recommendation documented.

---

## Regression Checklist (Run Before Launch)

- [ ] Theme generation + refresh correctness
- [ ] Theme/puzzle skip cooldown behavior
- [ ] Storyline coherence and stage reveal logic
- [ ] Theme-fit rationale present for every puzzle
- [ ] Existing puzzle integration and stage placement
- [ ] Export completeness (story, stages, theme-fit, references)
- [ ] Safety controls and emergency overrides

---

## Defect Triage SLA

- Sev-1: fix/mitigate immediately, retest same day
- Sev-2: fix before next test cycle
- Sev-3: fix before beta completion
- Sev-4: batch for polish release

