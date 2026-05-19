import { describe, expect, it } from "vitest";
import { hasMakerElectronicsAccessForUser, shouldRedactMakerElectronicsExport } from "../../billing/entitlements.js";

const baseUser = {
  isAdmin: false,
  roomAllowance: 0,
  exportCreditsRemaining: 0,
  trialUsedAt: null as string | null,
  lastPurchasedPlanId: undefined as string | undefined,
};

describe("entitlements (Balanced Growth)", () => {
  it("trial users cannot access maker electronics", () => {
    expect(hasMakerElectronicsAccessForUser({ ...baseUser, roomAllowance: 0 })).toBe(false);
    expect(shouldRedactMakerElectronicsExport({ ...baseUser, roomAllowance: 0 })).toBe(true);
  });

  it("casual hobbyist cannot access maker electronics", () => {
    const user = { ...baseUser, roomAllowance: 1, lastPurchasedPlanId: "casual_hobbyist" as const };
    expect(hasMakerElectronicsAccessForUser(user)).toBe(false);
    expect(shouldRedactMakerElectronicsExport(user)).toBe(true);
  });

  it("home enthusiast and creative studio include maker electronics", () => {
    expect(
      hasMakerElectronicsAccessForUser({
        ...baseUser,
        roomAllowance: 3,
        lastPurchasedPlanId: "home_enthusiast",
      }),
    ).toBe(true);
    expect(
      hasMakerElectronicsAccessForUser({
        ...baseUser,
        roomAllowance: 1,
        lastPurchasedPlanId: "creative_studio",
      }),
    ).toBe(true);
  });

  it("admin always includes maker electronics", () => {
    expect(hasMakerElectronicsAccessForUser({ ...baseUser, isAdmin: true })).toBe(true);
  });
});
