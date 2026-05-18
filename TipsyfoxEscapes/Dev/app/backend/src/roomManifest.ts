import { isTrialTierUser } from "./billing/trial.js";
import { hasFullCatalogAccess, type LifecycleUser } from "./userLifecycle.js";

export type RoomManifestStatus = "draft" | "manifested";

export type RoomManifest = {
  status: RoomManifestStatus;
  manifestedAt: string | null;
  creditConsumedAt: string | null;
};

export const defaultRoomManifest = (): RoomManifest => ({
  status: "draft",
  manifestedAt: null,
  creditConsumedAt: null,
});

export const normalizeRoomManifest = (raw: unknown): RoomManifest => {
  if (!raw || typeof raw !== "object") return defaultRoomManifest();
  const o = raw as Partial<RoomManifest>;
  const status = o.status === "manifested" ? "manifested" : "draft";
  return {
    status,
    manifestedAt: typeof o.manifestedAt === "string" ? o.manifestedAt : null,
    creditConsumedAt: typeof o.creditConsumedAt === "string" ? o.creditConsumedAt : null,
  };
};

export const sessionHasFullPuzzleAccess = (manifest: RoomManifest | undefined): boolean =>
  manifest?.status === "manifested" && Boolean(manifest.creditConsumedAt);

export type ManifestConsumeResult = {
  alreadyManifested: boolean;
  creditConsumed: boolean;
  trialConsumed: boolean;
};

/**
 * Irreversibly marks the room as manifested and reserves export capacity at generation time.
 */
export const consumeManifestCredit = (
  manifest: RoomManifest,
  user: LifecycleUser | undefined,
): ManifestConsumeResult => {
  if (manifest.status === "manifested" && manifest.creditConsumedAt) {
    return { alreadyManifested: true, creditConsumed: false, trialConsumed: false };
  }
  const now = new Date().toISOString();
  manifest.status = "manifested";
  manifest.manifestedAt = manifest.manifestedAt ?? now;

  if (!user || user.isAdmin) {
    manifest.creditConsumedAt = manifest.creditConsumedAt ?? now;
    return { alreadyManifested: false, creditConsumed: false, trialConsumed: false };
  }

  if (isTrialTierUser(user) && !user.trialUsedAt) {
    user.trialUsedAt = now;
    manifest.creditConsumedAt = now;
    return { alreadyManifested: false, creditConsumed: false, trialConsumed: true };
  }

  if (hasFullCatalogAccess(user) && (user.exportCreditsRemaining ?? 0) > 0) {
    user.exportCreditsRemaining = Math.max(0, (user.exportCreditsRemaining ?? 0) - 1);
    manifest.creditConsumedAt = now;
    return { alreadyManifested: false, creditConsumed: true, trialConsumed: false };
  }

  manifest.creditConsumedAt = now;
  return { alreadyManifested: false, creditConsumed: false, trialConsumed: false };
};
