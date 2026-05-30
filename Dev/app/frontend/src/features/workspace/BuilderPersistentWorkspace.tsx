import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import type { GenerationTelemetry } from "@/features/planning/domain/generationTelemetry";
import { ExperienceDesignerProvider, type ComposeActiveStep } from "./ExperienceDesignerContext";
import { ExperienceDesignerShell } from "./ExperienceDesignerShell";
import {
  GenerationProvider,
  useGeneration,
  type RoomBriefContext,
  type ThemeContext,
} from "./generation";
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
  selectedThemeName: string;
  roomBrief: RoomBriefContext | null;
  navMenu: WorkspaceNavMenuProps;
  workspaceSessionExpired: boolean;
  workspaceSessionExpiredMessage: string;
  onWorkspaceReauth: () => void;
  onTryGenerateRoom: () => boolean;
  onPlanningIncomplete: () => void;
  onSaveRoomDetails: () => Promise<boolean>;
  onResetGeneration: () => void;
};

function BuilderPersistentWorkspaceInner(props: BuilderPersistentWorkspaceProps) {
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

  const generation = useGeneration();
  const navigate = useNavigate();
  const location = useLocation();
  const activeStep = workspaceStepFromPath(location.pathname);
  const hasRoomData = generation.hasRoomData;
  const hasBlueprint = hasRoomData;
  const resolvedStep = resolveWorkspaceStep({ puzzlesGenerating: generation.isGenerating, hasBlueprint, flowWizardStep });

  const [composeActiveStep, setComposeActiveStep] = useState<ComposeActiveStep>(() =>
    onTryGenerateRoom() ? "themes" : "room-details",
  );
  const [studioInspectorOpen, setStudioInspectorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneNodeData | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleInspectorSlice | null>(null);
  const [layoutRevision] = useState(0);
  const [prevGenerating, setPrevGenerating] = useState(generation.isGenerating);
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const isGenerating = generation.isGenerating || pendingGenerate;

  useEffect(() => {
    if (!generation.isGenerating) {
      setPendingGenerate(false);
    }
  }, [generation.isGenerating]);

  useEffect(() => {
    if (generation.status === "error" && generation.error) {
      toast.error(generation.error);
      if (generation.retryHint) {
        toast.message(generation.retryHint, { duration: 8000 });
      }
    }
  }, [generation.status, generation.error, generation.retryHint]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setTimeout(() => {
      setPendingGenerate(false);
      generation.resetGeneration();
      onResetGeneration();
      toast.error("Generation timed out after 20 seconds. Please try again.");
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [isGenerating, generation, onResetGeneration]);

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
    if (active === "generating") {
      if (generation.isGenerating) return;
      navigate(hasRoomData ? "/builder/studio" : "/builder/compose", { replace: true });
      return;
    }
    if (active === "compose") return;
    if (active === "studio" && !hasRoomData && !generation.isGenerating) {
      navigate("/builder/compose", { replace: true });
      return;
    }
    if (active === "curate" && !hasRoomData && !generation.isGenerating) {
      navigate("/builder/compose", { replace: true });
      return;
    }
    if (active === "review" && !hasRoomData) {
      navigate("/builder/compose", { replace: true });
    }
  }, [resolvedStep, navigate, location.pathname, generation.isGenerating, hasRoomData]);

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
    if (prevGenerating && !generation.isGenerating && hasRoomData) {
      toast.success("Room generated");
      navigate("/builder/studio", { replace: true });
    }
    setPrevGenerating(generation.isGenerating);
  }, [generation.isGenerating, prevGenerating, hasRoomData, navigate]);

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
    generation.resetGeneration();
    onResetGeneration();
    toast.info("Generation reset — you can try again.");
  }, [generation, onResetGeneration]);

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
    void generation.runGeneration(async () => {
      try {
        await onGenerateRoom();
      } finally {
        setPendingGenerate(false);
      }
    });
  }, [onTryGenerateRoom, onPlanningIncomplete, onGenerateRoom, generation]);

  const handleStepNavigate = useCallback(
    (step: WorkspaceStepId) => {
      if (step === "generating") {
        if (activeStep === "compose" && canGenerateRoom) {
          handleGenerateClick();
        }
        return;
      }
      if (step === "studio" && !hasRoomData) return;
      if (step === "review" && !hasRoomData) return;
      navigate(routeForStep(step));
    },
    [activeStep, canGenerateRoom, hasRoomData, navigate, handleGenerateClick],
  );

  const displaySkeleton = generation.roomData?.skeleton ?? roomSkeleton;
  const displayPuzzles = generation.roomData?.puzzles ?? puzzles;
  const displayTelemetry = generation.roomData?.telemetry ?? generationTelemetry;

  const contextValue = useMemo(
    () => ({
      roomSkeleton: displaySkeleton,
      generationTelemetry: displayTelemetry,
      roomData: generation.roomData,
      hasRoomData,
      generationStatus: generation.status,
      generationError: generation.error,
      generationRetryHint: generation.retryHint,
      isGenerating,
      puzzles: displayPuzzles,
      hasBlueprint,
      canGenerateRoom,
      generateRoomDisabledReason,
      canReview: hasRoomData,
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
      displaySkeleton,
      displayTelemetry,
      generation.roomData,
      generation.status,
      generation.error,
      generation.retryHint,
      hasRoomData,
      isGenerating,
      displayPuzzles,
      hasBlueprint,
      canGenerateRoom,
      generateRoomDisabledReason,
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
        hasRoomData={hasRoomData}
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

export function BuilderPersistentWorkspace(props: BuilderPersistentWorkspaceProps) {
  const themeContext: ThemeContext | null = useMemo(() => {
    if (!props.selectedThemeId.trim()) return null;
    return {
      id: props.selectedThemeId,
      name: props.selectedThemeName.trim() || "Selected theme",
    };
  }, [props.selectedThemeId, props.selectedThemeName]);

  return (
    <GenerationProvider
      skeleton={props.roomSkeleton}
      puzzles={props.puzzles}
      telemetry={props.generationTelemetry}
      theme={themeContext}
      roomBrief={props.roomBrief}
      externalGenerating={props.puzzlesGenerating}
    >
      <BuilderPersistentWorkspaceInner {...props} />
    </GenerationProvider>
  );
}
