import { z } from "zod";
import { HardwareProfileSchema } from "../../../hardwareProfile.js";

/** Step 1 — hardware and physical affordances before any narrative flavor. */
export const DiegeticLayerSchema = z.object({
  hardware_profile: HardwareProfileSchema.describe(
    "Primary electronic mechanic for production firmware routing. For logic/physical puzzles without MCU outputs use generic; for electronic puzzles pick the closest profile (relay_maglock for maglock/strike releases).",
  ),
  hardware_and_electronics: z.object({
    required_components: z.array(z.string()).min(1),
    trigger_mechanism: z.string().min(20),
  }),
  physical_prop_translation: z.object({
    player_action: z.string().min(20),
    prop_design: z.string().min(20),
  }),
});

/** User-facing diegetic core — narrative is last and must pass banned-word checks. */
export const DiegeticPuzzleSchema = z.object({
  hardware_profile: DiegeticLayerSchema.shape.hardware_profile,
  hardware_and_electronics: DiegeticLayerSchema.shape.hardware_and_electronics,
  physical_prop_translation: DiegeticLayerSchema.shape.physical_prop_translation,
  narrative_justification: z.string().min(20),
  banned_word_check: z.boolean(),
});

export const HardwarePinoutMapSchema = z
  .record(z.string(), z.union([z.number().int().min(0).max(53), z.string().min(1)]))
  .refine((map) => Object.keys(map).length >= 1, { message: "At least one pin mapping required." });

export const ElectronicDetailsSchema = z.object({
  hardware_profile: HardwareProfileSchema.describe(
    "Must match Step 1 hardware_profile — drives export firmware template selection.",
  ),
  parts: z.array(z.string()).min(2),
  wiringDiagram: z.array(z.string()).min(2),
  wiringDiagramSvg: z.string(),
  buildSteps: z.array(z.string()).min(2),
  hardware_pinout_map: HardwarePinoutMapSchema.describe(
    "Map each hardware role to an Arduino Uno/Mega pin before writing setup(), e.g. {\"maglock_relay\": 7, \"reed_switch_1\": 2}.",
  ),
  arduinoCode: z
    .string()
    .min(40)
    .describe(
      "Preview firmware using ONLY Arduino core libraries (no Adafruit/ESP/WiFi headers unless that exact module is in parts). Use INPUT_PULLUP for switches, millis() in loop(), no blocking delay() except ≤50 ms debounce.",
    ),
});

/** Step 2 — host-facing presentation derived from the validated physical layer. */
export const PuzzlePresentationSchema = z.object({
  category: z.enum(["logic", "physical", "electronic"]),
  title: z.string().min(3),
  objective: z.string().min(10),
  solveSteps: z.array(z.string()).min(2).max(6),
  narrative_justification: z.string().min(20),
  banned_word_check: z.boolean(),
  themeTags: z.array(z.string()).min(1),
  electronicDetails: ElectronicDetailsSchema.nullable(),
});

export type DiegeticLayer = z.infer<typeof DiegeticLayerSchema>;
export type DiegeticPuzzle = z.infer<typeof DiegeticPuzzleSchema>;
export type PuzzlePresentation = z.infer<typeof PuzzlePresentationSchema>;
