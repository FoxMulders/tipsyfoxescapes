import { describe, expect, it } from "vitest";
import {
  fleetActivationError,
  isEnterpriseProvisionedUser,
  liveOpsFrozenError,
  requiresEnterpriseFleetProvisioning,
} from "../../enterpriseGate.js";

describe("enterpriseGate", () => {
  it("treats venue blueprint without enterprise flag as fleet-gated", () => {
    const user = {
      isAdmin: false,
      roomAllowance: 50,
      exportCreditsRemaining: 10,
      trialUsedAt: null,
      lastPurchasedPlanId: "venue_blueprint",
      isEnterpriseProvisioned: false,
    };
    expect(requiresEnterpriseFleetProvisioning(user)).toBe(true);
    expect(isEnterpriseProvisionedUser(user)).toBe(false);
    expect(fleetActivationError(user, 1)?.code).toBe("ENTERPRISE_PROVISIONING_REQUIRED");
    expect(fleetActivationError(user, 0)).toBeNull();
  });

  it("allows fleet when enterprise provisioned", () => {
    const user = {
      isAdmin: false,
      roomAllowance: 50,
      exportCreditsRemaining: 10,
      trialUsedAt: null,
      lastPurchasedPlanId: "venue_blueprint",
      isEnterpriseProvisioned: true,
    };
    expect(fleetActivationError(user, 3)).toBeNull();
  });

  it("blocks live ops when operator subscription is delinquent", () => {
    const user = {
      isAdmin: false,
      roomAllowance: 15,
      exportCreditsRemaining: 5,
      trialUsedAt: null,
      lastPurchasedPlanId: "creative_studio",
      subscriptionActive: false,
    };
    expect(liveOpsFrozenError(user)?.code).toBe("SUBSCRIPTION_INACTIVE");
  });
});
