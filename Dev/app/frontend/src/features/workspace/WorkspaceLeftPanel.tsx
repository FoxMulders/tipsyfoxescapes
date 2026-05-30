import type { ReactNode } from "react";
import { RoomConfigurationPanel } from "@/features/planning/components/RoomConfigurationPanel";
import type { WorkspaceStepId } from "./workspaceSteps";

type WorkspaceLeftPanelProps = {
  step: WorkspaceStepId;
  flowWizardStep: string;
  eventSuggestions: string[];
  itemHistory: string[];
  onOpenInspiration: () => void;
  onGenerateSkeleton: () => void;
  skeletonBusy?: boolean;
  skeletonSummary?: string | null;
  onGeneratePuzzles: () => void;
  puzzlesGenerating: boolean;
  canGeneratePuzzles: boolean;
  onContinueConstraints?: () => void;
  onContinueReview?: () => void;
  extraContent?: ReactNode;
};

export function WorkspaceLeftPanel({
  step,
  flowWizardStep,
  eventSuggestions,
  itemHistory,
  onOpenInspiration,
  onGenerateSkeleton,
  skeletonBusy,
  skeletonSummary,
  onGeneratePuzzles,
  puzzlesGenerating,
  canGeneratePuzzles,
  onContinueConstraints,
  onContinueReview,
  extraContent,
}: WorkspaceLeftPanelProps) {
  switch (step) {
    case "constraints":
      if (flowWizardStep === "themes" && extraContent) {
        return <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">{extraContent}</div>;
      }
      return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <ConstraintsPanel
            eventSuggestions={eventSuggestions}
            itemHistory={itemHistory}
            onOpenInspiration={onOpenInspiration}
            onContinue={onContinueConstraints}
          />
          {extraContent ? <div className="min-h-0 flex-1 overflow-auto border-t border-slate-800/80 pt-3">{extraContent}</div> : null}
        </div>
      );
    case "spatial":
      return (
        <div className="flex h-full flex-col gap-3 overflow-auto p-1">
          <header>
            <h2 className="m-0 text-base font-bold text-slate-50">Spatial layout</h2>
            <p className="mt-1 mb-0 text-sm text-slate-400">Generate an architectural skeleton from your constraints.</p>
          </header>
          {skeletonSummary ? (
            <p className="m-0 rounded-lg border border-cyan-500/25 bg-cyan-950/25 p-2.5 text-xs leading-relaxed text-slate-300">{skeletonSummary}</p>
          ) : null}
          <button type="button" className="primary-btn w-full" disabled={skeletonBusy} onClick={onGenerateSkeleton}>
            {skeletonBusy ? "Generating skeleton…" : "Generate architectural skeleton"}
          </button>
          <p className="m-0 text-xs text-slate-500">Zones appear on the canvas as draggable nodes. Tap a zone to inspect details.</p>
        </div>
      );
    case "puzzles":
      return (
        <div className="flex h-full flex-col gap-3 overflow-auto p-1">
          <header>
            <h2 className="m-0 text-base font-bold text-slate-50">Puzzle generation</h2>
            <p className="mt-1 mb-0 text-sm text-slate-400">Build a varied puzzle set aligned to your theme and room flow.</p>
          </header>
          <button
            type="button"
            className="primary-btn w-full"
            disabled={!canGeneratePuzzles || puzzlesGenerating}
            onClick={onGeneratePuzzles}
          >
            {puzzlesGenerating ? "Generating puzzles…" : "Generate puzzle set"}
          </button>
          {extraContent ? <div className="min-h-0 flex-1 overflow-auto">{extraContent}</div> : null}
        </div>
      );
    case "review":
      return (
        <div className="flex h-full flex-col gap-3 overflow-auto p-1">
          <header>
            <h2 className="m-0 text-base font-bold text-slate-50">Final review</h2>
            <p className="mt-1 mb-0 text-sm text-slate-400">Validate puzzles, storyline, and export when ready.</p>
          </header>
          {onContinueReview ? (
            <button type="button" className="primary-btn w-full" onClick={onContinueReview}>
              Open output review →
            </button>
          ) : null}
        </div>
      );
    default:
      return null;
  }
}

function ConstraintsPanel({
  eventSuggestions,
  itemHistory,
  onOpenInspiration,
  onContinue,
}: {
  eventSuggestions: string[];
  itemHistory: string[];
  onOpenInspiration: () => void;
  onContinue?: () => void;
}) {
  return (
    <div className="workspace-constraints-panel flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <RoomConfigurationPanel
          eventSuggestions={eventSuggestions}
          itemHistory={itemHistory}
          onOpenInspiration={onOpenInspiration}
        />
      </div>
      {onContinue ? (
        <button type="button" className="primary-btn w-full shrink-0" onClick={onContinue}>
          Continue to themes →
        </button>
      ) : null}
    </div>
  );
}
