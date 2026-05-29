import { z } from "zod";

/** Step 1 — hardware and physical affordances before any narrative flavor. */
export const DiegeticLayerSchema = z.object({
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
  hardware_and_electronics: DiegeticLayerSchema.shape.hardware_and_electronics,
  physical_prop_translation: DiegeticLayerSchema.shape.physical_prop_translation,
  narrative_justification: z.string().min(20),
  banned_word_check: z.boolean(),
});

export const ElectronicDetailsSchema = z.object({
  parts: z.array(z.string()).min(2),
  wiringDiagram: z.array(z.string()).min(2),
  wiringDiagramSvg: z.string(),
  buildSteps: z.array(z.string()).min(2),
  arduinoCode: z.string().min(40),
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
