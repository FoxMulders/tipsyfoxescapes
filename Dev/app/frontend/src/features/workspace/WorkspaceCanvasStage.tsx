import { lazy, Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const BlueprintWorkspace = lazy(() =>
  import("@/features/planning/components/BlueprintWorkspace").then((m) => ({ default: m.BlueprintWorkspace })),
);

export type WorkspaceCanvasView = "flow" | "floorplan";

type WorkspaceCanvasStageProps = {
  view: WorkspaceCanvasView;
  onViewChange: (view: WorkspaceCanvasView) => void;
  flowCanvas: ReactNode;
  flowSummary?: string | null;
  layoutRevision?: number;
};

export function WorkspaceCanvasStage({ view, onViewChange, flowCanvas, flowSummary, layoutRevision }: WorkspaceCanvasStageProps) {
  return (
    <div className="workspace-canvas-stage relative h-full w-full min-h-0">
      <div
        className="workspace-canvas-tabs pointer-events-none absolute inset-x-0 top-3 z-[20] flex justify-center px-3"
        role="tablist"
        aria-label="Blueprint view"
      >
        <div className="pointer-events-auto inline-flex rounded-full border border-slate-700/80 bg-slate-950/90 p-0.5 shadow-lg backdrop-blur-sm">
          {(
            [
              ["flow", "Flow map"],
              ["floorplan", "Floor plan"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                view === id ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/35" : "text-slate-400 hover:text-slate-200",
              )}
              onClick={() => onViewChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("absolute inset-0", view !== "flow" && "pointer-events-none invisible")} aria-hidden={view !== "flow"}>
        {flowCanvas}
      </div>

      {view === "floorplan" ? (
        <div className="workspace-floorplan-overlay absolute inset-0 z-[10] overflow-auto bg-slate-950 p-2 pt-14 sm:p-3 sm:pt-14">
          {flowSummary ? (
            <p className="blueprint-flow-summary muted mb-2 text-sm" role="note">
              <strong>Spatial flow:</strong> {flowSummary}
            </p>
          ) : null}
          <Suspense fallback={<p className="muted p-4 text-sm">Loading floor plan…</p>}>
            <BlueprintWorkspace />
          </Suspense>
        </div>
      ) : null}

      {/* Re-mount flow canvas key when layout changes so fitView can re-run */}
      <span className="sr-only" aria-live="polite">
        {layoutRevision !== undefined ? `Layout revision ${layoutRevision}` : null}
      </span>
    </div>
  );
}
