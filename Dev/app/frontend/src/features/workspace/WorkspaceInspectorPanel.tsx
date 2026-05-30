import type { ReactNode } from "react";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { CouncilTelemetryPanel } from "@/features/planning/components/GenerationTelemetryPanel";
import type { ZoneNodeData } from "./generationFlowGraph";

export type PuzzleInspectorSlice = {
  id: string;
  title: string;
  category: string;
  objective: string;
  electronicDetails?: {
    parts?: string[];
    arduinoCode?: string;
    buildSteps?: string[];
  };
};

type WorkspaceInspectorPanelProps = {
  telemetry: GenerationTelemetry | null;
  puzzlesGenerating: boolean;
  selectedZone: ZoneNodeData | null;
  selectedPuzzle: PuzzleInspectorSlice | null;
  flowSummary?: string | null;
};

export function WorkspaceInspectorPanel({
  telemetry,
  puzzlesGenerating,
  selectedZone,
  selectedPuzzle,
  flowSummary,
}: WorkspaceInspectorPanelProps) {
  if (selectedPuzzle && !selectedZone) {
    return (
      <aside className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3" aria-label="Puzzle inspector">
        <header>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-violet-300/90">Puzzle beat</p>
          <h3 className="m-0 mt-1 text-lg font-bold text-slate-50">{selectedPuzzle.title}</h3>
        </header>
        <PuzzleInspectorBlock puzzle={selectedPuzzle} />
      </aside>
    );
  }

  if (selectedZone) {
    return (
      <aside className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3" aria-label="Zone inspector">
        <header>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-cyan-400/90">Zone inspector</p>
          <h3 className="m-0 mt-1 text-lg font-bold text-slate-50">{selectedZone.label}</h3>
        </header>
        <p className="m-0 text-sm leading-relaxed text-slate-300">{selectedZone.action}</p>
        {selectedZone.hardware ? (
          <p className="m-0 text-xs text-slate-400">
            Suggested hardware: <strong className="text-slate-200">{selectedZone.hardware.replace(/_/g, " ")}</strong>
          </p>
        ) : null}
        {selectedPuzzle ? (
          <PuzzleInspectorBlock puzzle={selectedPuzzle} />
        ) : (
          <p className="m-0 text-sm text-slate-500">No puzzle linked to this zone in the logic tree.</p>
        )}
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-auto p-3" aria-label="Generation telemetry">
      <CouncilTelemetryPanel loading={puzzlesGenerating} telemetry={telemetry} compact />
      {flowSummary ? (
        <p className="mt-3 mb-0 rounded-lg border border-cyan-500/20 bg-cyan-950/30 p-2.5 text-xs leading-relaxed text-slate-300">
          <strong className="text-slate-100">Spatial flow:</strong> {flowSummary}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">Tap a zone on the canvas to inspect puzzle details, BOM, and Arduino preview.</p>
    </aside>
  );
}

function PuzzleInspectorBlock({ puzzle }: { puzzle: PuzzleInspectorSlice }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3">
      <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-violet-300/90">Linked puzzle</p>
      <h4 className="m-0 mt-1 text-base font-semibold text-slate-50">{puzzle.title}</h4>
      <p className="mt-1 mb-0 text-xs uppercase tracking-wide text-slate-500">{puzzle.category}</p>
      <p className="mt-2 mb-0 text-sm text-slate-300">{puzzle.objective}</p>
      {puzzle.electronicDetails?.parts?.length ? (
        <div className="mt-3">
          <p className="m-0 text-xs font-semibold text-slate-400">Bill of materials</p>
          <ul className="mt-1 mb-0 list-disc pl-4 text-xs text-slate-300">
            {puzzle.electronicDetails.parts.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {puzzle.electronicDetails?.arduinoCode?.trim() ? (
        <div className="mt-3">
          <p className="m-0 text-xs font-semibold text-slate-400">Arduino preview</p>
          <pre className="mt-1 max-h-40 overflow-auto rounded border border-slate-700 bg-black/40 p-2 text-[10px] leading-relaxed text-emerald-300/90">
            {puzzle.electronicDetails.arduinoCode.slice(0, 800)}
            {puzzle.electronicDetails.arduinoCode.length > 800 ? "\n…" : ""}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceInspectorMobile({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="workspace-inspector-mobile fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Close inspector" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-700/80 bg-slate-950/98 shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="m-0 text-sm font-bold text-slate-100">Inspector</h2>
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
