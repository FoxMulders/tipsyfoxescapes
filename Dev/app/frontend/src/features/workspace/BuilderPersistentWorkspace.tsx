import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { ExperienceDesignerProvider } from "./ExperienceDesignerContext";
import { ExperienceDesignerShell } from "./ExperienceDesignerShell";
import { GeneratePlanningDialog } from "./GeneratePlanningDialog";
import { WorkspaceSessionExpiredOverlay } from "./WorkspaceSessionExpiredOverlay";
import type { FlowNodeData, PuzzleNodeData, ZoneNodeData } from "./generationFlowGraph";
import { ComposePage, CuratePage, GeneratingPage, ReviewPage, StudioPage } from "./pages";
import { resolveWorkspaceStep, type WorkspaceStepId } from "./workspaceSteps";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";

export type BuilderPersistentWorkspaceProps = {
  flowWizardStep: string;
  roomSkeleton: RoomSkeleton | null;
  generationTelemetry: GenerationTelemetry | null;
  puzzlesGenerating: boolean;
  puzzles: PuzzleInspectorSlice[];
  eventSuggestions: string[];
  canGenerateRoom: boolean;
  generateRoomDisabledReason?: string;
  canReview: boolean;
  simpleThemeView: boolean;
  setSimpleThemeView: (v: boolean) => void;
  onGenerateRoom: () => void | Promise<void>;
  onGenerateThemes: () => void;
  onOpenReview: () => void | Promise<void>;
  onReplacePuzzle: (id: string) => void;
  composeThemeContent: ReactNode;
  curateContent: ReactNode;
  reviewContent: ReactNode;
  navMenu: WorkspaceNavMenuProps;
  workspaceSessionExpired: boolean;
  workspaceSessionExpiredMessage: string;
  onWorkspaceReauth: () => void;
  onTryGenerateRoom: () => boolean;
};

export function BuilderPersistentWorkspace(props: BuilderPersistentWorkspaceProps) {
  const {
    flowWizardStep,
    roomSkeleton,
    generationTelemetry,
    puzzlesGenerating,
    puzzles,
    eventSuggestions,
    canGenerateRoom,
    generateRoomDisabledReason,
    canReview,
    simpleThemeView,
    setSimpleThemeView,
    onGenerateRoom,
    onGenerateThemes,
    onOpenReview,
    onReplacePuzzle,
    composeThemeContent,
    curateContent,
    reviewContent,
    navMenu,
    workspaceSessionExpired,
    workspaceSessionExpiredMessage,
    onWorkspaceReauth,
    onTryGenerateRoom,
  } = props;
  const navigate = useNavigate();
  const hasBlueprint = Boolean(roomSkeleton?.zones?.length && puzzles.length > 0);
  const resolvedStep = resolveWorkspaceStep({ puzzlesGenerating, hasBlueprint, flowWizardStep });
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false);
  const [studioInspectorOpen, setStudioInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneNodeData | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleInspectorSlice | null>(null);
  const [layoutRevision] = useState(0);
  const [prevGenerating, setPrevGenerating] = useState(puzzlesGenerating);

  const routeForStep = (step: WorkspaceStepId): string => {
    switch (step) {
      case "generating":
        return "/builder/generating";
      case "studio":
        return "/builder/studio";
      case "curate":
        return "/builder/curate";
      case "review":
        return "/builder/review";
      default:
        return "/builder/compose";
    }
  };

  useEffect(() => {
    const target = routeForStep(resolvedStep);
    if (!window.location.pathname.startsWith("/builder/")) {
      navigate(target, { replace: true });
      return;
    }
    if (window.location.pathname !== target && resolvedStep !== "curate") {
      navigate(target, { replace: true });
    }
  }, [resolvedStep, navigate]);

  useEffect(() => {
    if (prevGenerating && !puzzlesGenerating && hasBlueprint) {
      toast.success("Room generated");
      navigate("/builder/studio", { replace: true });
    }
    setPrevGenerating(puzzlesGenerating);
  }, [puzzlesGenerating, prevGenerating, hasBlueprint, navigate]);

  const onNodeSelect = useCallback(
    (nodeId: string | null, data: FlowNodeData | null) => {
      setSelectedNodeId(nodeId);
      if (!data) {
        setSelectedZone(null);
        setSelectedPuzzle(null);
        setStudioInspectorOpen(false);
        return;
      }
      if (data.kind === "puzzle") {
        const puzzleData = data as PuzzleNodeData;
        setSelectedZone(null);
        setSelectedPuzzle(puzzles.find((p) => p.id === puzzleData.puzzleId) ?? null);
        setStudioInspectorOpen(true);
        return;
      }
      setSelectedZone(data);
      setSelectedPuzzle(null);
      setStudioInspectorOpen(true);
    },
    [puzzles],
  );

  const handleGenerateClick = useCallback(() => {
    if (!onTryGenerateRoom()) {
      setPlanningDialogOpen(true);
      return;
    }
    void onGenerateRoom();
  }, [onTryGenerateRoom, onGenerateRoom]);

  const handleStepNavigate = useCallback(
    (step: WorkspaceStepId) => {
      if (step === "generating") return;
      if (step === "studio" && !hasBlueprint) return;
      if (step === "review" && !canReview) return;
      navigate(routeForStep(step));
    },
    [hasBlueprint, canReview, navigate],
  );

  const contextValue = useMemo(
    () => ({
      roomSkeleton,
      generationTelemetry,
      puzzlesGenerating,
      puzzles,
      hasBlueprint,
      canGenerateRoom,
      generateRoomDisabledReason,
      canReview,
      simpleThemeView,
      setSimpleThemeView,
      onGenerateRoom: handleGenerateClick,
      onGenerateThemes,
      onOpenReview: () => void onOpenReview(),
      onReplacePuzzle,
      composeThemeContent,
      curateContent,
      reviewContent,
      navMenu,
      planningDialogOpen,
      setPlanningDialogOpen,
      onPlanningDialogSubmit: () => void onGenerateRoom(),
      studioInspectorOpen,
      setStudioInspectorOpen,
      selectedZone,
      selectedPuzzle,
      onNodeSelect,
      selectedNodeId,
      layoutRevision,
    }),
    [
      roomSkeleton,
      generationTelemetry,
      puzzlesGenerating,
      puzzles,
      hasBlueprint,
      canGenerateRoom,
      generateRoomDisabledReason,
      canReview,
      simpleThemeView,
      setSimpleThemeView,
      handleGenerateClick,
      onGenerateThemes,
      onOpenReview,
      onReplacePuzzle,
      composeThemeContent,
      curateContent,
      reviewContent,
      navMenu,
      planningDialogOpen,
      onGenerateRoom,
      studioInspectorOpen,
      selectedZone,
      selectedPuzzle,
      onNodeSelect,
      selectedNodeId,
      layoutRevision,
    ],
  );

  return (
    <ExperienceDesignerProvider value={contextValue}>
      <GeneratePlanningDialog
        open={planningDialogOpen}
        onOpenChange={setPlanningDialogOpen}
        onSubmit={() => void onGenerateRoom()}
        eventSuggestions={eventSuggestions}
      />
      {workspaceSessionExpired ? (
        <WorkspaceSessionExpiredOverlay
          open
          message={workspaceSessionExpiredMessage}
          userName={navMenu.authName}
          onSignIn={onWorkspaceReauth}
        />
      ) : null}
      <Routes>
        <Route
          element={
            <ExperienceDesignerShell
              navMenu={navMenu}
              hasBlueprint={hasBlueprint}
              puzzlesGenerating={puzzlesGenerating}
              canReview={canReview}
              canGenerateRoom={canGenerateRoom}
              generateRoomDisabledReason={generateRoomDisabledReason}
              onGenerateRoom={handleGenerateClick}
              onGenerateThemes={onGenerateThemes}
              onOpenReview={() => void onOpenReview()}
              onStepNavigate={handleStepNavigate}
            />
          }
        >
          <Route path="compose" element={<ComposePage />} />
          <Route path="generating" element={<GeneratingPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="curate" element={<CuratePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route index element={<Navigate to="compose" replace />} />
        </Route>
      </Routes>
    </ExperienceDesignerProvider>
  );
}
