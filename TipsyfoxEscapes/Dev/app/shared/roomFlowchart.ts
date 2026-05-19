/** Mermaid room-flow source from story plan + puzzles (shared by export + UI). */

import type { ProgressionGraph } from "./progressionGraph.js";

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
  progressionGraph?: ProgressionGraph;
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

const buildMermaidFromProgressionGraph = (
  graph: ProgressionGraph,
  mission: string,
  puzzles: FlowchartPuzzle[],
): string => {
  const titleById = new Map(puzzles.map((p) => [p.id, p.title] as const));
  const lines: string[] = ["flowchart TD", `  start([${mission}])`];

  for (const thread of graph.threads) {
    const sgId = nodeId("sg", thread.id);
    lines.push(`  subgraph ${sgId}["${mermaidLabel(thread.label, 48)}"]`);
    for (const pid of thread.puzzleIds) {
      const nid = nodeId("p", pid);
      const label = mermaidLabel(titleById.get(pid) ?? pid);
      lines.push(`    ${nid}["${label}"]`);
    }
    lines.push("  end");
  }

  const mermaidNode = (graphNodeId: string): string | null => {
    const n = graph.nodes.find((x) => x.id === graphNodeId);
    if (!n) return null;
    if (n.kind === "puzzle" && n.puzzleId) return nodeId("p", n.puzzleId);
    if (n.kind === "start") return "start";
    if (n.kind === "gateway") return nodeId("g", n.id);
    if (n.kind === "code") return nodeId("c", n.id);
    if (n.kind === "finale") return "finale";
    return nodeId("n", n.id);
  };

  for (const n of graph.nodes) {
    if (n.kind === "gateway") {
      lines.push(`  ${nodeId("g", n.id)}(("${mermaidLabel(n.label, 40)}"))`);
    }
    if (n.kind === "code") {
      lines.push(`  ${nodeId("c", n.id)}["${mermaidLabel(n.label, 44)}"]`);
    }
  }
  lines.push(`  finale([${mermaidLabel("Finale / exit", 40)}])`);

  for (const edge of graph.edges) {
    const from = mermaidNode(edge.from);
    const to = mermaidNode(edge.to);
    if (!from || !to) continue;
    if (edge.kind === "contributes") {
      lines.push(`  ${from} -.->|${mermaidLabel(edge.label ?? "fragment", 12)}| ${to}`);
    } else if (edge.label === "Cross-track clue") {
      lines.push(`  ${from} -.-> ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  return lines.join("\n");
};

export const buildRoomFlowchartMermaid = (
  storyPlan: FlowchartStoryPlan | null | undefined,
  puzzles: FlowchartPuzzle[],
): string | null => {
  const main = puzzles.filter((p) => (p.audienceTrack ?? "main") !== "youth_addon");
  const junior = puzzles.filter((p) => p.audienceTrack === "youth_addon");
  if (main.length === 0 && junior.length === 0) return null;

  const mission = mermaidLabel(storyPlan?.missionObjective ?? "Complete the escape room mission");

  if (storyPlan?.progressionGraph && storyPlan.progressionGraph.nodes.length > 0) {
    const graphSource = buildMermaidFromProgressionGraph(storyPlan.progressionGraph, mission, puzzles);
    if (junior.length === 0) return graphSource;
    const lines = graphSource.split("\n");
    const jgId = nodeId("sg", "junior_track");
    lines.push(`  subgraph ${jgId}["Junior add-on (parallel)"]`);
    for (const puzzle of junior) {
      const pid = nodeId("j", puzzle.id);
      lines.push(`    ${pid}["${mermaidLabel(puzzle.title)}"]`);
      lines.push(`  start -.-> ${pid}`);
    }
    lines.push("  end");
    return lines.join("\n");
  }

  const orderedMain = [...main].sort((a, b) => puzzleStageOrderWeight(a) - puzzleStageOrderWeight(b));
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
