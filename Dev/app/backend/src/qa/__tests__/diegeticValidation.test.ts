import { describe, expect, it } from "vitest";
import { DiegeticPuzzleSchema, DiegeticLayerSchema, PuzzlePresentationSchema } from "../../services/ai/schemas/diegeticPuzzle.js";
import {
  assembleDiegeticPuzzle,
  scanBannedDiegeticText,
  validateDiegeticFields,
} from "../../services/ai/diegeticValidation.js";

const validLayer = {
  hardware_and_electronics: {
    required_components: ["magnetic reed switch", "hinged panel", "counterweight"],
    trigger_mechanism:
      "When the panel tilts past 12 degrees the reed switch closes and latches the release solenoid.",
  },
  physical_prop_translation: {
    player_action: "Players lift and hold the brass fin until the counterweight clears the detent.",
    prop_design: "A wall-mounted fin connected to a hidden counterweight via a visible pulley line.",
  },
};

describe("DiegeticPuzzleSchema", () => {
  it("parses a valid diegetic puzzle", () => {
    const parsed = DiegeticPuzzleSchema.parse({
      ...validLayer,
      narrative_justification:
        "The fin is part of the ship's ballast trim system; restoring balance unlocks the maintenance hatch.",
      banned_word_check: true,
    });
    expect(parsed.banned_word_check).toBe(true);
  });

  it("rejects missing hardware fields", () => {
    expect(() =>
      DiegeticLayerSchema.parse({
        hardware_and_electronics: { required_components: [], trigger_mechanism: "short" },
        physical_prop_translation: validLayer.physical_prop_translation,
      }),
    ).toThrow();
  });
});

describe("banned-word rejection", () => {
  it("flags represents/symbolizes/simulates tropes", () => {
    expect(scanBannedDiegeticText("This dial symbolizes the captain's resolve.")).toContain("symbolizes");
    expect(scanBannedDiegeticText("The chart represents the star map.")).toContain("represents");
    expect(scanBannedDiegeticText("A panel simulates engine heat.")).toContain("simulates");
  });

  it("flags cipher chart and padlock tropes", () => {
    expect(scanBannedDiegeticText("Use the cipher chart on the wall.")).toContain("cipher chart");
    expect(scanBannedDiegeticText("Enter the code on a 3-digit padlock.")).toContain("padlock");
  });

  it("rejects narrative when banned_word_check is false", () => {
    const result = validateDiegeticFields(
      [{ field: "narrative_justification", text: "Clean diegetic copy." }],
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("banned_word_check");
    }
  });

  it("rejects narrative containing banned tropes even when model attests clean", () => {
    const result = assembleDiegeticPuzzle({
      layer: validLayer,
      narrative_justification: "The lock represents the sealed archive.",
      banned_word_check: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toContain("represents");
    }
  });

  it("accepts clean diegetic narrative", () => {
    const result = assembleDiegeticPuzzle({
      layer: validLayer,
      narrative_justification:
        "Engineering logs show the fin must be trimmed before the maintenance hatch can unlatch.",
      banned_word_check: true,
    });
    expect(result.ok).toBe(true);
    expect(result.puzzle?.narrative_justification).toContain("maintenance hatch");
  });
});

describe("PuzzlePresentationSchema", () => {
  it("requires electronicDetails for electronic category payloads", () => {
    const parsed = PuzzlePresentationSchema.parse({
      category: "electronic",
      title: "Relay Bus",
      objective: "Complete the relay sequence to energize the hatch release.",
      solveSteps: ["Wire the relay board", "Press the sequence 2-4-1 to energize the solenoid"],
      narrative_justification:
        "The relay bus is the last live circuit on this deck; restoring it unlatches the maintenance hatch.",
      banned_word_check: true,
      themeTags: ["sci-fi", "relay"],
      electronicDetails: {
        parts: ["Arduino Uno", "Relay module", "Push buttons"],
        wiringDiagram: ["D2 -> button -> GND", "D8 -> relay IN"],
        wiringDiagramSvg: "",
        buildSteps: ["Mount relay", "Upload sketch"],
        arduinoCode: "void setup(){ pinMode(2, INPUT); pinMode(8, OUTPUT); }\nvoid loop(){ if(digitalRead(2)==HIGH){ digitalWrite(8,HIGH);} }",
      },
    });
    expect(parsed.category).toBe("electronic");
  });
});
