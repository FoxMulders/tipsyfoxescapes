import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import type { RoomSkeleton } from "../../../../../shared/roomSkeleton";
import type { PuzzleInspectorSlice } from "../WorkspaceInspectorPanel";

export type GenerationStatus = "idle" | "generating" | "complete" | "error";

/** Rigid planning context passed into every generation request. */
export type RoomBriefContext = {
  playersConcurrent: number;
  participantsTotal: number;
  sessionDurationMinutes: number;
  environmentType: string;
  availableItems: string;
  eventType?: string;
};

/** Locked theme context — generation must not proceed without this. */
export type ThemeContext = {
  id: string;
  name: string;
  tags?: string[];
  description?: string;
};

export type GenerationContext = {
  roomBrief: RoomBriefContext;
  theme: ThemeContext;
};

/** Committed room output — Review and Studio read from this, not loading flags. */
export type RoomData = {
  skeleton: RoomSkeleton;
  puzzles: PuzzleInspectorSlice[];
  theme: ThemeContext;
  telemetry: GenerationTelemetry | null;
  layoutMode: "grid" | "linear";
  generationContext: GenerationContext;
};

export type RoomDataValidationResult =
  | { ok: true; roomData: RoomData }
  | { ok: false; errors: string[]; retryHint?: string };
