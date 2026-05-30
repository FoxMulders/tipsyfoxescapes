import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { RoomSkeleton, RoomZone } from "../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { BlueprintFlowCanvas } from "./BlueprintFlowCanvas";
import { WorkspaceCanvasStage, type WorkspaceCanvasView } from "./WorkspaceCanvasStage";
import { WorkspaceInspectorMobile, WorkspaceInspectorPanel, type PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import { WorkspaceLeftPanel } from "./WorkspaceLeftPanel";
import { WorkspaceShell } from "./WorkspaceShell";
import { workspaceStepFromWizard, type WorkspaceStepId } from "./workspaceSteps";
import type { ZoneNodeData } from "./skeletonFlowGraph";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";

export type BuilderPersistentWorkspaceProps = {
  flowWizardStep: string;
  roomSkeleton: RoomSkeleton | null;
  generationTelemetry: GenerationTelemetry | null;
  puzzlesGenerating: boolean;
  puzzles: PuzzleInspectorSlice[];
  eventSuggestions: string[];
  itemHistory: string[];
  onOpenInspiration: () => void;
  onGenerateSkeleton: () => void;
  onGeneratePuzzles: () => void;
  canGeneratePuzzles: boolean;
  onContinueSetup?: () => void;
  onOpenReview?: () => void;
  constraintsExtra?: ReactNode;
  puzzlesExtra?: ReactNode;
  navMenu: WorkspaceNavMenuProps;
};

export function BuilderPersistentWorkspace({
  flowWizardStep,
  roomSkeleton,
  generationTelemetry,
  puzzlesGenerating,
  puzzles,
  eventSuggestions,
  itemHistory,
  onOpenInspiration,
  onGenerateSkeleton,
  onGeneratePuzzles,
  canGeneratePuzzles,
  onContinueSetup,
  onOpenReview,
  constraintsExtra,
  puzzlesExtra,
  navMenu,
}: BuilderPersistentWorkspaceProps) {
  const wizardMappedStep = workspaceStepFromWizard(flowWizardStep);
  const [workspaceStep, setWorkspaceStep] = useState<WorkspaceStepId>(wizardMappedStep);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneNodeData | null>(null);
  const [canvasView, setCanvasView] = useState<WorkspaceCanvasView>("flow");
  const [layoutRevision, setLayoutRevision] = useState(0);

  useEffect(() => {
    setWorkspaceStep(workspaceStepFromWizard(flowWizardStep));
  }, [flowWizardStep]);

  const activeStep = workspaceStep;

  const linkedPuzzle = useMemo((): PuzzleInspectorSlice | null => {
    if (!selectedZone || puzzles.length === 0) return puzzles[0] ?? null;
    const idx = roomSkeleton?.zones.findIndex((z: RoomZone) => z.zone_id === selectedZone.zoneId) ?? -1;
    if (idx >= 0 && puzzles[idx]) return puzzles[idx];
    return puzzles.find((p) => p.title.toLowerCase().includes(selectedZone.label.toLowerCase().slice(0, 8))) ?? puzzles[0] ?? null;
  }, [selectedZone, puzzles, roomSkeleton?.zones]);

  const onNodeSelect = useCallback((nodeId: string | null, data: ZoneNodeData | null) => {
    setSelectedNodeId(nodeId);
    setSelectedZone(data);
    if (data) {
      setMobileInspectorOpen(true);
    }
  }, []);

  const leftPanel = (
    <WorkspaceLeftPanel
      step={activeStep}
      flowWizardStep={flowWizardStep}
      eventSuggestions={eventSuggestions}
      itemHistory={itemHistory}
      onOpenInspiration={onOpenInspiration}
      onGenerateSkeleton={onGenerateSkeleton}
      skeletonSummary={roomSkeleton?.flow_summary ?? null}
      onGeneratePuzzles={onGeneratePuzzles}
      puzzlesGenerating={puzzlesGenerating}
      canGeneratePuzzles={canGeneratePuzzles}
      onContinueConstraints={flowWizardStep === "setup" ? onContinueSetup : undefined}
      onContinueReview={onOpenReview}
      extraContent={activeStep === "constraints" ? constraintsExtra : activeStep === "puzzles" ? puzzlesExtra : undefined}
    />
  );

  const centerCanvas = (
    <WorkspaceCanvasStage
      view={canvasView}
      onViewChange={setCanvasView}
      flowSummary={roomSkeleton?.flow_summary}
      layoutRevision={layoutRevision}
      flowCanvas={
        <BlueprintFlowCanvas
          skeleton={roomSkeleton}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          layoutRevision={layoutRevision}
          className="h-full w-full"
        />
      }
    />
  );

  const rightPanel = (
    <WorkspaceInspectorPanel
      telemetry={generationTelemetry}
      puzzlesGenerating={puzzlesGenerating}
      selectedZone={selectedZone}
      linkedPuzzle={linkedPuzzle}
      flowSummary={roomSkeleton?.flow_summary}
    />
  );

  return (
    <>
      <WorkspaceShell
        activeStep={activeStep}
        onStepChange={(step) => {
          setWorkspaceStep(step);
          setMobileLeftOpen(true);
        }}
        leftPanel={leftPanel}
        centerCanvas={centerCanvas}
        rightPanel={rightPanel}
        mobileLeftOpen={mobileLeftOpen}
        onMobileLeftOpenChange={setMobileLeftOpen}
        onLayoutChange={setLayoutRevision}
        navMenu={navMenu}
      />
      <WorkspaceInspectorMobile open={mobileInspectorOpen && Boolean(selectedZone)} onClose={() => setMobileInspectorOpen(false)}>
        <WorkspaceInspectorPanel
          telemetry={generationTelemetry}
          puzzlesGenerating={puzzlesGenerating}
          selectedZone={selectedZone}
          linkedPuzzle={linkedPuzzle}
          flowSummary={roomSkeleton?.flow_summary}
        />
      </WorkspaceInspectorMobile>
    </>
  );
}
