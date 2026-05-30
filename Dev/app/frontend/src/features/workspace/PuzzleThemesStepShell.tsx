import type { ReactNode } from "react";
import { Suspense, lazy } from "react";
import { CouncilTelemetryPanel } from "@/features/planning/components/GenerationTelemetryPanel";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import { PuzzleStepPortalOrStatic } from "./PuzzleStepPortalOrStatic";

const BlueprintWorkspace = lazy(() =>
  import("@/features/planning/components/BlueprintWorkspace").then((m) => ({ default: m.BlueprintWorkspace })),
);

type PuzzleThemesStepShellProps = {
  persistent: boolean;
  children: ReactNode;
  serverOpenAiConfigured: boolean | null;
  browserAiReady: boolean;
  lastRoomSkeleton: RoomSkeleton | null;
  puzzlesGenerating: boolean;
  generationTelemetry: GenerationTelemetry | null;
};

export function PuzzleThemesStepShell({
  persistent,
  children,
  serverOpenAiConfigured,
  browserAiReady,
  lastRoomSkeleton,
  puzzlesGenerating,
  generationTelemetry,
}: PuzzleThemesStepShellProps) {
  if (persistent) {
    return <PuzzleStepPortalOrStatic persistent>{children}</PuzzleStepPortalOrStatic>;
  }

  return (
    <div className="puzzle-builder-layout">
      <div className="puzzle-builder-layout__main flow-content">{children}</div>
      <div className="puzzle-builder-layout__blueprint">
        {lastRoomSkeleton?.flow_summary ? (
          <p className="blueprint-flow-summary muted text-sm" role="note">
            <strong>Spatial flow:</strong> {lastRoomSkeleton.flow_summary}
          </p>
        ) : (
          <p className="blueprint-flow-summary muted text-sm" role="note">
            Generate puzzles to plot AI zones on this blueprint, or place nodes manually.
          </p>
        )}
        <Suspense fallback={<p className="muted p-4 text-sm">Loading blueprint…</p>}>
          <BlueprintWorkspace />
        </Suspense>
      </div>
      <aside className="puzzle-builder-layout__telemetry glass-panel" aria-label="Generation telemetry">
        <CouncilTelemetryPanel
          loading={puzzlesGenerating}
          telemetry={generationTelemetry}
          serverOpenAiConfigured={serverOpenAiConfigured}
          browserAiReady={browserAiReady}
        />
      </aside>
    </div>
  );
}
