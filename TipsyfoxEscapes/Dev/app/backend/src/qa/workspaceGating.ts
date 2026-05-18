/**
 * Home vs Retail Venue capability gating from planning targetInterface.
 */
import type { TargetInterface } from "../../../shared/contracts.js";
import {
  operatingModeToTargetInterface,
  targetInterfaceToOperatingMode,
  type OperatingMode,
} from "../../../shared/liveContracts.js";

export type { TargetInterface, OperatingMode };

export type LiveOpsCapabilities = {
  operatingMode: OperatingMode;
  targetInterface: TargetInterface;
  hasGmConsole: boolean;
  exportSurface: {
    runbookMarkdown: boolean;
    playerDisplayRoute: boolean;
    gmConsoleRoute: boolean;
  };
  venueOnly: {
    leaderboard: boolean;
    sessionReports: boolean;
    resetChecklist: boolean;
    liveClueBox: boolean;
    customClueText: boolean;
    multiRoomSessionIds: boolean;
    /** Reserved for future operator tooling — false in MVP */
    staffPermissions: boolean;
    propMaintenanceLog: boolean;
    whiteLabelExports: boolean;
  };
};

export const resolveLiveOpsCapabilities = (targetInterface: TargetInterface): LiveOpsCapabilities => {
  const operatingMode = targetInterfaceToOperatingMode(targetInterface);
  const isVenue = operatingMode === "venue";

  return {
    operatingMode,
    targetInterface,
    hasGmConsole: isVenue,
    exportSurface: {
      runbookMarkdown: true,
      playerDisplayRoute: true,
      gmConsoleRoute: isVenue,
    },
    venueOnly: {
      leaderboard: isVenue,
      sessionReports: isVenue,
      resetChecklist: isVenue,
      liveClueBox: isVenue,
      customClueText: isVenue,
      multiRoomSessionIds: isVenue,
      staffPermissions: false,
      propMaintenanceLog: false,
      whiteLabelExports: false,
    },
  };
};

/** Post-export / API payload fragment — home tiers omit commercial ops keys. */
export const buildExportLiveOpsPayload = (
  capabilities: LiveOpsCapabilities,
  sessionId: string,
): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    operatingMode: capabilities.operatingMode,
    targetInterface: capabilities.targetInterface,
    hasGmConsole: capabilities.hasGmConsole,
    playerDisplayPath: `/room/${sessionId}/player-display`,
    runbookReady: capabilities.exportSurface.runbookMarkdown,
  };

  if (capabilities.operatingMode === "home") {
    return {
      ...base,
      liveOpsTier: "home",
      restrictedCommercialFeatures: true,
    };
  }

  return {
    ...base,
    liveOpsTier: "venue",
    gmConsolePath: `/gm/${sessionId}`,
    venueOperations: {
      leaderboard: capabilities.venueOnly.leaderboard,
      sessionReports: capabilities.venueOnly.sessionReports,
      resetChecklist: capabilities.venueOnly.resetChecklist,
      liveClueBox: capabilities.venueOnly.liveClueBox,
      customClueText: capabilities.venueOnly.customClueText,
      multiRoomSessionIds: capabilities.venueOnly.multiRoomSessionIds,
    },
  };
};

export const deriveOperatingModeFromPlanning = (input: {
  targetInterface?: TargetInterface;
  operatingMode?: OperatingMode;
  eventType?: string;
  venueBuildType?: "professional_empty" | "prebuilt_space";
}): OperatingMode => {
  const ti = input.targetInterface;
  if (ti === "home_party" || ti === "commercial_venue") {
    return targetInterfaceToOperatingMode(ti);
  }
  if (input.operatingMode === "home" || input.operatingMode === "venue") {
    return input.operatingMode;
  }
  const et = (input.eventType ?? "").toLowerCase();
  if (/\b(commercial|ticketed|venue|escape room)\b/.test(et)) return "venue";
  if (input.venueBuildType === "professional_empty") return "venue";
  return "home";
};

export const assertHomePayloadHasNoVenueRoutes = (payload: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  if (payload.gmConsolePath) errors.push("Home export must not include gmConsolePath");
  if (payload.venueOperations) errors.push("Home export must not include venueOperations");
  return errors;
};

export const assertVenuePayloadHasCommercialOps = (payload: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  const ops = payload.venueOperations as Record<string, unknown> | undefined;
  if (!ops) errors.push("Venue export must include venueOperations");
  else {
    for (const key of ["leaderboard", "liveClueBox", "resetChecklist"] as const) {
      if (!ops[key]) errors.push(`Venue export venueOperations.${key} must be enabled`);
    }
  }
  return errors;
};

export const operatingModeMatchesTarget = (targetInterface: TargetInterface, mode: OperatingMode): boolean =>
  operatingModeToTargetInterface(mode) === targetInterface;
