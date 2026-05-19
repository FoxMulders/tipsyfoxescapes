import { resolveBillingPlanId } from "./catalog.js";
import { isTrialTierUser, type TrialBillingUser } from "./trial.js";
import { tierTypeForUser, type LifecycleUser, type TierTypeLabel } from "../userLifecycle.js";

/**
 * Balanced Growth: full maker electronics (wiring, pinouts, SVG, Arduino) in exports and in-app detail
 * for Home Host Enthusiast, Creative Studio, Venue, and admin accounts only.
 */
export const tierIncludesMakerElectronics = (tier: TierTypeLabel): boolean =>
  tier === "enthusiast" || tier === "studio" || tier === "venue" || tier === "admin";

export const hasMakerElectronicsAccessForUser = (user: (TrialBillingUser & LifecycleUser) | undefined): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  const plan = user.lastPurchasedPlanId ? resolveBillingPlanId(String(user.lastPurchasedPlanId)) : undefined;
  if (plan === "home_enthusiast" || plan === "creative_studio" || plan === "venue_blueprint") return true;
  if (isTrialTierUser(user)) return false;
  if (plan === "casual_hobbyist" || plan === "free") return false;
  return tierIncludesMakerElectronics(tierTypeForUser(user));
};

/** Whether export runbooks should omit maker electronics sections. */
export const shouldRedactMakerElectronicsExport = (user: (TrialBillingUser & LifecycleUser) | undefined): boolean =>
  !hasMakerElectronicsAccessForUser(user);
