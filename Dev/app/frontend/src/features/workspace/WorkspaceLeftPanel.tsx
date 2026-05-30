import type { ReactNode } from "react";
import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";
import { RoomConfigurationPanel } from "@/features/planning/components/RoomConfigurationPanel";
import { WorkspaceBriefPanel } from "./WorkspaceBriefPanel";
import type { LayoutStylePreference, WorkspaceStepId } from "./workspaceSteps";

type WorkspaceLeftPanelProps = {
  step: WorkspaceStepId;
  layoutStyle: LayoutStylePreference;
  onLayoutStyleChange: (style: LayoutStylePreference) => void;
  venueSummary?: string;
  canGenerateRoom: boolean;
  generateRoomDisabledReason?: string;
  puzzlesGenerating: boolean;
  onGenerateRoom: () => void;
  onOpenReview?: () => void;
  briefThemeContent?: ReactNode;
  blueprintExtra?: ReactNode;
  puzzleCount: number;
  flowSummary?: string | null;
  eventSuggestions?: string[];
  itemHistory?: string[];
  onOpenInspiration?: () => void;
};

export function WorkspaceLeftPanel({
  step,
  layoutStyle,
  onLayoutStyleChange,
  venueSummary,
  canGenerateRoom,
  generateRoomDisabledReason,
  puzzlesGenerating,
  onGenerateRoom,
  onOpenReview,
  briefThemeContent,
  blueprintExtra,
  puzzleCount,
  flowSummary,
  eventSuggestions = [],
  itemHistory = [],
  onOpenInspiration,
}: WorkspaceLeftPanelProps) {
  switch (step) {
    case "brief":
    case "generating":
      return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <div className="min-h-0 max-h-[38%] shrink-0 overflow-auto border-b border-slate-800/80 pb-3">
            <RoomConfigurationPanel
              eventSuggestions={eventSuggestions}
              itemHistory={itemHistory}
              onOpenInspiration={onOpenInspiration ?? (() => undefined)}
            />
          </div>
          <WorkspaceBriefPanel
            layoutStyle={layoutStyle}
            onLayoutStyleChange={onLayoutStyleChange}
            venueSummary={venueSummary}
            themeContent={briefThemeContent}
            canGenerate={canGenerateRoom}
            generateDisabledReason={generateRoomDisabledReason}
            generating={puzzlesGenerating}
            onGenerateRoom={onGenerateRoom}
          />
          {step === "generating" ? (
            <GenerationProgressIndicator active phases={PUZZLE_GENERATION_PHASES} className="generation-progress-indicator--compact shrink-0" />
          ) : null}
        </div>
      );
    case "blueprint":
      return (
        <div className="flex h-full flex-col gap-3 overflow-auto p-1">
          <header>
            <h2 className="m-0 text-base font-bold text-slate-50">Interactive blueprint</h2>
            <p className="mt-1 mb-0 text-sm text-slate-400">
              {puzzleCount} puzzle{puzzleCount === 1 ? "" : "s"} mapped across your generated logic tree. Drag nodes to rearrange.
            </p>
          </header>
          {flowSummary ? (
            <p className="m-0 rounded-lg border border-cyan-500/25 bg-cyan-950/25 p-2.5 text-xs leading-relaxed text-slate-300">{flowSummary}</p>
          ) : null}
          {blueprintExtra ? <div className="min-h-0 flex-1 overflow-auto">{blueprintExtra}</div> : null}
          {onOpenReview ? (
            <button type="button" className="primary-btn w-full shrink-0" onClick={onOpenReview}>
              Open output review →
            </button>
          ) : null}
        </div>
      );
    case "review":
      return (
        <div className="flex h-full flex-col gap-3 overflow-auto p-1">
          <header>
            <h2 className="m-0 text-base font-bold text-slate-50">Final review</h2>
            <p className="mt-1 mb-0 text-sm text-slate-400">Validate puzzles, storyline, and export when ready.</p>
          </header>
          {onOpenReview ? (
            <button type="button" className="primary-btn w-full" onClick={onOpenReview}>
              Open output review →
            </button>
          ) : null}
        </div>
      );
    default:
      return null;
  }
}
