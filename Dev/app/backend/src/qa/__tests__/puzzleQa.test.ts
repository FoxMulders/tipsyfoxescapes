import { describe, expect, it } from "vitest";
import { applyPuzzleQaGate, auditPuzzleQa } from "../../puzzleQa.js";

describe("Puzzle QA (migrated)", () => {
  it("passes a valid strict puzzle", () => {
    const out = applyPuzzleQaGate(
      [
        {
          id: "qa_good",
          category: "logic",
          themeTags: ["library"],
          title: "Cipher Index",
          objective: "Decode the archive index card.",
          howItWorks:
            "Players find a cipher key on the Cipher Index card and decode a short message that unlocks the next compartment.",
          themeFitReason: 'For "Haunted Library", this cipher uses mis-shelved index cards as diegetic clues.',
          referenceLinks: [
            {
              title: "Arduino tone reference",
              url: "https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/",
            },
          ],
          solveSteps: ["Find key", "Decode message"],
          difficulty: "medium",
        },
      ],
      { themeName: "Haunted Library", strict: true },
    );
    expect(out[0]?.puzzleQa?.passed).toBe(true);
  });

  const validElectronic = {
    id: "qa_elec",
    category: "electronic" as const,
    themeTags: ["sci-fi", "modern-electronics"],
    title: "Signal Relay",
    objective: "Complete the button-and-LED circuit to reveal the success signal.",
    howItWorks:
      "Players press the button sequence on the Signal Relay circuit; the Arduino sketch debounces input and toggles the green LED when correct.",
    themeFitReason: 'For "Derelict Station", the relay reads like rerouting failing ship power systems.',
    referenceLinks: [
      { title: "Arduino Button built-in example", url: "https://docs.arduino.cc/built-in-examples/digital/Button/" },
    ],
    solveSteps: ["Wire LEDs and button", "Press the correct sequence"],
    difficulty: "medium" as const,
    electronicDetails: {
      parts: ["Arduino Uno", "Push button", "Green LED", "220 ohm resistor"],
      wiringDiagram: ["D2 -> push button -> GND", "D9 -> green LED -> GND"],
      wiringDiagramSvg:
        '<svg xmlns="http://www.w3.org/2000/svg"><text>Arduino</text><text>push button</text><text>green LED</text></svg>',
      buildSteps: ["Wire it", "Upload sketch"],
      arduinoCode:
        "const int buttonPin = 2;\nconst int ledPin = 9;\nunsigned long lastPress = 0;\nvoid setup(){pinMode(buttonPin, INPUT);pinMode(ledPin, OUTPUT);}\nvoid loop(){ if(digitalRead(buttonPin)==HIGH && millis()-lastPress>200){lastPress=millis();digitalWrite(ledPin,HIGH);} }",
    },
  };

  it("passes a complete electronic puzzle with a specific deep link", () => {
    const report = auditPuzzleQa(validElectronic, { themeName: "Derelict Station", strict: true });
    expect(report.passed).toBe(true);
  });

  it("fails an electronic puzzle whose only reference is a homepage (after filtering)", () => {
    const [gated] = applyPuzzleQaGate(
      [{ ...validElectronic, id: "qa_elec_home", referenceLinks: [{ title: "Arduino", url: "https://www.arduino.cc/" }] }],
      { themeName: "Derelict Station", strict: true },
    );
    const issues = gated?.puzzleQa?.issues ?? [];
    expect(issues.some((i) => i.code === "ELECTRONIC_REFERENCE_GENERIC")).toBe(true);
    expect(issues.some((i) => i.code === "ELECTRONIC_REFERENCE_MISSING")).toBe(true);
    expect(gated?.puzzleQa?.passed).toBe(false);
  });

  it("fails an electronic puzzle with an empty loop()", () => {
    const report = auditPuzzleQa(
      {
        ...validElectronic,
        id: "qa_elec_loop",
        electronicDetails: { ...validElectronic.electronicDetails, arduinoCode: "void setup(){}\nvoid loop(){}" },
      },
      { themeName: "Derelict Station", strict: true },
    );
    expect(report.issues.some((i) => i.code === "ARDUINO_EMPTY_LOOP")).toBe(true);
    expect(report.passed).toBe(false);
  });

  it("fails when a named hardware component is not referenced in code or wiring", () => {
    const report = auditPuzzleQa(
      {
        ...validElectronic,
        id: "qa_elec_unmapped",
        electronicDetails: {
          ...validElectronic.electronicDetails,
          parts: [...validElectronic.electronicDetails.parts, "MPR121 touch sensor"],
        },
      },
      { themeName: "Derelict Station", strict: true },
    );
    expect(report.issues.some((i) => i.code === "HARDWARE_NOT_MAPPED")).toBe(true);
    expect(report.passed).toBe(false);
  });

  it("fails copy that contains an author-it-later placeholder", () => {
    const report = auditPuzzleQa(
      {
        id: "qa_placeholder",
        category: "logic",
        themeTags: ["library"],
        title: "Cipher Index",
        objective: "Decode the index card.",
        howItWorks: "Players decode a short message. Design a cipher chart and insert custom text here for the room.",
        themeFitReason: 'For "Haunted Library", this cipher uses mis-shelved index cards.',
        referenceLinks: [],
        solveSteps: ["Find key", "Decode message"],
        difficulty: "medium",
      },
      { themeName: "Haunted Library", strict: true },
    );
    expect(report.issues.some((i) => i.code === "COPY_PLACEHOLDER")).toBe(true);
    expect(report.passed).toBe(false);
  });

  it("warns on an anachronistic mechanic for a sci-fi theme", () => {
    const report = auditPuzzleQa(
      {
        id: "qa_anachronism",
        category: "logic",
        themeTags: ["sci-fi", "space"],
        title: "Telegraph Tap",
        objective: "Tap the telegraph key in the right rhythm.",
        howItWorks: "Players use a brass telegraph key and wax seal to send the code that opens the hatch.",
        themeFitReason: 'For "Orbital Station", the relay reads like ship comms.',
        referenceLinks: [],
        solveSteps: ["Find the rhythm", "Tap the telegraph key"],
        difficulty: "medium",
      },
      { themeName: "Orbital Station", strict: true },
    );
    expect(report.issues.some((i) => i.code === "ANACHRONISTIC_MECHANIC")).toBe(true);
  });

  it("fails YouTube search URLs in strict mode", () => {
    const report = auditPuzzleQa(
      {
        id: "qa_bad_links",
        category: "logic",
        themeTags: [],
        title: "Pattern Archive",
        objective: "Match symbols.",
        howItWorks: "Players collect symbols from props and align the Pattern Archive sequence on the board.",
        themeFitReason: 'For "Haunted Library", symbol order mirrors misfiled spine colors.',
        referenceLinks: [
          {
            title: "Generic search",
            url: "https://www.youtube.com/results?search_query=escape+room",
          },
        ],
        solveSteps: ["Collect", "Align"],
        difficulty: "medium",
      },
      { themeName: "Haunted Library", strict: true },
      [{ title: "Generic search", url: "https://www.youtube.com/results?search_query=escape+room" }],
    );
    expect(report.passed).toBe(false);
  });
});
