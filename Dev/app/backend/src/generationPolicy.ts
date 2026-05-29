/**
 * Master Generator — home vs commercial output branching.
 */
import type { TargetInterface } from "../../shared/contracts.js";
import type { HardwareProfile } from "./hardwareProfile.js";

export type CategoryTriple = { logic: number; physical: number; electronic: number };

export const HOME_PARTY_HARDWARE_PROFILES: HardwareProfile[] = ["print_and_play", "generic"];

export const COMMERCIAL_ELECTRONIC_PROFILES: HardwareProfile[] = [
  "button_led",
  "buzzer",
  "touch",
  "rfid",
  "relay_maglock",
  "analog_sensor",
  "generic",
];

export const applyTargetInterfaceCategoryCounts = (
  counts: CategoryTriple,
  targetInterface: TargetInterface,
): CategoryTriple => {
  if (targetInterface !== "home_party") return counts;
  const electronic = counts.electronic;
  if (electronic === 0) return counts;
  return {
    logic: counts.logic,
    physical: counts.physical + electronic,
    electronic: 0,
  };
};

export const isHomePartyTarget = (targetInterface: TargetInterface | undefined): boolean =>
  targetInterface === "home_party";

export const homePartyCompilerSystem = [
  "HOME PARTY MODE (strict):",
  "Do NOT design Arduino, maglocks, RFID readers, or any wired electronics.",
  "Every puzzle hardware_profile MUST be print_and_play or generic.",
  "Use paper ciphers, hidden objects, padlocks, household props, and printable clue media only.",
  "Narrative must treat these physical props as the actual in-fiction mechanism — never as stand-ins for electronics.",
].join("\n");

export const commercialCompilerSystem = [
  "COMMERCIAL VENUE MODE:",
  "You may design Arduino-driven beats with relay_maglock, touch, rfid, and related hardware_profile values.",
  "Electronic puzzles must include maker-ready wiring and preview firmware per firmware rules.",
].join("\n");

export const assertHomePartyHardwareProfile = (profile: HardwareProfile): string | null => {
  if (HOME_PARTY_HARDWARE_PROFILES.includes(profile)) return null;
  return `Home party mode forbids hardware_profile "${profile}" — use print_and_play.`;
};
