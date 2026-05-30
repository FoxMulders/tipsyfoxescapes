import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { ExperienceDesignerProvider, type ComposeActiveStep } from "./ExperienceDesignerContext";
import { ExperienceDesignerShell } from "./ExperienceDesignerShell";
import type { FlowNodeData, PuzzleNodeData, ZoneNodeData } from "./generationFlowGraph";
import { ComposePage, CuratePage, GeneratingPage, ReviewPage, StudioPage } from "./pages";
import { resolveWorkspaceStep, workspaceStepFromPath, type WorkspaceStepId } from "./workspaceSteps";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";

export type BuilderPersistentWorkspaceProps = {
  flowWizardStep: string;
  roomSkeleton: RoomSkeleton | null;
  generationTelemetry: GenerationTelemetry | null;
  puzzlesGenerating: boolean;
  themeIdeasLoading: boolean;
  themesCount: number;
  canGenerateNewThemes: boolean;
  themePath: "generated" | "custom" | null;
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
  selectedThemeId: string;
  navMenu: WorkspaceNavMenuProps;
  workspaceSessionExpired: boolean;
  workspaceSessionExpiredMessage: string;
  onWorkspaceReauth: () => void;
  onTryGenerateRoom: () => boolean;
  onPlanningIncomplete: () => void;
  onSaveRoomDetails: () => Promise<boolean>;
  onResetGeneration: () => void;
};

export function BuilderPersistentWorkspace(props: BuilderPersistentWorkspaceProps) {
  const {
    flowWizardStep,
    roomSkeleton,
    generationTelemetry,
    puzzlesGenerating,
    themeIdeasLoading,
    themesCount,
    canGenerateNewThemes,
    themePath,
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
    selectedThemeId,
    navMenu,
    workspaceSessionExpired,
    workspaceSessionExpiredMessage,
    onWorkspaceReauth,
    onTryGenerateRoom,
    onPlanningIncomplete,
    onSaveRoomDetails,
    onResetGeneration,
  } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const activeStep = workspaceStepFromPath(location.pathname);
  const hasBlueprint = Boolean(roomSkeleton?.zones?.length && puzzles.length > 0);
  const resolvedStep = resolveWorkspaceStep({ puzzlesGenerating, hasBlueprint, flowWizardStep });
  const [composeActiveStep, setComposeActiveStep] = useState<ComposeActiveStep>(() =>
    onTryGenerateRoom() ? "themes" : "room-details",
  );
  const [studioInspectorOpen, setStudioInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneNodeData | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleInspectorSlice | null>(null);
  const [layoutRevision] = useState(0);
  const [prevGenerating, setPrevGenerating] = useState(puzzlesGenerating);
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const isGenerating = puzzlesGenerating || pendingGenerate;

  useEffect(() => {
    if (!puzzlesGenerating) {
      setPendingGenerate(false);
    }
  }, [puzzlesGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setTimeout(() => {
      setPendingGenerate(false);
      onResetGeneration();
      toast.error("Generation timed out after 20 seconds. Please try again.");
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [isGenerating, onResetGeneration]);

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
    const path = location.pathname;
    const active = workspaceStepFromPath(path);

    if (path === "/builder" || path === "/builder/") {
      navigate("/builder/compose", { replace: true });
      return;
    }
    if (!path.startsWith("/builder/")) {
      navigate(routeForStep(resolvedStep), { replace: true });
      return;
    }
    // Legacy generating route — redirect once generation finishes or blueprint exists.
    if (active === "generating") {
      if (puzzlesGenerating) return;
      navigate(hasBlueprint ? "/builder/studio" : "/builder/compose", { replace: true });
      return;
    }
    // Compose stays reachable during inline generation progress.
    if (active === "compose") return;
    if (active === "studio" && !hasBlueprint && !puzzlesGenerating) {
      navigate("/builder/compose", { replace: true });
      return;
    }
    if (active === "curate" && !hasBlueprint && !puzzlesGenerating) {
      navigate("/builder/compose", { replace: true });
      return;
    }
    if (active === "review" && !canReview) {
      navigate(hasBlueprint ? "/builder/studio" : "/builder/compose", { replace: true });
    }
  }, [resolvedStep, navigate, location.pathname, puzzlesGenerating, hasBlueprint, canReview]);

  const stepContent = useMemo(() => {
    switch (activeStep) {
      case "generating":
        return <GeneratingPage />;
      case "studio":
        return <StudioPage />;
      case "curate":
        return <CuratePage />;
      case "review":
        return <ReviewPage />;
      default:
        return <ComposePage />;
    }
  }, [activeStep]);

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

  const handleResetGeneration = useCallback((): void => {
    setPendingGenerate(false);
    onResetGeneration();
    toast.info("Generation reset — you can try again.");
  }, [onResetGeneration]);

  const handleGenerateClick = useCallback(() => {
    if (!onTryGenerateRoom()) {
      flushSync(() => {
        setComposeActiveStep("room-details");
      });
      onPlanningIncomplete();
      toast.error("Complete room details before generating.");
      return;
    }
    flushSync(() => {
      setPendingGenerate(true);
    });
    void Promise.resolve(onGenerateRoom());
  }, [onTryGenerateRoom, onPlanningIncomplete, onGenerateRoom]);

  const handleStepNavigate = useCallback(
    (step: WorkspaceStepId) => {
      if (step === "generating") {
        if (activeStep === "compose" && canGenerateRoom) {
          void onGenerateRoom();
        }
        return;
      }
      if (step === "studio" && !hasBlueprint) return;
      if (step === "review" && !canReview) return;
      navigate(routeForStep(step));
    },
    [activeStep, canGenerateRoom, hasBlueprint, canReview, navigate, onGenerateRoom],
  );

  const contextValue = useMemo(
    () => ({
      roomSkeleton,
      generationTelemetry,
      isGenerating,
      puzzles,
      hasBlueprint,
      canGenerateRoom,
      generateRoomDisabledReason,
      canReview,
      simpleThemeView,
      setSimpleThemeView,
      onGenerateRoom: handleGenerateClick,
      onGenerateThemes,
      themesCount,
      themeIdeasLoading,
      canGenerateNewThemes,
      themePath,
      composeActiveStep,
      setComposeActiveStep,
      onSaveRoomDetails,
      onTryValidateRoomDetails: onTryGenerateRoom,
      onPlanningIncomplete,
      eventSuggestions,
      onOpenReview: () => void onOpenReview(),
      onReplacePuzzle,
      composeThemeContent,
      curateContent,
      reviewContent,
      selectedThemeId,
      navMenu,
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
      isGenerating,
      puzzles,
      hasBlueprint,
      canGenerateRoom,
      generateRoomDisabledReason,
      canReview,
      simpleThemeView,
      setSimpleThemeView,
      handleGenerateClick,
      onGenerateThemes,
      themesCount,
      themeIdeasLoading,
      canGenerateNewThemes,
      themePath,
      composeActiveStep,
      onSaveRoomDetails,
      onTryGenerateRoom,
      onPlanningIncomplete,
      eventSuggestions,
      onOpenReview,
      onReplacePuzzle,
      composeThemeContent,
      curateContent,
      reviewContent,
      selectedThemeId,
      navMenu,
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
      <ExperienceDesignerShell
        navMenu={navMenu}
        hasBlueprint={hasBlueprint}
        isGenerating={isGenerating}
        themeIdeasLoading={themeIdeasLoading}
        canReview={canReview}
        canGenerateRoom={canGenerateRoom}
        generateRoomDisabledReason={generateRoomDisabledReason}
        onGenerateRoom={handleGenerateClick}
        onGenerateThemes={onGenerateThemes}
        onOpenReview={() => void onOpenReview()}
        onResetGeneration={handleResetGeneration}
        onStepNavigate={handleStepNavigate}
        workspaceSessionExpired={workspaceSessionExpired}
        workspaceSessionExpiredMessage={workspaceSessionExpiredMessage}
        workspaceSessionExpiredUserName={navMenu.authName}
        onWorkspaceReauth={onWorkspaceReauth}
      >
        {stepContent}
      </ExperienceDesignerShell>
    </ExperienceDesignerProvider>
  );
}
