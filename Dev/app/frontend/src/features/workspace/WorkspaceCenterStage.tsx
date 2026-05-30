import type { ReactNode } from "react";
import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";
import type { WorkspaceStepId } from "./workspaceSteps";

type WorkspaceCenterStageProps = {
  step: WorkspaceStepId;
  blueprintCanvas?: ReactNode;
};

export function WorkspaceCenterStage({ step, blueprintCanvas }: WorkspaceCenterStageProps) {
  if (step === "generating") {
    return (
      <div className="workspace-center-stage workspace-center-stage--generating flex h-full min-h-0 items-center justify-center p-6">
        <GenerationProgressIndicator active phases={PUZZLE_GENERATION_PHASES} className="max-w-md w-full" />
      </div>
    );
  }

  if ((step === "blueprint" || step === "review") && blueprintCanvas) {
    return <div className="workspace-center-stage workspace-center-stage--blueprint h-full min-h-0">{blueprintCanvas}</div>;
  }

  return (
    <div className="workspace-center-stage workspace-center-stage--brief flex h-full min-h-0 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="workspace-center-placeholder max-w-md">
        <p className="m-0 text-sm font-semibold uppercase tracking-widest text-cyan-400/80">Blueprint locked</p>
        <h3 className="mt-2 mb-0 text-lg font-bold text-slate-100">Complete the brief, then generate your room</h3>
        <p className="mt-2 mb-0 text-sm leading-relaxed text-slate-400">
          The interactive logic map appears here after Master Generation finishes — skeleton zones, puzzle beats, and Council
          validation. No manual floor-planning required upfront.
        </p>
      </div>
    </div>
  );
}
