/** Fixed theme ids for every trial session (same three every time). */
export const CURATED_TRIAL_THEME_ORDER = ["th_1", "th_2", "th_3"] as const;

export const FREE_TIER_ROOM_ALLOWANCE = 0;

export type TrialBillingUser = {
  isAdmin: boolean;
  roomAllowance: number;
  trialUsedAt?: string | null;
};

export const isTrialTierUser = (user: TrialBillingUser | undefined): boolean => {
  if (!user || user.isAdmin) return false;
  return Math.floor(Number(user.roomAllowance) || 0) <= FREE_TIER_ROOM_ALLOWANCE;
};

export const trialRemaining = (user: TrialBillingUser): boolean => !user.trialUsedAt;

export const trialAccessError = (user: TrialBillingUser | undefined): { code: string; message: string } | null => {
  if (!user || !isTrialTierUser(user)) return null;
  if (user.trialUsedAt) {
    return {
      code: "TRIAL_USED",
      message:
        "Your free trial is complete. Purchase a room pack to design more rooms, save plans to your account, and export again.",
    };
  }
  return null;
};

export const trialSaveError = (user: TrialBillingUser | undefined): { code: string; message: string } | null => {
  if (!user || user.isAdmin) return null;
  if (isTrialTierUser(user)) {
    return {
      code: "TRIAL_NO_SAVE",
      message:
        "Saving plans is not included in the free trial. Purchase a room pack to save rooms to your account and export anytime.",
    };
  }
  return null;
};
