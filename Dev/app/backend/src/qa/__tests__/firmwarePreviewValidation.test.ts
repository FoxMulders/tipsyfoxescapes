import { describe, expect, it } from "vitest";
import { auditArduinoPreviewFirmware, formatPinoutMapComment } from "../../firmwarePreviewValidation.js";

const goodSketch = `
const int buttonPin = 2;
unsigned long lastPress = 0;
void setup() { pinMode(buttonPin, INPUT_PULLUP); }
void loop() {
  if (digitalRead(buttonPin) == LOW && millis() - lastPress > 200) {
    lastPress = millis();
  }
}
`;

describe("auditArduinoPreviewFirmware", () => {
  it("passes core-only millis sketch", () => {
    expect(auditArduinoPreviewFirmware(goodSketch)).toEqual([]);
  });

  it("allows Wire.h", () => {
    const code = '#include <Wire.h>\n' + goodSketch;
    expect(auditArduinoPreviewFirmware(code)).toEqual([]);
  });

  it("rejects blocking delay over 50 ms", () => {
    const issues = auditArduinoPreviewFirmware("void setup(){} void loop(){ delay(500); }");
    expect(issues.some((i) => i.code === "ARDUINO_BLOCKING_DELAY")).toBe(true);
  });

  it("allows tiny debounce delay up to 50 ms", () => {
    const code = goodSketch.replace("millis()", "delay(20); millis()");
    expect(auditArduinoPreviewFirmware(code).some((i) => i.code === "ARDUINO_BLOCKING_DELAY")).toBe(false);
  });

  it("rejects unapproved includes unless parts name the module", () => {
    const code = '#include <Adafruit_NeoPixel.h>\n' + goodSketch;
    expect(auditArduinoPreviewFirmware(code, ["Arduino Uno", "NeoPixel ring"])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ARDUINO_UNAPPROVED_INCLUDE" })]),
    );
  });

  it("allows MPR121 include when parts list names touch sensor", () => {
    const code = '#include <Adafruit_MPR121.h>\n#include <Wire.h>\n' + goodSketch;
    expect(auditArduinoPreviewFirmware(code, ["Arduino Uno", "MPR121 touch sensor"])).toEqual([]);
  });
});

describe("formatPinoutMapComment", () => {
  it("renders pin roles as leading comments", () => {
    expect(formatPinoutMapComment({ maglock_relay: 7, reed_switch_1: 2 })).toBe(
      "// maglock_relay: 7\n// reed_switch_1: 2\n",
    );
  });
});
