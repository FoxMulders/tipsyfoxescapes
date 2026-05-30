import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WorkspaceNavMenu } from "./WorkspaceNavMenu";
import { StudioSegmentToggle, WorkspaceStepper } from "./WorkspaceStepper";
import { workspaceStepFromPath, type WorkspaceStepId } from "./workspaceSteps";
import type { WorkspaceNavMenuProps } from "./WorkspaceNavMenu";
import "./workspace.tokens.css";

type ExperienceDesignerShellProps = {
  navMenu: WorkspaceNavMenuProps;
  hasBlueprint: boolean;
  puzzlesGenerating: boolean;
  canReview: boolean;
  canGenerateRoom: boolean;
  generateRoomDisabledReason?: string;
  onGenerateRoom: () => void;
  onGenerateThemes: () => void;
  onOpenReview: () => void;
  onStepNavigate: (step: WorkspaceStepId) => void;
  headerExtra?: ReactNode;
  children: ReactNode;
};

export function ExperienceDesignerShell({
  navMenu,
  hasBlueprint,
  puzzlesGenerating,
  canReview,
  canGenerateRoom,
  generateRoomDisabledReason,
  onGenerateRoom,
  onGenerateThemes,
  onOpenReview,
  onStepNavigate,
  headerExtra,
  children,
}: ExperienceDesignerShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeStep = workspaceStepFromPath(location.pathname);

  const showStudioSegment = activeStep === "studio" || activeStep === "curate";

  return (
    <div className="experience-designer builder-route--fullpage" data-testid="experience-designer">
      <header className="experience-designer__header glass-panel flex items-center gap-2 px-2 md:gap-3 md:px-4">
        <WorkspaceNavMenu {...navMenu} />
        <Separator orientation="vertical" className="mx-1 hidden h-8 md:block" />
        <WorkspaceStepper
          activeStep={activeStep}
          onStepNavigate={onStepNavigate}
          hasBlueprint={hasBlueprint}
          puzzlesGenerating={puzzlesGenerating}
          canReview={canReview}
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
          {activeStep === "compose" ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={onGenerateThemes}>
                Refresh themes
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canGenerateRoom || puzzlesGenerating}
                title={generateRoomDisabledReason}
                onClick={onGenerateRoom}
              >
                {puzzlesGenerating ? "Generating…" : "Generate room"}
              </Button>
            </>
          ) : null}
          {activeStep === "studio" || activeStep === "curate" ? (
            <Button type="button" size="sm" disabled={!canReview} onClick={onOpenReview}>
              Continue to review
            </Button>
          ) : null}
        </div>
      </header>
      <div className="experience-designer__body">
        {children}
      </div>
    </div>
  );
}
