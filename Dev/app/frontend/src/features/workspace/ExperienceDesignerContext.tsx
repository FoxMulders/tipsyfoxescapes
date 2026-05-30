import { createContext, useContext, type ReactNode } from "react";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";
import type { FlowNodeData, ZoneNodeData } from "./generationFlowGraph";
import type { GenerationStatus, RoomData } from "./generation/generationTypes";

export type ComposeActiveStep = "room-details" | "themes";

export type ExperienceDesignerContextValue = {
  roomSkeleton: RoomSkeleton | null;
  generationTelemetry: GenerationTelemetry | null;
  /** Committed room output — Review/Studio gate on this, not loading flags. */
  roomData: RoomData | null;
  hasRoomData: boolean;
  generationStatus: GenerationStatus;
  generationError: string | null;
  generationRetryHint: string | null;
  /** Single source of truth for room-generation UI (button, progress bar, header status). */
  isGenerating: boolean;
  puzzles: PuzzleInspectorSlice[];
  hasBlueprint: boolean;
  canGenerateRoom: boolean;
  generateRoomDisabledReason?: string;
  /** @deprecated Prefer hasRoomData */
  canReview: boolean;
  simpleThemeView: boolean;
  setSimpleThemeView: (v: boolean) => void;
  onGenerateRoom: () => void;
  onGenerateThemes: () => void;
  themesCount: number;
  themeIdeasLoading: boolean;
  canGenerateNewThemes: boolean;
  themePath: "generated" | "custom" | null;
  composeActiveStep: ComposeActiveStep;
  setComposeActiveStep: (step: ComposeActiveStep) => void;
  onSaveRoomDetails: () => Promise<boolean>;
  onTryValidateRoomDetails: () => boolean;
  onPlanningIncomplete: () => void;
  eventSuggestions: string[];
  onOpenReview: () => void;
  onReplacePuzzle: (id: string) => void;
  composeThemeContent: ReactNode;
  curateContent: ReactNode;
  reviewContent: ReactNode;
  selectedThemeId: string;
  navMenu: WorkspaceNavMenuProps;
  selectedThemeName?: string;
  studioInspectorOpen: boolean;
  setStudioInspectorOpen: (open: boolean) => void;
  selectedZone: ZoneNodeData | null;
  selectedPuzzle: PuzzleInspectorSlice | null;
  onNodeSelect: (nodeId: string | null, data: FlowNodeData | null) => void;
  selectedNodeId: string | null;
  layoutRevision: number;
};

const ExperienceDesignerContext = createContext<ExperienceDesignerContextValue | null>(null);

export function ExperienceDesignerProvider({
  value,
  children,
}: {
  value: ExperienceDesignerContextValue;
  children: ReactNode;
}) {
  return <ExperienceDesignerContext.Provider value={value}>{children}</ExperienceDesignerContext.Provider>;
}

export function useExperienceDesigner(): ExperienceDesignerContextValue {
  const ctx = useContext(ExperienceDesignerContext);
  if (!ctx) throw new Error("useExperienceDesigner must be used within ExperienceDesignerProvider");
  return ctx;
}
