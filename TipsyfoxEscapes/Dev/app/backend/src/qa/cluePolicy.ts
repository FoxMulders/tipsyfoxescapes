import type { OperatingMode } from "../../../shared/liveContracts.js";

export type ClueSendResult =
  | { ok: true; clue: string }
  | { ok: false; code: string; message: string };

/** Home hosts may use preset hints; venue GMs may send arbitrary custom clues. */
export const canSendCustomClue = (operatingMode: OperatingMode): boolean => operatingMode === "venue";

export const validateClueForOperatingMode = (
  clue: string,
  operatingMode: OperatingMode,
  preSavedHints: string[],
): ClueSendResult => {
  const trimmed = clue.trim();
  if (!trimmed) {
    return { ok: false, code: "CLUE_EMPTY", message: "Clue text cannot be empty." };
  }

  if (operatingMode === "venue") {
    if (trimmed.length > 500) {
      return { ok: false, code: "CLUE_TOO_LONG", message: "Clue must be 500 characters or fewer." };
    }
    return { ok: true, clue: trimmed.slice(0, 500) };
  }

  const isPreset = preSavedHints.some((h) => h.trim() === trimmed);
  if (!isPreset) {
    return {
      ok: false,
      code: "CLUE_HOME_PRESET_ONLY",
      message: "Home Mode allows preset hints from your plan only — upgrade path is Commercial Venue for custom live clues.",
    };
  }

  return { ok: true, clue: trimmed.slice(0, 280) };
};
