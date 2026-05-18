import { describe, expect, it } from "vitest";
import {
  assertHomePayloadHasNoVenueRoutes,
  assertVenuePayloadHasCommercialOps,
  buildExportLiveOpsPayload,
  deriveOperatingModeFromPlanning,
  resolveLiveOpsCapabilities,
} from "../workspaceGating.js";

describe("Workspace & tier gating (targetInterface)", () => {
  it("maps home_party to home operating mode", () => {
    const caps = resolveLiveOpsCapabilities("home_party");
    expect(caps.operatingMode).toBe("home");
    expect(caps.hasGmConsole).toBe(false);
    expect(caps.exportSurface.gmConsoleRoute).toBe(false);
    expect(caps.exportSurface.playerDisplayRoute).toBe(true);
    expect(caps.venueOnly.liveClueBox).toBe(false);
    expect(caps.venueOnly.customClueText).toBe(false);
  });

  it("maps commercial_venue to venue operating mode with GM surfaces", () => {
    const caps = resolveLiveOpsCapabilities("commercial_venue");
    expect(caps.operatingMode).toBe("venue");
    expect(caps.hasGmConsole).toBe(true);
    expect(caps.exportSurface.gmConsoleRoute).toBe(true);
    expect(caps.venueOnly.resetChecklist).toBe(true);
    expect(caps.venueOnly.leaderboard).toBe(true);
  });

  it("strips commercial ops from home export payload", () => {
    const caps = resolveLiveOpsCapabilities("home_party");
    const payload = buildExportLiveOpsPayload(caps, "sess_1");
    expect(payload.liveOpsTier).toBe("home");
    expect(assertHomePayloadHasNoVenueRoutes(payload)).toHaveLength(0);
    expect(payload.gmConsolePath).toBeUndefined();
  });

  it("includes venue operations block for commercial export payload", () => {
    const caps = resolveLiveOpsCapabilities("commercial_venue");
    const payload = buildExportLiveOpsPayload(caps, "sess_venue");
    expect(payload.gmConsolePath).toBe("/gm/sess_venue");
    expect(assertVenuePayloadHasCommercialOps(payload)).toHaveLength(0);
    const ops = payload.venueOperations as Record<string, unknown>;
    expect(ops.customClueText).toBe(true);
    expect(ops.staffPermissions).toBeUndefined();
  });

  it("derives venue mode from commercial event type when target unset", () => {
    expect(
      deriveOperatingModeFromPlanning({
        eventType: "Ticketed commercial escape room night",
      }),
    ).toBe("venue");
  });

  it("derives home mode by default", () => {
    expect(deriveOperatingModeFromPlanning({})).toBe("home");
  });
});
