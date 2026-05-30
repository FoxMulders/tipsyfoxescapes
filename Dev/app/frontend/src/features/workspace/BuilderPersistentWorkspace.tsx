import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { BlueprintFlowCanvas } from "./BlueprintFlowCanvas";
import { WorkspaceBriefPanel } from "./WorkspaceBriefPanel";
import { WorkspaceCenterStage } from "./WorkspaceCenterStage";
import { WorkspaceInspectorMobile, WorkspaceInspectorPanel, type PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import { WorkspaceLeftPanel } from "./WorkspaceLeftPanel";
import { WorkspaceShell } from "./WorkspaceShell";
import { resolveWorkspaceStep, type LayoutStylePreference, type WorkspaceStepId } from "./workspaceSteps";
import type { FlowNodeData, PuzzleNodeData, ZoneNodeData } from "./generationFlowGraph";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";

export type BuilderPersistentWorkspaceProps = {
  flowWizardStep: string;
  roomSkeleton: RoomSkeleton | null;
  generationTelemetry: GenerationTelemetry | null;
  puzzlesGenerating: boolean;
  puzzles: PuzzleInspectorSlice[];
  venueSummary?: string;
  eventSuggestions: string[];
  itemHistory: string[];
  onOpenInspiration: () => void;
  canGenerateRoom: boolean;
  generateRoomDisabledReason?: string;
  onGenerateRoom: () => void;
  onOpenReview?: () => void;
  briefThemeContent?: ReactNode;
  blueprintExtra?: ReactNode;
  navMenu: WorkspaceNavMenuProps;
};

export function BuilderPersistentWorkspace({
  flowWizardStep,
  roomSkeleton,
  generationTelemetry,
  puzzlesGenerating,
  puzzles,
  venueSummary,
  eventSuggestions,
  itemHistory,
  onOpenInspiration,
  canGenerateRoom,
  generateRoomDisabledReason,
  onGenerateRoom,
  onOpenReview,
  briefThemeContent,
  blueprintExtra,
  navMenu,
}: BuilderPersistentWorkspaceProps) {
  const hasBlueprint = Boolean(roomSkeleton?.zones?.length && puzzles.length > 0);
  const resolvedStep = resolveWorkspaceStep({ puzzlesGenerating, hasBlueprint, flowWizardStep });
  const [workspaceStep, setWorkspaceStep] = useState<WorkspaceStepId>(resolvedStep);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStylePreference>("linear_4zone");
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneNodeData | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleInspectorSlice | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);

  useEffect(() => {
    setWorkspaceStep(resolvedStep);
  }, [resolvedStep]);

  const displaySkeleton = useMemo((): RoomSkeleton | null => {
    if (!roomSkeleton) return null;
    return { ...roomSkeleton, flow_pattern: layoutStyle };
  }, [roomSkeleton, layoutStyle]);

  const linkedPuzzle = useMemo((): PuzzleInspectorSlice | null => {
    if (selectedPuzzle) return selectedPuzzle;
    if (!selectedZone || puzzles.length === 0) return null;
    const idx = roomSkeleton?.zones.findIndex((z) => z.zone_id === selectedZone.zoneId) ?? -1;
    if (idx >= 0 && puzzles[idx]) return puzzles[idx];
    return puzzles.find((p) => p.title.toLowerCase().includes(selectedZone.label.toLowerCase().slice(0, 8))) ?? null;
  }, [selectedPuzzle, selectedZone, puzzles, roomSkeleton?.zones]);

  const onNodeSelect = useCallback(
    (nodeId: string | null, data: FlowNodeData | null) => {
      setSelectedNodeId(nodeId);
      if (!data) {
        setSelectedZone(null);
        setSelectedPuzzle(null);
        return;
      }
      if (data.kind === "puzzle") {
        const puzzleData = data as PuzzleNodeData;
        setSelectedZone(null);
        setSelectedPuzzle(puzzles.find((p) => p.id === puzzleData.puzzleId) ?? null);
        setMobileInspectorOpen(true);
        return;
      }
      setSelectedZone(data);
      setSelectedPuzzle(null);
      setMobileInspectorOpen(true);
    },
    [puzzles],
  );

  const leftPanel = (
    <WorkspaceLeftPanel
      step={workspaceStep}
      layoutStyle={layoutStyle}
      onLayoutStyleChange={setLayoutStyle}
      venueSummary={venueSummary}
      canGenerateRoom={canGenerateRoom}
      generateRoomDisabledReason={generateRoomDisabledReason}
      puzzlesGenerating={puzzlesGenerating}
      onGenerateRoom={onGenerateRoom}
      onOpenReview={onOpenReview}
      briefThemeContent={briefThemeContent}
      blueprintExtra={blueprintExtra}
      puzzleCount={puzzles.length}
      flowSummary={roomSkeleton?.flow_summary ?? null}
      eventSuggestions={eventSuggestions}
      itemHistory={itemHistory}
      onOpenInspiration={onOpenInspiration}
    />
  );

  const blueprintCanvas =
    (workspaceStep === "blueprint" || workspaceStep === "review") && displaySkeleton ? (
      <BlueprintFlowCanvas
        skeleton={displaySkeleton}
        puzzles={puzzles}
        selectedNodeId={selectedNodeId}
        onNodeSelect={onNodeSelect}
        layoutRevision={layoutRevision}
        className="h-full w-full"
      />
    ) : null;

  const centerContent = <WorkspaceCenterStage step={workspaceStep} blueprintCanvas={blueprintCanvas} />;

  const rightPanel = (
    <WorkspaceInspectorPanel
      telemetry={generationTelemetry}
      puzzlesGenerating={puzzlesGenerating}
      selectedZone={selectedZone}
      selectedPuzzle={linkedPuzzle}
      flowSummary={roomSkeleton?.flow_summary}
    />
  );

  return (
    <>
      <WorkspaceShell
        activeStep={workspaceStep}
        onStepChange={(step) => {
          if (step === "generating") return;
          if (step === "blueprint" && !hasBlueprint) return;
          setWorkspaceStep(step);
          setMobileLeftOpen(true);
        }}
        leftPanel={leftPanel}
        centerCanvas={centerContent}
        rightPanel={rightPanel}
        mobileLeftOpen={mobileLeftOpen}
        onMobileLeftOpenChange={setMobileLeftOpen}
        onLayoutChange={setLayoutRevision}
        navMenu={navMenu}
      />
      <WorkspaceInspectorMobile
        open={mobileInspectorOpen && Boolean(selectedZone || selectedPuzzle)}
        onClose={() => setMobileInspectorOpen(false)}
      >
        <WorkspaceInspectorPanel
          telemetry={generationTelemetry}
          puzzlesGenerating={puzzlesGenerating}
          selectedZone={selectedZone}
          selectedPuzzle={linkedPuzzle}
          flowSummary={roomSkeleton?.flow_summary}
        />
      </WorkspaceInspectorMobile>
    </>
  );
}
