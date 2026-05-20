import { describe, expect, it } from "vitest";
import {
  buildPinoutTableFromWiring,
  formatPinoutTableMarkdown,
  routeArduinoProductionBundle,
} from "../../arduinoResourceRouter.js";

describe("arduinoResourceRouter", () => {
  it("builds pinout rows from wiring diagram lines", () => {
    const rows = buildPinoutTableFromWiring(["D6 -> buzzer positive", "D10 -> 220 ohm resistor -> LED anode", "GND -> breadboard ground rail"]);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.pin.includes("D6"))).toBe(true);
  });

  it("routes production bundle with trusted documentation URL", () => {
    const bundle = routeArduinoProductionBundle(
      "Code Pulse",
      ["D6 -> buzzer positive", "D10 -> LED anode", "GND -> ground rail"],
      ["Arduino Uno", "Passive buzzer", "LED"],
    );
    expect(bundle.buildDocumentationUrl).toMatch(/^https:\/\//);
    expect(bundle.arduinoCode).toContain("Pin map");
    expect(bundle.arduinoCode.length).toBeGreaterThan(120);
    expect(formatPinoutTableMarkdown(bundle.pinoutTable).join("\n")).toContain("| MCU pin");
  });
});
