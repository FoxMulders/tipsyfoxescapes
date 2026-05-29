/**
 * Diegetic Logic Compiler — multi-step OpenAI puzzle generation.
 * Physical/hardware mechanics are compiled before narrative flavor.
 */

import { auditPuzzleQa, type PuzzleForQa } from "../../puzzleQa.js";
import { auditArduinoPreviewFirmware, formatPinoutMapComment } from "../../firmwarePreviewValidation.js";
import type { HardwareProfile } from "../../hardwareProfile.js";
import {
  assertHomePartyHardwareProfile,
  commercialCompilerSystem,
  homePartyCompilerSystem,
  isHomePartyTarget,
} from "../../generationPolicy.js";
import { PUZZLE_GENERATION_INVENTORY_POLICY } from "../../puzzleManufacturingSchema.js";
import { assembleDiegeticPuzzle, validateDiegeticFields } from "./diegeticValidation.js";
import { STEP2_FIRMWARE_SYSTEM } from "./firmwarePreviewPrompt.js";
import { callOpenAiStructured } from "./openaiStructured.js";
import type { RoomSkeleton } from "./schemas/roomSkeleton.js";
import type { TargetInterface } from "../../../../shared/contracts.js";
import {
  DiegeticLayerSchema,
  PuzzlePresentationSchema,
  type DiegeticLayer,
  type PuzzlePresentation,
} from "./schemas/diegeticPuzzle.js";

export type AiGeneratedPuzzle = {
  id: string;
  category: "logic" | "physical" | "electronic";
  themeTags: string[];
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  referenceLinks: [];
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  audienceTrack: "main";
  isStaticCatalog?: false;
  hardware_profile?: HardwareProfile;
  narrative_justification?: string;
  bill_of_materials?: string[];
  required_parts_and_props?: string[];
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    wiringDiagramSvg: string;
    buildSteps: string[];
    arduinoCode: string;
    hardware_profile?: HardwareProfile;
  };
};

export type AiPuzzlePlanningContext = {
  environmentType: string;
  availableItems: string[];
  playersConcurrent: number;
  sessionDurationMinutes: number;
  eventType?: string;
};

export type AiPuzzleThemeContext = {
  name: string;
  tldr: string;
};

export type CallOpenAiPuzzlesInput = {
  apiKey: string;
  theme: AiPuzzleThemeContext;
  planning: AiPuzzlePlanningContext;
  categoryCounts: { logic: number; physical: number; electronic: number };
  targetDifficulty: "easy" | "medium" | "hard";
  targetInterface?: TargetInterface;
  roomSkeleton?: RoomSkeleton;
  compilerRevisionNotes?: string;
  allocateId: () => string;
};

const COMPILER_MAX_ATTEMPTS = 3;
const QA_MAX_ATTEMPTS = 2;

const COMPILER_SYSTEM = `You are a diegetic escape-room logic compiler.
RULES (non-negotiable):
- Design REAL physical affordances first: mass, latch travel, light paths, conductivity, alignment, pour volume, magnetic coupling.
- NEVER use generic tropes: cipher charts, padlocks as default locks, "represents", "symbolizes", "simulates", "stands for".
- Every mechanism must be buildable with the host's listed props or common maker parts.
- solveSteps must contain EXACT player-facing text, numbers, or symbols — no placeholders.
- For electronic puzzles include a working Arduino sketch (setup() + non-empty loop()) and wiring lines.
- Set banned_word_check=true ONLY when all copy avoids banned tropes.`;

const buildPlanningBlock = (
  planning: AiPuzzlePlanningContext,
  difficulty: string,
  targetInterface?: TargetInterface,
): string => {
  const items =
    planning.availableItems.length > 0 ? planning.availableItems.join(", ") : "common household items";
  return [
    `Environment: ${planning.environmentType || "home living room"}`,
    `Target interface: ${targetInterface ?? "home_party"}`,
    `Props available: ${items}`,
    `Players: ${planning.playersConcurrent} concurrent`,
    `Session length: ${planning.sessionDurationMinutes} min`,
    `Difficulty: ${difficulty}`,
    planning.eventType ? `Event context: ${planning.eventType}` : "",
    "",
    PUZZLE_GENERATION_INVENTORY_POLICY,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildHowItWorks = (layer: DiegeticLayer): string => {
  const { prop_design, player_action } = layer.physical_prop_translation;
  const { trigger_mechanism } = layer.hardware_and_electronics;
  return [
    `Prop: ${prop_design}`,
    `Interaction: ${player_action}`,
    `Mechanism: ${trigger_mechanism}`,
  ].join(" ");
};

const mapToPuzzle = (
  layer: DiegeticLayer,
  presentation: PuzzlePresentation,
  id: string,
  difficulty: "easy" | "medium" | "hard",
): AiGeneratedPuzzle => ({
  id,
  category: presentation.category,
  themeTags: presentation.themeTags,
  title: presentation.title.trim(),
  objective: presentation.objective.trim(),
  howItWorks: buildHowItWorks(layer),
  narrative_justification: presentation.narrative_justification.trim(),
  bill_of_materials: [...layer.hardware_and_electronics.required_components],
  required_parts_and_props: [...layer.hardware_and_electronics.required_components],
  solveSteps: presentation.solveSteps.map((s) => s.trim()),
  referenceLinks: [],
  difficulty,
  audienceTrack: "main",
  isStaticCatalog: false,
  hardware_profile: layer.hardware_profile,
  electronicDetails:
    presentation.category === "electronic" && presentation.electronicDetails
      ? {
          hardware_profile: presentation.electronicDetails.hardware_profile,
          parts: presentation.electronicDetails.parts,
          wiringDiagram: presentation.electronicDetails.wiringDiagram,
          wiringDiagramSvg: presentation.electronicDetails.wiringDiagramSvg,
          buildSteps: presentation.electronicDetails.buildSteps,
          arduinoCode:
            formatPinoutMapComment(presentation.electronicDetails.hardware_pinout_map) +
            presentation.electronicDetails.arduinoCode,
        }
      : undefined,
});

type CompilerContext = {
  targetInterface?: TargetInterface;
  roomSkeleton?: RoomSkeleton;
  revisionNotes?: string;
};

const compileDiegeticLayer = async (
  apiKey: string,
  theme: AiPuzzleThemeContext,
  planning: AiPuzzlePlanningContext,
  category: "logic" | "physical" | "electronic",
  difficulty: string,
  ctx: CompilerContext,
  feedback?: string,
): Promise<DiegeticLayer> => {
  const home = isHomePartyTarget(ctx.targetInterface);
  const userPrompt = [
    `Theme: "${theme.name}"`,
    `Theme premise: ${theme.tldr}`,
    buildPlanningBlock(planning, difficulty, ctx.targetInterface),
    ctx.roomSkeleton ? `\nApproved room skeleton:\n${JSON.stringify(ctx.roomSkeleton, null, 2)}` : "",
    "",
    `Compile STEP 1 — diegetic hardware/physical layer for ONE ${category} puzzle.`,
    "Output ONLY the physical affordances and trigger mechanism — NO narrative flavor yet.",
    home
      ? "Set hardware_profile to print_and_play (household props, paper clues, padlocks — no MCU)."
      : category === "electronic"
        ? "Set hardware_profile to the primary MCU mechanic (relay_maglock for maglock/strike, touch, rfid, button_led, buzzer, analog_sensor)."
        : "Set hardware_profile to generic or print_and_play when no MCU is required.",
    ctx.revisionNotes ? `\nCOUNCIL REVISION NOTES:\n${ctx.revisionNotes}` : "",
    feedback ? `\nREVISION NOTES:\n${feedback}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return callOpenAiStructured({
    apiKey,
    system: `${COMPILER_SYSTEM}\n\n${home ? homePartyCompilerSystem : commercialCompilerSystem}`,
    user: userPrompt,
    schema: DiegeticLayerSchema,
    schemaName: "diegetic_layer",
    temperature: 0.65,
    maxTokens: 1200,
  });
};

const compilePuzzlePresentation = async (
  apiKey: string,
  theme: AiPuzzleThemeContext,
  planning: AiPuzzlePlanningContext,
  category: "logic" | "physical" | "electronic",
  difficulty: string,
  layer: DiegeticLayer,
  ctx: CompilerContext,
  feedback?: string,
): Promise<PuzzlePresentation> => {
  const home = isHomePartyTarget(ctx.targetInterface);
  const userPrompt = [
    `Theme: "${theme.name}"`,
    `Theme premise: ${theme.tldr}`,
    buildPlanningBlock(planning, difficulty, ctx.targetInterface),
    ctx.roomSkeleton ? `\nApproved room skeleton:\n${JSON.stringify(ctx.roomSkeleton, null, 2)}` : "",
    "",
    `Compile STEP 2 — host-facing presentation for ONE ${category} puzzle.`,
    "Derive title, objective, solveSteps, and narrative_justification ONLY from this validated physical layer:",
    JSON.stringify(layer, null, 2),
    "",
    "narrative_justification MUST explain why this exact mechanism exists in the room fiction.",
    "Do NOT use: represents, symbolizes, simulates, cipher chart, padlock.",
    "Set banned_word_check=true only when all strings avoid those tropes.",
    home
      ? "Home party: set electronicDetails to null; hardware_profile stays print_and_play."
      : category === "electronic"
        ? "Include electronicDetails with hardware_profile matching Step 1, hardware_pinout_map, parts, wiringDiagram, buildSteps, and preview arduinoCode per firmware rules."
        : "Set electronicDetails to null.",
    ctx.revisionNotes ? `\nCOUNCIL REVISION NOTES:\n${ctx.revisionNotes}` : "",
    feedback ? `\nREVISION NOTES:\n${feedback}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return callOpenAiStructured({
    apiKey,
    system: `${COMPILER_SYSTEM}\n\n${home ? homePartyCompilerSystem : `${commercialCompilerSystem}\n\n${STEP2_FIRMWARE_SYSTEM}`}`,
    user: userPrompt,
    schema: PuzzlePresentationSchema,
    schemaName: "puzzle_presentation",
    temperature: 0.75,
    maxTokens: 3200,
  });
};

const validateCompiledPuzzle = (
  layer: DiegeticLayer,
  presentation: PuzzlePresentation,
  targetInterface?: TargetInterface,
): { ok: true } | { ok: false; message: string } => {
  const home = isHomePartyTarget(targetInterface);
  if (home) {
    const homeErr = assertHomePartyHardwareProfile(layer.hardware_profile);
    if (homeErr) return { ok: false, message: homeErr };
    if (presentation.category === "electronic") {
      return { ok: false, message: "Home party mode must not emit electronic category puzzles." };
    }
    if (presentation.electronicDetails) {
      return { ok: false, message: "Home party mode must not include electronicDetails / firmware." };
    }
  }

  if (presentation.category === "electronic" && !presentation.electronicDetails) {
    return { ok: false, message: "Electronic puzzle missing electronicDetails." };
  }

  const diegeticCheck = assembleDiegeticPuzzle({
    layer,
    narrative_justification: presentation.narrative_justification,
    banned_word_check: presentation.banned_word_check,
  });
  if (!diegeticCheck.ok) {
    return { ok: false, message: diegeticCheck.message };
  }

  const presentationCheck = validateDiegeticFields(
    [
      { field: "title", text: presentation.title },
      { field: "objective", text: presentation.objective },
      ...presentation.solveSteps.map((text, i) => ({ field: `solveSteps[${i}]`, text })),
    ],
    presentation.banned_word_check,
  );
  if (!presentationCheck.ok) {
    return { ok: false, message: presentationCheck.message };
  }

  if (presentation.category === "electronic" && presentation.electronicDetails) {
    if (layer.hardware_profile !== presentation.electronicDetails.hardware_profile) {
      return {
        ok: false,
        message: `hardware_profile mismatch: Step 1="${layer.hardware_profile}" vs Step 2="${presentation.electronicDetails.hardware_profile}".`,
      };
    }
    if (layer.hardware_profile === "generic") {
      return { ok: false, message: "Electronic puzzles must declare a specific hardware_profile, not generic." };
    }
    const firmwareIssues = auditArduinoPreviewFirmware(
      presentation.electronicDetails.arduinoCode,
      presentation.electronicDetails.parts,
    );
    if (firmwareIssues.length > 0) {
      return { ok: false, message: firmwareIssues.map((i) => i.message).join(" ") };
    }
  }

  return { ok: true };
};

const compileSinglePuzzle = async (
  input: CallOpenAiPuzzlesInput,
  category: "logic" | "physical" | "electronic",
): Promise<AiGeneratedPuzzle | null> => {
  const { apiKey, theme, planning, targetDifficulty, allocateId, targetInterface, roomSkeleton, compilerRevisionNotes } =
    input;
  const ctx: CompilerContext = { targetInterface, roomSkeleton, revisionNotes: compilerRevisionNotes };
  let feedback = "";

  for (let qaPass = 0; qaPass < QA_MAX_ATTEMPTS; qaPass += 1) {
    for (let attempt = 0; attempt < COMPILER_MAX_ATTEMPTS; attempt += 1) {
      try {
        const layer = await compileDiegeticLayer(
          apiKey,
          theme,
          planning,
          category,
          targetDifficulty,
          ctx,
          feedback || undefined,
        );
        const presentation = await compilePuzzlePresentation(
          apiKey,
          theme,
          planning,
          category,
          targetDifficulty,
          layer,
          ctx,
          feedback || undefined,
        );

        if (presentation.category !== category) {
          feedback = `Category must remain "${category}" but got "${presentation.category}".`;
          continue;
        }

        const validation = validateCompiledPuzzle(layer, presentation, targetInterface);
        if (!validation.ok) {
          feedback = validation.message;
          continue;
        }

        const puzzle = mapToPuzzle(layer, presentation, allocateId(), targetDifficulty);
        const qaReport = auditPuzzleQa(puzzle as PuzzleForQa, {
          themeName: theme.name,
          strict: true,
        });

        if (!qaReport.passed) {
          const errors = qaReport.issues
            .filter((i) => i.severity === "error")
            .map((i) => `${i.code}: ${i.message}`)
            .join("; ");
          feedback = errors || "Puzzle QA gate failed.";
          break;
        }

        return puzzle;
      } catch (err) {
        feedback = err instanceof Error ? err.message : String(err);
      }
    }
  }

  console.warn(`[logic-compiler] Failed to compile ${category} puzzle for "${theme.name}": ${feedback}`);
  return null;
};

/**
 * Multi-step Logic Compiler entry point.
 * Falls back to partial set when individual slots fail after retry loops.
 */
export const callOpenAiPuzzles = async (input: CallOpenAiPuzzlesInput): Promise<AiGeneratedPuzzle[]> => {
  const { categoryCounts } = input;
  const totalCount = categoryCounts.logic + categoryCounts.physical + categoryCounts.electronic;
  if (totalCount === 0) return [];

  const slots: Array<"logic" | "physical" | "electronic"> = [
    ...Array.from({ length: categoryCounts.logic }, () => "logic" as const),
    ...Array.from({ length: categoryCounts.physical }, () => "physical" as const),
    ...Array.from({ length: categoryCounts.electronic }, () => "electronic" as const),
  ];

  const puzzles: AiGeneratedPuzzle[] = [];
  for (const category of slots) {
    const compiled = await compileSinglePuzzle(input, category);
    if (compiled) puzzles.push(compiled);
  }

  if (puzzles.length === 0) {
    throw new Error("Logic compiler produced no puzzles after validation loops");
  }

  return puzzles;
};
