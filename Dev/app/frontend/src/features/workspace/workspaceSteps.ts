export type WorkspaceStepId = "constraints" | "spatial" | "puzzles" | "review";

export type WorkspaceStepDef = {
  id: WorkspaceStepId;
  index: number;
  label: string;
  shortLabel: string;
};

export const WORKSPACE_STEPS: WorkspaceStepDef[] = [
  { id: "constraints", index: 1, label: "Constraints", shortLabel: "1. Constraints" },
  { id: "spatial", index: 2, label: "Spatial Layout", shortLabel: "2. Spatial Layout" },
  { id: "puzzles", index: 3, label: "Puzzles", shortLabel: "3. Puzzles" },
  { id: "review", index: 4, label: "Final Review", shortLabel: "4. Final Review" },
];

export const workspaceStepFromWizard = (wizardStep: string): WorkspaceStepId => {
  switch (wizardStep) {
    case "setup":
    case "themes":
      return "constraints";
    case "themes-puzzles":
      return "puzzles";
    case "output-review":
    case "output-export":
      return "review";
    default:
      return "constraints";
  }
};
