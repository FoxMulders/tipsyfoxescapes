/** Mermaid room-flow source from story plan + puzzles (mirrors server stage grouping). */

export type FlowchartPuzzle = {
  id: string;
  title: string;
  category?: string;
  stageHint?: string;
  audienceTrack?: "main" | "youth_addon";
};

export type FlowchartStoryPlan = {
  missionObjective: string;
  progressionRule?: string;
  stages: Array<{
    stage: number;
    title: string;
    storyBeat?: string;
    requiredPuzzleIds?: string[];
    requiredPuzzleTitles?: string[];
  }>;
  puzzleLinks?: Array<{
    puzzleId: string;
    puzzleTitle: string;
    storyRole?: string;
  }>;
};

const puzzleStageOrderWeight = (puzzle: FlowchartPuzzle): number => {
  const hint = (puzzle.stageHint ?? "").toLowerCase();
  if (!hint) return 2;
  if (
    hint.includes("final") ||
    hint.includes("exit") ||
    hint.includes("end") ||
    hint.includes("opens final door") ||
    hint.includes("boss")
  ) {
    return 3;
  }
  if (hint.includes("intro") || hint.includes("start") || hint.includes("begin") || hint.includes("opening")) {
    return 1;
  }
  if (hint.includes("mid") || hint.includes("middle")) return 2;
  return 2;
};

const mermaidLabel = (raw: string, max = 72): string => {
  const t = raw.replace(/"/g, "'").replace(/[[\]{}|]/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  return (t.length > max ? `${t.slice(0, max - 1)}…` : t) || "—";
};

const nodeId = (prefix: string, key: string): string => `${prefix}_${key.replace(/[^\w]/g, "_").slice(0, 40)}`;

const chunkByTwo = <T>(items: T[]): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += 2) chunks.push(items.slice(i, i + 2));
  return chunks;
};

export const buildRoomFlowchartMermaid = (
  storyPlan: FlowchartStoryPlan | null | undefined,
  puzzles: FlowchartPuzzle[],
): string | null => {
  const main = puzzles.filter((p) => (p.audienceTrack ?? "main") !== "youth_addon");
  const junior = puzzles.filter((p) => p.audienceTrack === "youth_addon");
  if (main.length === 0 && junior.length === 0) return null;

  const orderedMain = [...main].sort((a, b) => puzzleStageOrderWeight(a) - puzzleStageOrderWeight(b));
  const mission = mermaidLabel(storyPlan?.missionObjective ?? "Complete the escape room mission");
  const lines: string[] = ["flowchart TD", `  start([${mission}])`];

  const stages =
    storyPlan?.stages?.length && storyPlan.stages.some((s) => (s.requiredPuzzleIds?.length ?? 0) > 0)
      ? storyPlan.stages
      : chunkByTwo(orderedMain).map((group, index) => ({
          stage: index + 1,
          title: `Stage ${index + 1}`,
          storyBeat: "",
          requiredPuzzleIds: group.map((p) => p.id),
          requiredPuzzleTitles: group.map((p) => p.title),
        }));

  let prevMerge: string | null = "start";

  for (const stage of stages) {
    const ids = stage.requiredPuzzleIds ?? [];
    const titles = stage.requiredPuzzleTitles ?? [];
    const stagePuzzles: FlowchartPuzzle[] = ids
      .map((id, i) => orderedMain.find((p) => p.id === id) ?? { id, title: titles[i] ?? id })
      .filter((p): p is FlowchartPuzzle => Boolean(p?.id));

    if (stagePuzzles.length === 0) continue;

    const sgId = nodeId("sg", `stage_${stage.stage}`);
    const beat = stage.storyBeat ? ` — ${mermaidLabel(stage.storyBeat, 40)}` : "";
    lines.push(`  subgraph ${sgId}["${mermaidLabel(`${stage.title}${beat}`, 56)}"]`);

    const puzzleNodeIds: string[] = [];
    for (const puzzle of stagePuzzles) {
      const pid = nodeId("p", puzzle.id);
      puzzleNodeIds.push(pid);
      const link = storyPlan?.puzzleLinks?.find((l) => l.puzzleId === puzzle.id);
      const role = link?.storyRole ? `\\n${mermaidLabel(link.storyRole, 36)}` : "";
      const cat = puzzle.category ? ` (${puzzle.category})` : "";
      lines.push(`    ${pid}["${mermaidLabel(puzzle.title)}${cat}${role}"]`);
    }
    lines.push("  end");

    for (const pid of puzzleNodeIds) {
      if (prevMerge) lines.push(`  ${prevMerge} --> ${pid}`);
    }

    const mergeId = nodeId("m", `stage_${stage.stage}`);
    lines.push(`  ${mergeId}(("Stage ${stage.stage} complete"))`);
    for (const pid of puzzleNodeIds) {
      lines.push(`  ${pid} --> ${mergeId}`);
    }
    prevMerge = mergeId;
  }

  if (prevMerge && prevMerge !== "start") {
    lines.push(`  ${prevMerge} --> finale([Finale / exit sequence])`);
  }

  if (junior.length > 0) {
    const jgId = nodeId("sg", "junior_track");
    lines.push(`  subgraph ${jgId}["Junior add-on (parallel)"]`);
    for (const puzzle of junior) {
      const pid = nodeId("j", puzzle.id);
      lines.push(`    ${pid}["${mermaidLabel(puzzle.title)}"]`);
      lines.push(`  start -.-> ${pid}`);
    }
    lines.push("  end");
  }

  if (storyPlan?.progressionRule) {
    lines.push(`  prog["${mermaidLabel(storyPlan.progressionRule, 90)}"]`);
    lines.push("  prog -.-> start");
  }

  return lines.join("\n");
};

export const wrapMermaidMarkdown = (source: string, title: string): string =>
  `# ${title}\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`;
