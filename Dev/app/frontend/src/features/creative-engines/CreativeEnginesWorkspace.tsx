import type { ProgressionGraph } from "../../../../shared/progressionGraph.ts";
import { CreativeEnginesDashboard } from "./CreativeEnginesDashboard.tsx";
import { useCreativeEnginesBootstrap } from "./hooks/useCreativeEnginesBootstrap.ts";
import "./creative-engines.css";

export type CreativeEnginesWorkspaceProps = {
  sessionId: string | null;
  puzzles: Array<{ id: string; title: string; audienceTrack?: "main" | "youth_addon" }>;
  storyStages: Array<{
    stage: number;
    title: string;
    storyBeat: string;
    requiredPuzzleIds: string[];
  }>;
  progressionGraph?: ProgressionGraph | null;
  youthAddOnEnabled: boolean;
};

export function CreativeEnginesWorkspace(props: CreativeEnginesWorkspaceProps): JSX.Element | null {
  useCreativeEnginesBootstrap({
    sessionKey: props.sessionId ?? "local",
    puzzles: props.puzzles,
    stages: props.storyStages,
    progressionGraph: props.progressionGraph,
    youthAddOnEnabled: props.youthAddOnEnabled,
  });

  if (!props.puzzles.length) return null;

  return <CreativeEnginesDashboard />;
}
