import { useEffect, useRef } from "react";
import type { ProgressionGraph } from "../../../../../shared/progressionGraph.ts";
import { creativeEnginesStore } from "../store.ts";

type BootstrapInput = {
  puzzles: Array<{ id: string; title: string; audienceTrack?: "main" | "youth_addon" }>;
  stages: Array<{
    stage: number;
    title: string;
    storyBeat: string;
    requiredPuzzleIds: string[];
  }>;
  progressionGraph?: ProgressionGraph | null;
  youthAddOnEnabled: boolean;
  sessionKey: string;
};

export function useCreativeEnginesBootstrap(input: BootstrapInput): void {
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!input.puzzles.length) return;
    const key = `${input.sessionKey}:${input.puzzles.map((p) => p.id).join(",")}:${input.stages.length}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    creativeEnginesStore.bootstrap({
      puzzles: input.puzzles,
      stages: input.stages,
      progressionGraph: input.progressionGraph,
      youthAddOnEnabled: input.youthAddOnEnabled,
    });
  }, [input.sessionKey, input.puzzles, input.stages, input.progressionGraph, input.youthAddOnEnabled]);
}
