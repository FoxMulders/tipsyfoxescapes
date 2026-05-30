export type WorkspaceStepId = "compose" | "generating" | "studio" | "curate" | "review";

export type WorkspaceStepDef = {
  id: WorkspaceStepId;
  index: number;
  label: string;
  shortLabel: string;
  route: string;
  /** User cannot jump to this step from the header (transient UI state). */
  transient?: boolean;
  /** Shown in main stepper (curate is sub-nav under studio). */
  inMainStepper?: boolean;
};

export const WORKSPACE_STEPS: WorkspaceStepDef[] = [
  { id: "compose", index: 1, label: "Compose", shortLabel: "1. Compose", route: "/builder/compose", inMainStepper: true },
  { id: "generating", index: 2, label: "Generate", shortLabel: "2. Generate", route: "/builder/generating", transient: true, inMainStepper: true },
  { id: "studio", index: 3, label: "Studio", shortLabel: "3. Studio", route: "/builder/studio", inMainStepper: true },
  { id: "curate", index: 3, label: "Curate", shortLabel: "Puzzles", route: "/builder/curate", inMainStepper: false },
  { id: "review", index: 4, label: "Review", shortLabel: "4. Review", route: "/builder/review", inMainStepper: true },
];

export const workspaceStepFromPath = (pathname: string): WorkspaceStepId => {
  if (pathname.includes("/builder/generating")) return "generating";
  if (pathname.includes("/builder/studio")) return "studio";
  if (pathname.includes("/builder/curate")) return "curate";
  if (pathname.includes("/builder/review")) return "review";
  return "compose";
};

export const resolveWorkspaceStep = (input: {
  puzzlesGenerating: boolean;
  hasBlueprint: boolean;
  flowWizardStep: string;
}): WorkspaceStepId => {
  if (input.flowWizardStep === "output-review" || input.flowWizardStep === "output-export") return "review";
  if (input.hasBlueprint) return "studio";
  if (input.puzzlesGenerating) return "compose";
  return "compose";
};

export type StepAccessState = "complete" | "active" | "locked";

export function stepAccessState(
  stepId: WorkspaceStepId,
  activeStep: WorkspaceStepId,
  input: { hasBlueprint: boolean; puzzlesGenerating: boolean; canReview: boolean },
): StepAccessState {
  if (stepId === activeStep) return "active";
  if (stepId === "generating") return input.puzzlesGenerating ? "active" : "locked";

  const order: WorkspaceStepId[] = ["compose", "generating", "studio", "review"];
  const stepIdx = order.indexOf(stepId);
  const activeIdx = order.indexOf(activeStep === "curate" ? "studio" : activeStep);

  if (stepId === "compose") return activeIdx > 0 || input.hasBlueprint ? "complete" : "active";
  if (stepId === "studio") {
    if (!input.hasBlueprint) return "locked";
    return activeIdx > stepIdx ? "complete" : activeIdx === stepIdx ? "active" : "complete";
  }
  if (stepId === "review") {
    if (!input.canReview) return "locked";
    return activeStep === "review" ? "active" : input.hasBlueprint ? "complete" : "locked";
  }
  return stepIdx < activeIdx ? "complete" : "locked";
}
