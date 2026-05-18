import { describe, expect, it } from "vitest";
import { consumeManifestCredit, defaultRoomManifest, sessionHasFullPuzzleAccess } from "../../roomManifest.js";

describe("roomManifest", () => {
  it("deducts export credit at manifest time", () => {
    const manifest = defaultRoomManifest();
    const user = {
      isAdmin: false,
      roomAllowance: 3,
      exportCreditsRemaining: 2,
      trialUsedAt: null,
    };
    const result = consumeManifestCredit(manifest, user);
    expect(result.creditConsumed).toBe(true);
    expect(user.exportCreditsRemaining).toBe(1);
    expect(sessionHasFullPuzzleAccess(manifest)).toBe(true);
  });

  it("does not double-charge an already manifested room", () => {
    const manifest = defaultRoomManifest();
    const user = {
      isAdmin: false,
      roomAllowance: 3,
      exportCreditsRemaining: 2,
      trialUsedAt: null,
    };
    consumeManifestCredit(manifest, user);
    const again = consumeManifestCredit(manifest, user);
    expect(again.alreadyManifested).toBe(true);
    expect(again.creditConsumed).toBe(false);
    expect(user.exportCreditsRemaining).toBe(1);
  });
});
