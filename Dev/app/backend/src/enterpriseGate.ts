import { resolveBillingPlanId } from "./billing/catalog.js";
import { isOperatorSubscriptionDelinquent, type LifecycleUser } from "./userLifecycle.js";

/**
 * Venue Blueprint fleet / multi-room live activation is gated until enterprise
 * infrastructure is provisioned — prevents unbounded concurrent venue SSE load.
 */
export type EnterpriseUser = LifecycleUser & {
  isEnterpriseProvisioned?: boolean;
  lastPurchasedPlanId?: string;
};

export const isEnterpriseProvisionedUser = (user: EnterpriseUser | undefined): boolean =>
  Boolean(user?.isAdmin || user?.isEnterpriseProvisioned);

export const requiresEnterpriseFleetProvisioning = (user: EnterpriseUser | undefined): boolean => {
  if (!user || user.isAdmin) return false;
  const plan = user.lastPurchasedPlanId ? resolveBillingPlanId(String(user.lastPurchasedPlanId)) : undefined;
  return plan === "venue_blueprint" && !isEnterpriseProvisionedUser(user);
};

export const fleetActivationError = (
  user: EnterpriseUser | undefined,
  otherActiveVenueSessions: number,
): { code: string; message: string } | null => {
  if (!requiresEnterpriseFleetProvisioning(user)) return null;
  if (otherActiveVenueSessions < 1) return null;
  return {
    code: "ENTERPRISE_PROVISIONING_REQUIRED",
    message:
      "Multi-room fleet live operations require Venue Blueprint enterprise provisioning. Contact sales to activate your fleet onboarding pipeline.",
  };
};

export const liveOpsFrozenError = (user: EnterpriseUser | undefined): { code: string; message: string } | null => {
  if (!user || user.isAdmin) return null;
  if (!isOperatorSubscriptionDelinquent(user)) return null;
  return {
    code: "SUBSCRIPTION_INACTIVE",
    message:
      "Subscription inactive. Reactivate your operator tier to resume live facility operations and real-time player display syncing.",
  };
};
