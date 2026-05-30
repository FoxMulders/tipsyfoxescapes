import {
  auditBareMechanicalPlayerCopy,
  auditThematicIntegrity,
} from "../../../../../shared/qa/narrativeIntegrityRules";
import type { PuzzleInspectorSlice } from "../WorkspaceInspectorPanel";
import { generationToFlowGraph, layoutHasCollisionViolations } from "../generationFlowGraph";
import type {
  GenerationContext,
  RoomBriefContext,
  RoomData,
  RoomDataValidationResult,
  ThemeContext,
} from "./generationTypes";
import type { RoomSkeleton } from "../../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";

const GENERIC_PLACEHOLDER =
  /\b(your theme|the room|escape room|puzzle slot|placeholder|generic logic|generic physical)\b/i;

export function buildGenerationContext(roomBrief: RoomBriefContext, theme: ThemeContext): GenerationContext {
  if (!theme.id.trim() || !theme.name.trim()) {
    throw new Error("Theme context is required before generation.");
  }
  return { roomBrief, theme };
}

function auditPuzzlesForThematicIntegrity(
  puzzles: PuzzleInspectorSlice[],
  theme: ThemeContext,
): string[] {
  const errors: string[] = [];
  const tags = theme.tags ?? [];

  for (const puzzle of puzzles) {
    const playerFields = [
      { field: "objective", text: puzzle.objective },
      ...(puzzle.narrativeHook ? [{ field: "narrativeHook", text: puzzle.narrativeHook }] : []),
    ];

    for (const { field, text } of playerFields) {
      if (GENERIC_PLACEHOLDER.test(text)) {
        errors.push(
          `${puzzle.title}: ${field} contains generic placeholder copy — use specific "${theme.name}" terminology (props, characters, setting).`,
        );
      }
    }

    const corpus = playerFields.map((f) => f.text).join("\n");
    for (const issue of auditThematicIntegrity(corpus, theme.name, tags, ["objective"])) {
      if (issue.severity === "error") errors.push(`${puzzle.title}: ${issue.message}`);
    }
    for (const issue of auditBareMechanicalPlayerCopy(playerFields)) {
      if (issue.severity === "error") errors.push(`${puzzle.title}: ${issue.message}`);
    }
    if (puzzle.narrativeHook && puzzle.narrativeHook.trim().length < 12) {
      errors.push(`${puzzle.title}: Narrative hook is too short — explain the in-world "why" using "${theme.name}" details.`);
    }
  }

  return errors;
}

function verifyLayoutSafety(
  skeleton: RoomSkeleton,
  puzzles: PuzzleInspectorSlice[],
  viewportWidth: number,
): { layoutMode: "grid" | "linear"; errors: string[] } {
  const graph = generationToFlowGraph(skeleton, puzzles, { viewportWidth });
  if (graph.layoutMode === "grid" && layoutHasCollisionViolations(graph.nodes)) {
    return {
      layoutMode: graph.layoutMode,
      errors: ["Flowchart layout has overlapping nodes — generation cannot be marked complete."],
    };
  }
  return { layoutMode: graph.layoutMode, errors: [] };
}

/** Pre-render gate: thematic integrity + collision-free layout before status → complete. */
export function validateRoomDataForComplete(input: {
  skeleton: RoomSkeleton | null;
  puzzles: PuzzleInspectorSlice[];
  theme: ThemeContext | null;
  roomBrief: RoomBriefContext | null;
  telemetry: GenerationTelemetry | null;
  viewportWidth?: number;
}): RoomDataValidationResult {
  const { skeleton, puzzles, theme, roomBrief, telemetry, viewportWidth = 1280 } = input;

  if (!theme?.id.trim() || !theme.name.trim()) {
    return { ok: false, errors: ["A theme must be selected before room data can be committed."] };
  }
  if (!roomBrief) {
    return { ok: false, errors: ["Room brief is incomplete — finish Compose room details first."] };
  }
  if (!skeleton?.zones?.length) {
    return { ok: false, errors: ["Room skeleton has no zones."] };
  }
  if (!puzzles.length) {
    return { ok: false, errors: ["Puzzle set is empty."] };
  }

  const thematicErrors = auditPuzzlesForThematicIntegrity(puzzles, theme);
  if (thematicErrors.length > 0) {
    return {
      ok: false,
      errors: thematicErrors,
      retryHint: `Regenerate using specific "${theme.name}" terminology — no generic placeholders, maglocks, or RFID in player-facing copy. Every puzzle needs a Narrative Hook first.`,
    };
  }

  const layout = verifyLayoutSafety(skeleton, puzzles, viewportWidth);
  if (layout.errors.length > 0) {
    return { ok: false, errors: layout.errors };
  }

  const generationContext = buildGenerationContext(roomBrief, theme);
  const roomData: RoomData = {
    skeleton,
    puzzles,
    theme,
    telemetry,
    layoutMode: layout.layoutMode,
    generationContext,
  };

  return { ok: true, roomData };
}

export function hasRoomData(roomData: RoomData | null): roomData is RoomData {
  return roomData !== null;
}
