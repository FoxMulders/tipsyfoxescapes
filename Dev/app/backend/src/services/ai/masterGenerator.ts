/**
 * Tipsy Fox Escapes — Master Generator orchestration.
 * Room skeleton → per-puzzle Logic Compiler → Council of Ten consensus.
 */
import type { TargetInterface } from "../../../../shared/contracts.js";
import {
  applyTargetInterfaceCategoryCounts,
  commercialCompilerSystem,
  homePartyCompilerSystem,
  isHomePartyTarget,
} from "../../generationPolicy.js";
import { COUNCIL_MAX_ITERATIONS, runCouncilOfTen, type CouncilAggregate } from "./councilOfTen.js";
import {
  callOpenAiPuzzles,
  type AiGeneratedPuzzle,
  type CallOpenAiPuzzlesInput,
} from "./puzzles.js";
import { callOpenAiStructured } from "./openaiStructured.js";
import { RoomSkeletonSchema, type RoomSkeleton } from "./schemas/roomSkeleton.js";

export type MasterGeneratorInput = CallOpenAiPuzzlesInput & {
  targetInterface: TargetInterface;
};

export type MasterGeneratorResult = {
  puzzles: AiGeneratedPuzzle[];
  roomSkeleton: RoomSkeleton;
  council: CouncilAggregate | null;
  councilIterations: number;
};

const compileRoomSkeleton = async (
  apiKey: string,
  input: MasterGeneratorInput,
  revisionNotes?: string,
): Promise<RoomSkeleton> => {
  const home = isHomePartyTarget(input.targetInterface);
  const userPrompt = [
    `Theme: "${input.theme.name}"`,
    `Premise: ${input.theme.tldr}`,
    input.theme.description?.trim() ? `Story context:\n${input.theme.description.trim()}` : "",
    `Target: ${input.targetInterface}`,
    `Environment: ${input.planning.environmentType}`,
    `Players concurrent: ${input.planning.playersConcurrent}`,
    `Session minutes: ${input.planning.sessionDurationMinutes}`,
    "",
    "Compile the ARCHITECTURAL SKELETON — physics-first room flow before any narrative flavor.",
    home
      ? "Home party: zones use print_and_play / household props only — no electronics zones."
      : "Commercial venue: zones may include electronic control panels and maglock releases.",
    revisionNotes ? `\nREVISION NOTES FROM COUNCIL:\n${revisionNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return callOpenAiStructured({
    apiKey,
    system: `You are a spatial escape-room architect. Define zone flow and player actions only — no story prose.\n${home ? homePartyCompilerSystem : commercialCompilerSystem}`,
    user: userPrompt,
    schema: RoomSkeletonSchema,
    schemaName: "room_skeleton",
    temperature: 0.55,
    maxTokens: 1400,
  });
};

/** Step 0 only — spatial skeleton without puzzle compile or council (trial / preview visibility). */
export const compileRoomSkeletonOnly = async (input: MasterGeneratorInput): Promise<RoomSkeleton> =>
  compileRoomSkeleton(input.apiKey, input);

export const runMasterGenerator = async (input: MasterGeneratorInput): Promise<MasterGeneratorResult> => {
  const adjustedCounts = applyTargetInterfaceCategoryCounts(input.categoryCounts, input.targetInterface);
  let revisionNotes = "";
  let council: CouncilAggregate | null = null;
  let puzzles: AiGeneratedPuzzle[] = [];
  let roomSkeleton: RoomSkeleton | null = null;
  let councilIterations = 0;

  for (let iteration = 0; iteration < COUNCIL_MAX_ITERATIONS; iteration += 1) {
    councilIterations = iteration + 1;
    roomSkeleton = await compileRoomSkeleton(input.apiKey, input, revisionNotes || undefined);
    puzzles = await callOpenAiPuzzles({
      ...input,
      categoryCounts: adjustedCounts,
      targetInterface: input.targetInterface,
      roomSkeleton,
      compilerRevisionNotes: revisionNotes || undefined,
    });

    council = await runCouncilOfTen(input.apiKey, {
      themeName: input.theme.name,
      targetInterface: input.targetInterface,
      roomSkeleton,
      puzzles,
    });

    if (council.passed) break;
    revisionNotes = council.revisionNotes;
    if (iteration === COUNCIL_MAX_ITERATIONS - 1) {
      console.warn(
        `[master-generator] Council consensus not reached after ${COUNCIL_MAX_ITERATIONS} iterations (avg=${council.averageScore.toFixed(2)}, wow=${council.wowCount}/10). Shipping best effort.`,
      );
    }
  }

  return {
    puzzles,
    roomSkeleton: roomSkeleton!,
    council,
    councilIterations,
  };
};
