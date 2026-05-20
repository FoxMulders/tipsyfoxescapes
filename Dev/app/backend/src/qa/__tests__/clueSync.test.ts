import { describe, expect, it, vi } from "vitest";
import { applyClue, buildPlayerDisplayPayload } from "../liveStateEngine.js";
import { validateClueForOperatingMode } from "../cluePolicy.js";
import { baseLiveState } from "./helpers/liveFixtures.js";

describe("Live window clue reaction & screen sync", () => {
  it("pushes GM clue text onto the player display payload", () => {
    let state = baseLiveState({ operatingMode: "venue" });
    state = applyClue(state, "Try the combination on the desk ledger.");
    const display = buildPlayerDisplayPayload(state);
    expect(display.currentClue).toBe("Try the combination on the desk ledger.");
    expect(display.sessionId).toBe("sess_test");
    expect(display.remainingMs).toBe(45 * 60_000);
  });

  it("notifies SSE subscribers when live state mutates", () => {
    const state = baseLiveState();
    const listener = vi.fn();
    const subs = new Set<(s: typeof state) => void>();
    subs.add(listener);
    const updated = applyClue(state, "Preset hint");
    for (const fn of subs) fn(updated);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ currentClue: "Preset hint" }));
  });

  it("allows venue custom clues but restricts home to preset hints", () => {
    const hints = ["Check the bookshelf", "Look under the desk"];
    expect(validateClueForOperatingMode("Custom GM prose for venue", "venue", hints).ok).toBe(true);
    const homeCustom = validateClueForOperatingMode("Custom GM prose for home", "home", hints);
    expect(homeCustom.ok).toBe(false);
    if (!homeCustom.ok) expect(homeCustom.code).toBe("CLUE_HOME_PRESET_ONLY");
    expect(validateClueForOperatingMode("Check the bookshelf", "home", hints).ok).toBe(true);
  });
});
