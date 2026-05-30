import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import type { ZoneNodeData } from "./generationFlowGraph";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";

type StudioInspectorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedZone: ZoneNodeData | null;
  selectedPuzzle: PuzzleInspectorSlice | null;
  telemetry: GenerationTelemetry | null;
  flowSummary?: string | null;
};

export function StudioInspectorSheet({
  open,
  onOpenChange,
  selectedZone,
  selectedPuzzle,
  telemetry,
  flowSummary,
}: StudioInspectorSheetProps) {
  const navigate = useNavigate();
  const puzzle = selectedPuzzle;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="glass-panel w-full border-l border-white/10 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{puzzle ? puzzle.title : selectedZone?.label ?? "Inspector"}</SheetTitle>
          <SheetDescription>
            {puzzle ? "Puzzle beat on your logic tree." : selectedZone ? "Physical room zone from the AI skeleton." : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm text-slate-300">
          {selectedZone && !puzzle ? (
            <>
              <p className="m-0">
                <Badge variant="secondary" className="mr-2">
                  ROOM
                </Badge>
                {selectedZone.action}
              </p>
              {selectedZone.hardware ? (
                <p className="m-0 text-slate-400">Hardware: {selectedZone.hardware.replace(/_/g, " ")}</p>
              ) : null}
            </>
          ) : null}
          {puzzle ? (
            <>
              <Badge variant="outline">{puzzle.category}</Badge>
              <p className="m-0 leading-relaxed">{puzzle.objective}</p>
              {puzzle.electronicDetails?.parts?.length ? (
                <div>
                  <p className="mb-1 font-semibold text-slate-200">Parts</p>
                  <ul className="m-0 list-inside list-disc text-slate-400">
                    {puzzle.electronicDetails.parts.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => navigate("/builder/curate")}>
                Replace or curate in puzzle list
              </Button>
            </>
          ) : null}
          {flowSummary ? (
            <p className="m-0 rounded-md border border-cyan-500/20 bg-cyan-950/20 p-2 text-xs leading-relaxed">{flowSummary}</p>
          ) : null}
          {telemetry?.engine ? (
            <p className="m-0 text-xs text-slate-500">Engine: {telemetry.engine}</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
