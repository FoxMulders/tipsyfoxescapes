import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  WORKSPACE_STEPS,
  stepAccessState,
  type StepAccessState,
  type WorkspaceStepId,
} from "./workspaceSteps";

type WorkspaceStepperProps = {
  activeStep: WorkspaceStepId;
  onStepNavigate: (step: WorkspaceStepId) => void;
  hasBlueprint: boolean;
  puzzlesGenerating: boolean;
  canReview: boolean;
};

function StepPill({
  label,
  state,
  disabled,
  onClick,
}: {
  label: string;
  state: StepAccessState;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={state === "active" ? "default" : "ghost"}
      size="sm"
      disabled={disabled || state === "locked"}
      aria-current={state === "active" ? "step" : undefined}
      className={cn(
        "h-8 gap-1.5 px-2.5 text-xs font-semibold sm:px-3 sm:text-sm",
        state === "complete" && "text-cyan-400/90",
        state === "locked" && "opacity-40",
      )}
      onClick={onClick}
    >
      {state === "complete" ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(".")[0]?.trim() ?? label}</span>
    </Button>
  );
}

export function WorkspaceStepper({
  activeStep,
  onStepNavigate,
  hasBlueprint,
  puzzlesGenerating,
  canReview,
}: WorkspaceStepperProps) {
  const mainSteps = WORKSPACE_STEPS.filter((s) => s.inMainStepper);

  return (
    <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1" aria-label="Workspace steps">
      {mainSteps.map((step, index) => {
        const state = stepAccessState(step.id, activeStep, { hasBlueprint, puzzlesGenerating, canReview });
        const disabled = step.transient || state === "locked";
        return (
          <div key={step.id} className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {index > 0 ? (
              <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
                →
              </span>
            ) : null}
            <StepPill
              label={step.shortLabel}
              state={state}
              disabled={disabled}
              onClick={() => onStepNavigate(step.id)}
            />
          </div>
        );
      })}
    </nav>
  );
}

export function StudioSegmentToggle({
  active,
  onStudio,
  onCurate,
}: {
  active: "studio" | "curate";
  onStudio: () => void;
  onCurate: () => void;
}) {
  return (
    <div
      className="experience-studio-segment mr-2 flex shrink-0 rounded-md border border-white/10 p-0.5"
      role="group"
      aria-label="Studio view"
    >
      <Button type="button" size="sm" variant={active === "studio" ? "default" : "ghost"} className="h-7 px-2.5 text-xs" onClick={onStudio}>
        Canvas
      </Button>
      <Button type="button" size="sm" variant={active === "curate" ? "default" : "ghost"} className="h-7 px-2.5 text-xs" onClick={onCurate}>
        Puzzles
      </Button>
    </div>
  );
}
