import type { RoomSkeleton } from "../../../../shared/roomSkeleton";

export type WorkspaceStepId = "brief" | "generating" | "blueprint" | "review";

export type WorkspaceStepDef = {
  id: WorkspaceStepId;
  index: number;
  label: string;
  shortLabel: string;
  /** User cannot jump to this step from the header (transient UI state). */
  transient?: boolean;
};

export const WORKSPACE_STEPS: WorkspaceStepDef[] = [
  { id: "brief", index: 1, label: "The Brief", shortLabel: "1. The Brief" },
  { id: "generating", index: 2, label: "Master Generation", shortLabel: "2. Generate", transient: true },
  { id: "blueprint", index: 3, label: "Interactive Blueprint", shortLabel: "3. Blueprint" },
  { id: "review", index: 4, label: "Final Review", shortLabel: "4. Review" },
];

export type LayoutStylePreference = RoomSkeleton["flow_pattern"];

export const LAYOUT_STYLE_OPTIONS: { value: LayoutStylePreference; label: string; hint: string }[] = [
  { value: "linear_4zone", label: "4-Zone Linear", hint: "Classic left-to-right room chain" },
  { value: "multilinear", label: "Parallel Tracks", hint: "Two concurrent paths that merge" },
  { value: "nonlinear_open", label: "Open Hub", hint: "Central room with branching spaces" },
];

export const resolveWorkspaceStep = (input: {
  puzzlesGenerating: boolean;
  hasBlueprint: boolean;
  flowWizardStep: string;
}): WorkspaceStepId => {
  if (input.puzzlesGenerating) return "generating";
  if (input.hasBlueprint) return "blueprint";
  if (input.flowWizardStep === "output-review" || input.flowWizardStep === "output-export") return "review";
  return "brief";
};
