import { resolveBillingPlanId, type BillingPlanId } from "./billing/catalog.js";
import { FREE_TIER_ROOM_ALLOWANCE, isTrialTierUser, type TrialBillingUser } from "./billing/trial.js";

export type UserRole = "admin" | "user";
export type LifecycleStatus = "active" | "delinquent" | "canceled";
export type TierTypeLabel = "trial" | "hobbyist" | "enthusiast" | "studio" | "venue" | "admin" | "free";

export type LifecycleUser = TrialBillingUser & {
  isAdmin: boolean;
  lastPurchasedPlanId?: BillingPlanId | string;
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: string | null;
  lifecycleStatus?: LifecycleStatus;
  exportCreditsRemaining: number;
  roomAllowance: number;
};

export const tierTypeForUser = (user: LifecycleUser): TierTypeLabel => {
  if (user.isAdmin) return "admin";
  if (isTrialTierUser(user) && !user.trialUsedAt) return "trial";
  const plan = user.lastPurchasedPlanId ? resolveBillingPlanId(String(user.lastPurchasedPlanId)) : undefined;
  if (plan === "casual_hobbyist") return "hobbyist";
  if (plan === "home_enthusiast") return "enthusiast";
  if (plan === "creative_studio") return "studio";
  if (plan === "venue_blueprint") return "venue";
  if ((user.roomAllowance ?? 0) > FREE_TIER_ROOM_ALLOWANCE) return "hobbyist";
  return "free";
};

const isOperatorPlan = (planId: BillingPlanId | undefined): boolean =>
  planId === "creative_studio" || planId === "venue_blueprint";

export const isOperatorSubscriptionDelinquent = (user: LifecycleUser): boolean => {
  if (user.isAdmin) return false;
  const plan = user.lastPurchasedPlanId ? resolveBillingPlanId(String(user.lastPurchasedPlanId)) : undefined;
  if (!isOperatorPlan(plan)) return false;
  if (user.lifecycleStatus === "canceled") return true;
  if (user.subscriptionActive === false) return true;
  if (user.subscriptionExpiresAt) {
    const exp = new Date(String(user.subscriptionExpiresAt)).getTime();
    if (Number.isFinite(exp) && exp <= Date.now()) return true;
  }
  return false;
};

export const resolveLifecycleStatus = (user: LifecycleUser): LifecycleStatus => {
  if (user.lifecycleStatus === "canceled") return "canceled";
  if (isOperatorSubscriptionDelinquent(user)) return "delinquent";
  return "active";
};

export const hasFullCatalogAccess = (user: LifecycleUser | undefined): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return (user.roomAllowance ?? 0) > FREE_TIER_ROOM_ALLOWANCE;
};

export const canReserveExportCredit = (user: LifecycleUser | undefined): boolean => {
  if (!user || user.isAdmin) return true;
  if (isTrialTierUser(user) && !user.trialUsedAt) return true;
  if (hasFullCatalogAccess(user) && (user.exportCreditsRemaining ?? 0) > 0) return true;
  return false;
};

export const generationAccessError = (
  user: LifecycleUser | undefined,
): { code: string; message: string } | null => {
  if (!user) {
    return {
      code: "UNAUTHORIZED",
      message: "Sign in to generate puzzles for this session.",
    };
  }
  if (user.isAdmin) return null;
  if (resolveLifecycleStatus(user) === "delinquent") {
    return {
      code: "SUBSCRIPTION_INACTIVE",
      message:
        "Subscription inactive. Reactivate your operator tier to resume live facility operations and puzzle generation.",
    };
  }
  if (resolveLifecycleStatus(user) === "canceled") {
    return {
      code: "ACCOUNT_CANCELED",
      message: "This account is canceled. Contact support to restore access.",
    };
  }
  if (isTrialTierUser(user)) {
    if (user.trialUsedAt) {
      return {
        code: "TRIAL_USED",
        message:
          "Your free trial is complete. Purchase an additional export credit or upgrade to an Operator Subscription for live operational access.",
      };
    }
    return null;
  }
  if (hasFullCatalogAccess(user) && (user.exportCreditsRemaining ?? 0) > 0) return null;
  return {
    code: "EXPORT_CREDITS_EXHAUSTED",
    message:
      "You've used all your design exports. Purchase an additional export credit or upgrade to an Operator Subscription for live operational access.",
  };
};

export const exportRunbookAccessError = (
  user: LifecycleUser | undefined,
): { code: string; message: string } | null => {
  const gen = generationAccessError(user);
  if (gen && (gen.code === "EXPORT_CREDITS_EXHAUSTED" || gen.code === "TRIAL_USED")) return gen;
  return gen;
};

export const hasGmConsoleAccess = (user: LifecycleUser | undefined): boolean => {
  if (!user) return false;
  if (isOperatorSubscriptionDelinquent(user)) return false;
  if (user.isAdmin) return true;
  const plan = user.lastPurchasedPlanId ? resolveBillingPlanId(String(user.lastPurchasedPlanId)) : undefined;
  return isOperatorPlan(plan);
};

export const isReadOnlyAccount = (user: LifecycleUser | undefined): boolean => {
  if (!user || user.isAdmin) return false;
  const status = resolveLifecycleStatus(user);
  return status === "delinquent" || status === "canceled";
};
