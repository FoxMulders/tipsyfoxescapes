import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES, useGenerationProgressPhases } from "@/components/generation/GenerationProgressPhases";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WorkspaceNavMenu } from "./WorkspaceNavMenu";
import { StudioSegmentToggle, WorkspaceStepper } from "./WorkspaceStepper";
import { workspaceStepFromPath, type WorkspaceStepId } from "./workspaceSteps";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";
import { WorkspaceSessionExpiredOverlay } from "./WorkspaceSessionExpiredOverlay";
import "./workspace.tokens.css";

type ExperienceDesignerShellProps = {
  navMenu: WorkspaceNavMenuProps;
  hasBlueprint: boolean;
  isGenerating: boolean;
  themeIdeasLoading: boolean;
  hasRoomData: boolean;
  canGenerateRoom: boolean;
  generateRoomDisabledReason?: string;
  onGenerateRoom: () => void;
  onGenerateThemes: () => void;
  onOpenReview: () => void;
  onResetGeneration: () => void;
  onStepNavigate: (step: WorkspaceStepId) => void;
  workspaceSessionExpired?: boolean;
  workspaceSessionExpiredMessage?: string;
  workspaceSessionExpiredUserName?: string;
  onWorkspaceReauth?: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
};

export function ExperienceDesignerShell({
  navMenu,
  hasBlueprint,
  isGenerating,
  themeIdeasLoading,
  hasRoomData,
  canGenerateRoom,
  generateRoomDisabledReason,
  onGenerateRoom,
  onGenerateThemes,
  onOpenReview,
  onResetGeneration,
  onStepNavigate,
  workspaceSessionExpired = false,
  workspaceSessionExpiredMessage = "",
  workspaceSessionExpiredUserName,
  onWorkspaceReauth,
  headerExtra,
  children,
}: ExperienceDesignerShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeStep = workspaceStepFromPath(location.pathname);

  const showStudioSegment = activeStep === "studio" || activeStep === "curate";
  const generationPhase = useGenerationProgressPhases(PUZZLE_GENERATION_PHASES, isGenerating, 4000);
  const [showCancelAfter15s, setShowCancelAfter15s] = useState(false);

  useEffect(() => {
    if (!isGenerating) {
      setShowCancelAfter15s(false);
      return;
    }
    const timer = window.setTimeout(() => setShowCancelAfter15s(true), 15_000);
    return () => window.clearTimeout(timer);
  }, [isGenerating]);

  return (
    <div className="experience-designer builder-route--fullpage" data-testid="experience-designer">
      <header className="experience-designer__header glass-panel flex items-center gap-2 px-2 md:gap-3 md:px-4">
        <WorkspaceNavMenu {...navMenu} />
        <Separator orientation="vertical" className="mx-1 hidden h-8 md:block" />
        <WorkspaceStepper
          activeStep={activeStep}
          onStepNavigate={onStepNavigate}
          hasBlueprint={hasBlueprint}
          puzzlesGenerating={isGenerating}
          hasRoomData={hasRoomData}
          canGenerateRoom={canGenerateRoom}
        />
        {showStudioSegment ? (
          <StudioSegmentToggle
            active={activeStep === "curate" ? "curate" : "studio"}
            onStudio={() => navigate("/builder/studio")}
            onCurate={() => navigate("/builder/curate")}
          />
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {headerExtra}
          {isGenerating ? (
            <span
              className="hidden max-w-[14rem] truncate text-xs text-cyan-400/90 sm:inline"
              role="status"
              aria-live="polite"
            >
              {generationPhase.headline}
            </span>
          ) : null}
          {showCancelAfter15s ? (
            <Button type="button" variant="ghost" size="sm" onClick={onResetGeneration}>
              Cancel
            </Button>
          ) : null}
          {activeStep === "compose" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={themeIdeasLoading || isGenerating}
                aria-busy={themeIdeasLoading}
                onClick={onGenerateThemes}
              >
                {themeIdeasLoading ? "Please wait…" : "Refresh themes"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canGenerateRoom || isGenerating}
                aria-busy={isGenerating}
                title={!canGenerateRoom ? generateRoomDisabledReason ?? "Choose a theme first" : undefined}
                onClick={onGenerateRoom}
              >
                {isGenerating ? "Generating…" : "Generate room"}
              </Button>
            </>
          ) : null}
          {activeStep === "studio" || activeStep === "curate" ? (
            <Button type="button" size="sm" disabled={!hasRoomData} onClick={onOpenReview}>
              Continue to review
            </Button>
          ) : null}
        </div>
      </header>
      {isGenerating && activeStep === "compose" ? (
        <div className="experience-designer__generation-bar px-3 pb-2 pt-1 md:px-4">
          <GenerationProgressIndicator
            active={isGenerating}
            phases={PUZZLE_GENERATION_PHASES}
            phaseIntervalMs={4000}
            className="generation-progress-indicator--surface w-full max-w-3xl mx-auto"
          />
        </div>
      ) : null}
      {workspaceSessionExpired && onWorkspaceReauth ? (
        <WorkspaceSessionExpiredOverlay
          variant="inline"
          open
          message={workspaceSessionExpiredMessage}
          userName={workspaceSessionExpiredUserName}
          onSignIn={onWorkspaceReauth}
        />
      ) : null}
      <div className="experience-designer__body">{children}</div>
    </div>
  );
}
