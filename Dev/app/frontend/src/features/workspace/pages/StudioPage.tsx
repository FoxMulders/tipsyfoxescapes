import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BlueprintFlowCanvas } from "../BlueprintFlowCanvas";
import { useExperienceDesigner } from "../ExperienceDesignerContext";
import { StudioInspectorSheet } from "../StudioInspectorSheet";

export function StudioPage() {
  const navigate = useNavigate();
  const {
    roomSkeleton,
    puzzles,
    hasBlueprint,
    puzzlesGenerating,
    selectedNodeId,
    onNodeSelect,
    layoutRevision,
    studioInspectorOpen,
    setStudioInspectorOpen,
    selectedZone,
    selectedPuzzle,
    generationTelemetry,
  } = useExperienceDesigner();

  useEffect(() => {
    if (!hasBlueprint && !puzzlesGenerating) {
      navigate("/builder/compose", { replace: true });
    }
  }, [hasBlueprint, puzzlesGenerating, navigate]);

  if (!roomSkeleton) {
    return (
      <div className="experience-step flex h-full items-center justify-center p-8">
        <p className="m-0 text-sm text-slate-400" role="status" aria-live="polite">
          Loading blueprint…
        </p>
      </div>
    );
  }

  return (
    <div className="experience-step h-full">
      <BlueprintFlowCanvas
        skeleton={roomSkeleton}
        puzzles={puzzles}
        selectedNodeId={selectedNodeId}
        onNodeSelect={onNodeSelect}
        layoutRevision={layoutRevision}
        className="h-full w-full"
      />
      <StudioInspectorSheet
        open={studioInspectorOpen}
        onOpenChange={setStudioInspectorOpen}
        selectedZone={selectedZone}
        selectedPuzzle={selectedPuzzle}
        telemetry={generationTelemetry}
        flowSummary={roomSkeleton.flow_summary}
      />
    </div>
  );
}
