import { z } from "zod";

/** Production firmware templates in arduinoResourceRouter — must stay in sync. */
export const HARDWARE_PROFILES = [
  "button_led",
  "buzzer",
  "touch",
  "rfid",
  "relay_maglock",
  "analog_sensor",
  "generic",
] as const;

export type HardwareProfile = (typeof HARDWARE_PROFILES)[number];

export const HardwareProfileSchema = z.enum(HARDWARE_PROFILES);

export const HARDWARE_PROFILE_LABELS: Record<HardwareProfile, string> = {
  button_led: "Push button + status LED feedback",
  buzzer: "Tone / buzzer pattern output",
  touch: "MPR121 capacitive touch pads",
  rfid: "MFRC522 RFID tag sequence",
  relay_maglock: "Relay-driven maglock / strike release",
  analog_sensor: "Analog threshold sensor (LDR, pressure, pot)",
  generic: "Non-MCU or unspecified digital output",
};

/** Human-written pool entries from puzzlePoolByCategory — preserve bespoke firmware at export. */
export const isStaticCatalogPuzzle = (puzzle: {
  id: string;
  isStaticCatalog?: boolean;
}): boolean => {
  if (puzzle.isStaticCatalog === true) return true;
  if (puzzle.isStaticCatalog === false) return false;
  return /^pz_(logic|physical|electronic)_/.test(puzzle.id);
};

export const markStaticCatalogPuzzle = <T>(puzzle: T): T & { isStaticCatalog: true } => ({
  ...puzzle,
  isStaticCatalog: true,
});

export const resolveHardwareProfile = (
  explicit: HardwareProfile | undefined,
  wiringDiagram: string[],
  parts: string[],
): HardwareProfile => explicit ?? detectSketchProfileLegacy(wiringDiagram, parts);

/** Legacy text heuristics for saved puzzles missing hardware_profile. */
export const detectSketchProfileLegacy = (
  wiringDiagram: string[],
  parts: string[],
): HardwareProfile => {
  const blob = `${wiringDiagram.join(" ")} ${parts.join(" ")}`.toLowerCase();
  if (/\bmpr121\b|\bcapacitive touch\b/.test(blob)) return "touch";
  if (/\bmfrc522\b|\brfid\b/.test(blob)) return "rfid";
  if (/\bmaglock\b|\breed switch\b|\brelay module\b|\brelay\b/.test(blob)) return "relay_maglock";
  if (/\banalog\b|\bldr\b|\bphotoresistor\b|\bfsr\b|\bpressure sensor\b/.test(blob)) return "analog_sensor";
  if (/\bbuzzer\b|\btone\b|\bpiezo\b/.test(blob)) return "buzzer";
  if (/\bbutton\b|\bswitch\b/.test(blob) && /\bled\b/.test(blob)) return "button_led";
  return "generic";
};
