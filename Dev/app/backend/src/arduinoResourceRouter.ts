/**
 * Production-oriented Arduino / MCU routing — pinout tables and trusted maker links
 * instead of bare tone() demos.
 */

import {
  detectSketchProfileLegacy,
  type HardwareProfile,
  resolveHardwareProfile,
} from "./hardwareProfile.js";

export type ArduinoPinoutRow = {
  pin: string;
  function: string;
  connectsTo: string;
};

export type ArduinoProductionBundle = {
  pinoutTable: ArduinoPinoutRow[];
  arduinoCode: string;
  buildDocumentationUrl: string;
  makerLibraryLinks: Array<{ title: string; url: string }>;
  hardwareProfile: HardwareProfile;
};

export const TRUSTED_MAKER_LIBRARIES = {
  arduinoLanguageReference: {
    title: "Arduino Language Reference",
    url: "https://www.arduino.cc/reference/en/",
  },
  arduinoUnoPinout: {
    title: "Arduino Uno Rev3 pinout (official)",
    url: "https://docs.arduino.cc/resources/pinouts/ABX00021-Uno-rev3/",
  },
  adafruitLearn: {
    title: "Adafruit Learning System",
    url: "https://learn.adafruit.com/",
  },
  sparkfunTutorials: {
    title: "SparkFun Tutorials",
    url: "https://learn.sparkfun.com/",
  },
  playfulTechnology: {
    title: "Playful Technology — escape-room Arduino builds",
    url: "https://www.youtube.com/@playfultechnology",
  },
  mpr121Guide: {
    title: "Adafruit MPR121 capacitive touch guide",
    url: "https://learn.adafruit.com/adafruit-mpr121-12-key-capacitive-touch-sensor-breakout-tutorial",
  },
  mfrc522Guide: {
    title: "Arduino MFRC522 RFID wiring",
    url: "https://github.com/miguelbalboa/rfid",
  },
  reedSwitchGuide: {
    title: "Adafruit reed switch overview and wiring",
    url: "https://learn.adafruit.com/reed-switch/overview",
  },
} as const;

const parsePinFromWiringLine = (line: string): { pin: string; target: string } | null => {
  const arrow = line.match(/^([^:]+?)\s*[-–>]+\s*(.+)$/i);
  if (!arrow) return null;
  const pin = arrow[1].trim();
  const target = arrow[2].trim();
  if (!pin || !target) return null;
  return { pin, target };
};

export const buildPinoutTableFromWiring = (wiringDiagram: string[]): ArduinoPinoutRow[] => {
  const rows: ArduinoPinoutRow[] = [];
  for (const raw of wiringDiagram) {
    const line = raw.trim();
    if (!line) continue;
    const parsed = parsePinFromWiringLine(line);
    if (!parsed) continue;
    const pin = parsed.pin;
    const isPower = /\b(5v|3\.3v|vin|gnd|ground)\b/i.test(pin);
    rows.push({
      pin,
      function: isPower ? "Power / ground rail" : "GPIO / bus signal",
      connectsTo: parsed.target,
    });
  }
  if (rows.length === 0) {
    rows.push(
      { pin: "D2–D13", function: "Digital I/O", connectsTo: "Per wiring diagram in export" },
      { pin: "A0–A5", function: "Analog input", connectsTo: "Sensors as listed in BOM" },
      { pin: "5V / GND", function: "Power distribution", connectsTo: "Breadboard rails — fuse/protect high-current loads" },
    );
  }
  return rows;
};

const pinoutTableToCommentBlock = (rows: ArduinoPinoutRow[]): string =>
  rows.map((r) => `// ${r.pin.padEnd(8)} → ${r.connectsTo} (${r.function})`).join("\n");

const buildSketchForProfile = (profile: HardwareProfile, rows: ArduinoPinoutRow[]): string => {
  const header = `/*
 * Production routing sketch — verify pinout against your bench wiring before live play.
 * Profile: ${profile}
 * Pin map:
${pinoutTableToCommentBlock(rows)}
 */`;

  switch (profile) {
    case "button_led":
      return `${header}
const int kButtonPin = 2;
const int kStatusLedPin = 9;
const int kSuccessLedPin = 10;
unsigned long lastDebounceMs = 0;
int pressCount = 0;

void setup() {
  pinMode(kButtonPin, INPUT_PULLUP);
  pinMode(kStatusLedPin, OUTPUT);
  pinMode(kSuccessLedPin, OUTPUT);
  digitalWrite(kStatusLedPin, HIGH);
}

void loop() {
  if (digitalRead(kButtonPin) == LOW && millis() - lastDebounceMs > 280) {
    lastDebounceMs = millis();
    pressCount++;
  }
  if (pressCount >= 3) {
    digitalWrite(kStatusLedPin, LOW);
    digitalWrite(kSuccessLedPin, HIGH);
  }
}`;
    case "buzzer":
      return `${header}
const int kBuzzerPin = 6;
const int kLedPin = 10;
const int kPatternMs[] = {200, 200, 600, 200, 600};
const int kPatternLen = 5;

void setup() {
  pinMode(kLedPin, OUTPUT);
}

void loop() {
  for (int i = 0; i < kPatternLen; i++) {
    tone(kBuzzerPin, 880 + (i * 40));
    digitalWrite(kLedPin, HIGH);
    delay(kPatternMs[i]);
    noTone(kBuzzerPin);
    digitalWrite(kLedPin, LOW);
    delay(220);
  }
  delay(1800);
}`;
    case "touch":
      return `${header}
// Wire MPR121 per Adafruit guide — SDA/SCL on Arduino Uno.
#include <Wire.h>
#include "Adafruit_MPR121.h"
Adafruit_MPR121 cap = Adafruit_MPR121();
const uint8_t kUnlockPin = 9;
const uint8_t kSequence[] = {0, 2, 1, 2};
uint8_t seqPos = 0;

void setup() {
  pinMode(kUnlockPin, OUTPUT);
  digitalWrite(kUnlockPin, LOW);
  if (!cap.begin(0x5A)) { for (;;) { delay(500); } }
}

void loop() {
  uint16_t touched = cap.touched();
  for (uint8_t pad = 0; pad < 12; pad++) {
    if (!(touched & (1 << pad))) continue;
    if (pad == kSequence[seqPos]) {
      seqPos++;
      if (seqPos >= sizeof(kSequence)) {
        digitalWrite(kUnlockPin, HIGH);
        delay(1200);
        digitalWrite(kUnlockPin, LOW);
        seqPos = 0;
      }
    } else {
      seqPos = 0;
    }
    delay(120);
  }
}`;
    case "rfid":
      return `${header}
#include <SPI.h>
#include <MFRC522.h>
#define RST_PIN 9
#define SS_PIN 10
MFRC522 mfrc522(SS_PIN, RST_PIN);
const char* kOrder[] = {"TAG1", "TAG3", "TAG2"};
uint8_t orderPos = 0;

void setup() {
  SPI.begin();
  mfrc522.PCD_Init();
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;
  String id;
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    id += String(mfrc522.uid.uidByte[i], HEX);
  }
  if (id.equalsIgnoreCase(kOrder[orderPos])) {
    orderPos++;
    if (orderPos >= 3) {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(1500);
      digitalWrite(LED_BUILTIN, LOW);
      orderPos = 0;
    }
  } else {
    orderPos = 0;
  }
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}`;
    case "relay_maglock":
      return `${header}
const int reedPins[3] = {2, 3, 4};
const int relayPin = 7;
const int sequence[3] = {0, 1, 2};
int step = 0;
unsigned long lastTrigger = 0;
const unsigned long debounceMs = 200;

void setup() {
  for (int i = 0; i < 3; i++) {
    pinMode(reedPins[i], INPUT_PULLUP);
  }
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);
}

void loop() {
  unsigned long now = millis();
  for (int i = 0; i < 3; i++) {
    if (digitalRead(reedPins[i]) == LOW && now - lastTrigger > debounceMs) {
      lastTrigger = now;
      if (i == sequence[step]) {
        step++;
      } else {
        step = 0;
      }
    }
  }
  if (step >= 3) {
    digitalWrite(relayPin, HIGH);
  }
}`;
    case "analog_sensor":
      return `${header}
const int kSensorPin = A0;
const int kOutputPin = 9;
const int kThreshold = 512;
unsigned long lastSampleMs = 0;

void setup() {
  pinMode(kOutputPin, OUTPUT);
  digitalWrite(kOutputPin, LOW);
}

void loop() {
  if (millis() - lastSampleMs < 50) return;
  lastSampleMs = millis();
  int reading = analogRead(kSensorPin);
  digitalWrite(kOutputPin, reading >= kThreshold ? HIGH : LOW);
}`;
    case "print_and_play":
      return `${header}
/*
 * print_and_play — no MCU upload required.
 * Host prints clue media and stages physical props per BOM and solveSteps.
 */
`;
    default:
      return `${header}
const int kOutputPin = 9;

void setup() {
  pinMode(kOutputPin, OUTPUT);
}

void loop() {
  digitalWrite(kOutputPin, HIGH);
  delay(400);
  digitalWrite(kOutputPin, LOW);
  delay(400);
}`;
  }
};

const documentationUrlForProfile = (profile: HardwareProfile): string => {
  switch (profile) {
    case "touch":
      return TRUSTED_MAKER_LIBRARIES.mpr121Guide.url;
    case "rfid":
      return TRUSTED_MAKER_LIBRARIES.mfrc522Guide.url;
    case "relay_maglock":
      return TRUSTED_MAKER_LIBRARIES.reedSwitchGuide.url;
    case "print_and_play":
      return TRUSTED_MAKER_LIBRARIES.adafruitLearn.url;
    default:
      return TRUSTED_MAKER_LIBRARIES.arduinoUnoPinout.url;
  }
};

export const routeArduinoProductionBundle = (
  _puzzleTitle: string,
  wiringDiagram: string[],
  parts: string[],
  hardwareProfile?: HardwareProfile,
): ArduinoProductionBundle => {
  const pinoutTable = buildPinoutTableFromWiring(wiringDiagram);
  const profile = resolveHardwareProfile(hardwareProfile, wiringDiagram, parts);
  const buildDocumentationUrl = documentationUrlForProfile(profile);

  const makerLibraryLinks = [
    TRUSTED_MAKER_LIBRARIES.arduinoUnoPinout,
    TRUSTED_MAKER_LIBRARIES.arduinoLanguageReference,
    TRUSTED_MAKER_LIBRARIES.playfulTechnology,
    profile === "touch"
      ? TRUSTED_MAKER_LIBRARIES.mpr121Guide
      : profile === "relay_maglock"
        ? TRUSTED_MAKER_LIBRARIES.reedSwitchGuide
        : TRUSTED_MAKER_LIBRARIES.sparkfunTutorials,
  ];

  return {
    pinoutTable,
    arduinoCode: buildSketchForProfile(profile, pinoutTable),
    buildDocumentationUrl,
    makerLibraryLinks,
    hardwareProfile: profile,
  };
};

/** @deprecated Use detectSketchProfileLegacy from hardwareProfile.ts */
export const detectSketchProfileFromText = detectSketchProfileLegacy;

export const formatPinoutTableMarkdown = (rows: ArduinoPinoutRow[]): string[] => {
  if (rows.length === 0) return ["_No pinout rows — add wiring diagram lines in the generator._"];
  return [
    "| MCU pin / rail | Role | Connects to |",
    "| --- | --- | --- |",
    ...rows.map((r) => `| ${r.pin.replace(/\|/g, "\\|")} | ${r.function.replace(/\|/g, "\\|")} | ${r.connectsTo.replace(/\|/g, "\\|")} |`),
  ];
};
