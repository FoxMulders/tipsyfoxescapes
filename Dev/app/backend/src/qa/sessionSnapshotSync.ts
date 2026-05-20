import type { LiveGameState } from "../../../shared/liveContracts.js";

export type PlanningSessionSnapshot = {
  sessionDurationMinutes: number;
  playersConcurrent: number;
  participantsTotal?: number;
};

export type ParameterMismatch = {
  field: "durationMinutes" | "playersConcurrent";
  expected: number;
  actual: number;
  message: string;
};

export const auditLiveStateAgainstSnapshot = (
  state: Pick<LiveGameState, "durationMinutes" | "playersConcurrent" | "activePlayerCount">,
  snapshot: PlanningSessionSnapshot,
): ParameterMismatch[] => {
  const mismatches: ParameterMismatch[] = [];

  if (state.durationMinutes !== snapshot.sessionDurationMinutes) {
    mismatches.push({
      field: "durationMinutes",
      expected: snapshot.sessionDurationMinutes,
      actual: state.durationMinutes,
      message: `Timer duration mismatch: session snapshot is ${snapshot.sessionDurationMinutes} min but live state has ${state.durationMinutes} min.`,
    });
  }

  if (state.playersConcurrent !== snapshot.playersConcurrent) {
    mismatches.push({
      field: "playersConcurrent",
      expected: snapshot.playersConcurrent,
      actual: state.playersConcurrent,
      message: `Concurrent player cap mismatch: snapshot ${snapshot.playersConcurrent}, live ${state.playersConcurrent}.`,
    });
  }

  return mismatches;
};

export const assertInitMatchesSnapshot = (
  initInput: {
    durationMinutes: number;
    playersConcurrent: number;
  },
  snapshot: PlanningSessionSnapshot,
): { ok: boolean; mismatches: ParameterMismatch[] } => {
  const mismatches = auditLiveStateAgainstSnapshot(
    {
      durationMinutes: initInput.durationMinutes,
      playersConcurrent: initInput.playersConcurrent,
      activePlayerCount: initInput.playersConcurrent,
    },
    snapshot,
  );
  return { ok: mismatches.length === 0, mismatches };
};

export const formatParameterMismatchWarning = (mismatches: ParameterMismatch[]): string =>
  mismatches.map((m) => m.message).join(" ");
