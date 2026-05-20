import { describe, expect, it } from "vitest";
import {
  assertInitMatchesSnapshot,
  auditLiveStateAgainstSnapshot,
  formatParameterMismatchWarning,
} from "../sessionSnapshotSync.js";
import { baseLiveState } from "./helpers/liveFixtures.js";

describe("Parameter sync & discrepancy auditing", () => {
  const snapshot = { sessionDurationMinutes: 45, playersConcurrent: 6, participantsTotal: 8 };

  it("passes when live state matches session snapshot", () => {
    const state = baseLiveState({ durationMinutes: 45, playersConcurrent: 6 });
    expect(auditLiveStateAgainstSnapshot(state, snapshot)).toHaveLength(0);
  });

  it("errors when initialized with 60-minute timer but snapshot is 45 minutes", () => {
    const state = baseLiveState({ durationMinutes: 60, playersConcurrent: 6 });
    const mismatches = auditLiveStateAgainstSnapshot(state, snapshot);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.field).toBe("durationMinutes");
    expect(mismatches[0]?.expected).toBe(45);
    expect(mismatches[0]?.actual).toBe(60);
    expect(formatParameterMismatchWarning(mismatches)).toMatch(/45 min/);
  });

  it("errors when player concurrent cap drifts from snapshot", () => {
    const state = baseLiveState({ durationMinutes: 45, playersConcurrent: 4 });
    const mismatches = auditLiveStateAgainstSnapshot(state, snapshot);
    expect(mismatches.some((m) => m.field === "playersConcurrent")).toBe(true);
  });

  it("validates init input against snapshot before session starts", () => {
    const ok = assertInitMatchesSnapshot(
      { durationMinutes: 45, playersConcurrent: 6 },
      snapshot,
    );
    expect(ok.ok).toBe(true);

    const bad = assertInitMatchesSnapshot(
      { durationMinutes: 60, playersConcurrent: 6 },
      snapshot,
    );
    expect(bad.ok).toBe(false);
    expect(bad.mismatches[0]?.field).toBe("durationMinutes");
  });
});
