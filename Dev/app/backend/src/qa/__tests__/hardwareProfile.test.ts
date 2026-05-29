import { describe, expect, it } from "vitest";
import {
  detectSketchProfileLegacy,
  isStaticCatalogPuzzle,
  markStaticCatalogPuzzle,
  resolveHardwareProfile,
} from "../../hardwareProfile.js";
import { routeArduinoProductionBundle } from "../../arduinoResourceRouter.js";

describe("hardwareProfile", () => {
  it("detects relay_maglock from legacy text", () => {
    expect(
      detectSketchProfileLegacy(
        ["D7 -> relay module IN", "Reed switch 1 -> D2"],
        ["12V maglock strike", "Arduino Uno"],
      ),
    ).toBe("relay_maglock");
  });

  it("prefers explicit enum over legacy heuristics", () => {
    expect(
      resolveHardwareProfile("touch", ["D2 -> button"], ["Push button", "LED"]),
    ).toBe("touch");
  });

  it("identifies static catalog puzzles by id prefix", () => {
    expect(isStaticCatalogPuzzle({ id: "pz_electronic_maglock" })).toBe(true);
    expect(isStaticCatalogPuzzle({ id: "pz_ai_42" })).toBe(false);
    expect(isStaticCatalogPuzzle({ id: "pz_logic_1_youth_sess_0" })).toBe(true);
  });

  it("respects explicit isStaticCatalog flag", () => {
    expect(isStaticCatalogPuzzle({ id: "pz_ai_1", isStaticCatalog: true })).toBe(true);
    expect(isStaticCatalogPuzzle({ id: "pz_logic_1", isStaticCatalog: false })).toBe(false);
  });

  it("marks static catalog puzzles", () => {
    expect(markStaticCatalogPuzzle({ id: "pz_logic_1" }).isStaticCatalog).toBe(true);
  });
});

describe("routeArduinoProductionBundle with hardware_profile", () => {
  it("routes relay_maglock profile deterministically", () => {
    const bundle = routeArduinoProductionBundle(
      "Maglock Release",
      ["D7 -> relay IN", "D2 -> reed switch"],
      ["Relay module", "Reed switches"],
      "relay_maglock",
    );
    expect(bundle.hardwareProfile).toBe("relay_maglock");
    expect(bundle.arduinoCode).toContain("relayPin");
    expect(bundle.buildDocumentationUrl).toContain("reed-switch");
  });

  it("falls back to legacy text when profile omitted", () => {
    const bundle = routeArduinoProductionBundle(
      "Touch Panel",
      ["SDA -> MPR121", "SCL -> MPR121"],
      ["MPR121 touch sensor"],
    );
    expect(bundle.hardwareProfile).toBe("touch");
    expect(bundle.arduinoCode).toContain("Adafruit_MPR121");
  });
});
