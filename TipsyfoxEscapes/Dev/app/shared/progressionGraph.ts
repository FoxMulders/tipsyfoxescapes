/**
 * Session-scoped progression graph: puzzles, merge gates, composite codes, and finale.
 * Labels are derived from the host's puzzles, props, and environment — never fixed example-room names.
 */

export type FlowPathKind = "linear" | "nonlinear" | "multilinear";

export type ProgressionNodeKind = "start" | "puzzle" | "gateway" | "code" | "finale";

export type ProgressionNode = {
  id: string;
  kind: ProgressionNodeKind;
  label: string;
  puzzleId?: string;
  threadId?: string;
  waveIndex?: number;
};

export type ProgressionEdgeKind = "requires" | "contributes";

export type ProgressionEdge = {
  from: string;
  to: string;
  kind: ProgressionEdgeKind;
  label?: string;
};

export type ProgressionThread = {
  id: string;
  label: string;
  zoneLabel: string;
  puzzleIds: string[];
};

export type ProgressionGraph = {
  nodes: ProgressionNode[];
  edges: ProgressionEdge[];
  threads: ProgressionThread[];
  parallelWidth: number;
  pathKind: FlowPathKind;
  masterCodeLabel: string;
};

export type GraphPuzzle = {
  id: string;
  title: string;
  category?: string;
  stageHint?: string;
  physical_anchor_prop?: string;
  audienceTrack?: "main" | "youth_addon";
};

export type BuildProgressionGraphInput = {
  puzzles: GraphPuzzle[];
  playersConcurrent: number;
  environmentType?: string;
  inventoryItems?: string[];
  pathKind: FlowPathKind;
};

export type DerivedStoryStage = {
  stage: number;
  title: string;
  storyBeat: string;
  whyThisStageExists: string;
  objective: string;
  whatPlayersMustDo: string[];
  requiredPuzzleIds: string[];
  requiredPuzzleTitles: string[];
  reveals: string;
};

export type DerivedPuzzleLink = {
  puzzleId: string;
  puzzleTitle: string;
  storyRole: string;
  unlocks: string;
};

export type DerivedStoryViews = {
  stages: DerivedStoryStage[];
  puzzleLinks: DerivedPuzzleLink[];
  progressionRule: string;
  stagingDiagram: string;
};

const puzzleStageOrderWeight = (puzzle: GraphPuzzle): number => {
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
  return 2;
};

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

const fragmentDigit = (puzzleId: string, index: number): string => {
  let h = 0;
  for (let i = 0; i < puzzleId.length; i += 1) {
    h = (h + puzzleId.charCodeAt(i) * (i + 3)) % 10;
  }
  return String((h + index + 1) % 10);
};

const categoryStationFallback = (category?: string): string => {
  if (category === "electronic") return "Tech station";
  if (category === "physical") return "Hands-on station";
  if (category === "logic") return "Deduction station";
  return "Clue station";
};

const threadLabelFor = (
  threadIndex: number,
  puzzlesInThread: GraphPuzzle[],
  inventory: string[],
): { threadLabel: string; zoneLabel: string } => {
  const anchor = puzzlesInThread.map((p) => (p.physical_anchor_prop ?? "").trim()).find(Boolean);
  if (anchor) {
    return { threadLabel: anchor, zoneLabel: anchor };
  }
  const inv = inventory[threadIndex]?.trim();
  if (inv) {
    return { threadLabel: `${inv} track`, zoneLabel: inv };
  }
  const cat = puzzlesInThread[0]?.category;
  const station = categoryStationFallback(cat);
  const letter = String.fromCharCode(65 + threadIndex);
  return { threadLabel: `${station} (${letter})`, zoneLabel: `${station} ${letter}` };
};

const resolveParallelWidth = (pathKind: FlowPathKind, playersConcurrent: number, puzzleCount: number): number => {
  if (puzzleCount <= 1) return 1;
  if (pathKind === "linear") return 1;
  if (pathKind === "multilinear") {
    return clamp(playersConcurrent >= 5 ? 3 : 2, 2, Math.min(3, puzzleCount));
  }
  return clamp(Math.ceil(playersConcurrent / 2), 2, Math.min(4, puzzleCount));
};

const nodeById = (graph: ProgressionGraph, id: string): ProgressionNode | undefined =>
  graph.nodes.find((n) => n.id === id);

const edgesTo = (graph: ProgressionGraph, nodeId: string): ProgressionEdge[] =>
  graph.edges.filter((e) => e.to === nodeId && e.kind === "requires");

const edgesFrom = (graph: ProgressionGraph, nodeId: string): ProgressionEdge[] =>
  graph.edges.filter((e) => e.from === nodeId);

const puzzleNodeId = (puzzleId: string): string => `puzzle_${puzzleId}`;

export const buildProgressionGraph = (input: BuildProgressionGraphInput): ProgressionGraph => {
  const inventory = (input.inventoryItems ?? []).map((s) => s.trim()).filter(Boolean);
  const main = [...input.puzzles]
    .filter((p) => (p.audienceTrack ?? "main") !== "youth_addon")
    .sort((a, b) => puzzleStageOrderWeight(a) - puzzleStageOrderWeight(b));

  const parallelWidth = resolveParallelWidth(input.pathKind, input.playersConcurrent, main.length);
  const nodes: ProgressionNode[] = [{ id: "start", kind: "start", label: "Mission start" }];
  const edges: ProgressionEdge[] = [];
  const threads: ProgressionThread[] = [];

  if (main.length === 0) {
    nodes.push({ id: "finale", kind: "finale", label: "Finale / exit" });
    edges.push({ from: "start", to: "finale", kind: "requires" });
    return {
      nodes,
      edges,
      threads: [],
      parallelWidth: 1,
      pathKind: input.pathKind,
      masterCodeLabel: "",
    };
  }

  const threadPuzzles: GraphPuzzle[][] = Array.from({ length: parallelWidth }, () => []);
  main.forEach((puzzle, index) => {
    threadPuzzles[index % parallelWidth]!.push(puzzle);
  });

  const fragmentByPuzzleId = new Map<string, string>();
  const puzzleIdToNode = new Map<string, string>();

  threadPuzzles.forEach((list, threadIndex) => {
    if (list.length === 0) return;
    const threadId = `thread_${threadIndex}`;
    const { threadLabel, zoneLabel } = threadLabelFor(threadIndex, list, inventory);
    threads.push({
      id: threadId,
      label: threadLabel,
      zoneLabel,
      puzzleIds: list.map((p) => p.id),
    });

    list.forEach((puzzle, waveIndex) => {
      const nid = puzzleNodeId(puzzle.id);
      puzzleIdToNode.set(puzzle.id, nid);
      fragmentByPuzzleId.set(puzzle.id, fragmentDigit(puzzle.id, threadIndex + waveIndex));
      nodes.push({
        id: nid,
        kind: "puzzle",
        label: puzzle.title,
        puzzleId: puzzle.id,
        threadId,
        waveIndex,
      });
    });
  });

  // Opening: start unlocks first puzzle in each active thread (parallel).
  for (const thread of threads) {
    const firstId = thread.puzzleIds[0];
    if (!firstId) continue;
    edges.push({ from: "start", to: puzzleNodeId(firstId), kind: "requires", label: "Open thread" });
  }

  // Within-thread chains and cross-thread asymmetric links.
  threadPuzzles.forEach((list, threadIndex) => {
    for (let w = 0; w < list.length; w += 1) {
      const puzzle = list[w]!;
      const nid = puzzleNodeId(puzzle.id);
      if (w > 0) {
        const prev = list[w - 1]!;
        edges.push({
          from: puzzleNodeId(prev.id),
          to: nid,
          kind: "requires",
          label: "Thread chain",
        });
      }
      if (w > 0 && parallelWidth > 1) {
        const donorThread = (threadIndex + 1) % parallelWidth;
        const donorList = threadPuzzles[donorThread] ?? [];
        const donor = donorList[w - 1];
        if (donor && donor.id !== puzzle.id) {
          edges.push({
            from: puzzleNodeId(donor.id),
            to: nid,
            kind: "requires",
            label: "Cross-track clue",
          });
        }
      }
    }
  });

  const maxDepth = Math.max(0, ...threadPuzzles.map((list) => list.length));
  const gatewayIds: string[] = [];
  for (let wave = 0; wave < maxDepth; wave += 1) {
    const wavePuzzles = threadPuzzles
      .map((list) => list[wave])
      .filter((p): p is GraphPuzzle => Boolean(p));
    if (wavePuzzles.length === 0) continue;
    const gid = `gateway_w${wave}`;
    gatewayIds.push(gid);
    nodes.push({
      id: gid,
      kind: "gateway",
      label: wave === maxDepth - 1 ? "Pre-finale merge gate" : `Merge gate ${wave + 1}`,
      waveIndex: wave,
    });
    for (const puzzle of wavePuzzles) {
      edges.push({ from: puzzleNodeId(puzzle.id), to: gid, kind: "requires" });
    }
    if (wave > 0) {
      const prevGid = `gateway_w${wave - 1}`;
      edges.push({ from: prevGid, to: gid, kind: "requires", label: "Stage advance" });
    }
    const nextWavePuzzles = threadPuzzles
      .map((list) => list[wave + 1])
      .filter((p): p is GraphPuzzle => Boolean(p));
    for (const next of nextWavePuzzles) {
      edges.push({ from: gid, to: puzzleNodeId(next.id), kind: "requires", label: "Unlock next beat" });
    }
  }

  let masterCodeLabel = "";
  let codeNodeId: string | undefined;
  if (main.length >= 3 && gatewayIds.length > 0) {
    const contributors = threads
      .map((t) => t.puzzleIds[0])
      .filter(Boolean)
      .slice(0, 4);
    masterCodeLabel = contributors.map((id) => fragmentByPuzzleId.get(id) ?? "?").join("");
    codeNodeId = "code_master";
    nodes.push({ id: codeNodeId, kind: "code", label: `Master sequence ${masterCodeLabel}` });
    const lastGateway = gatewayIds[gatewayIds.length - 1]!;
    edges.push({ from: lastGateway, to: codeNodeId, kind: "requires" });
    for (const pid of contributors) {
      edges.push({
        from: puzzleNodeId(pid),
        to: codeNodeId,
        kind: "contributes",
        label: fragmentByPuzzleId.get(pid),
      });
    }
  }

  nodes.push({ id: "finale", kind: "finale", label: "Finale / exit sequence" });
  if (codeNodeId) {
    edges.push({ from: codeNodeId, to: "finale", kind: "requires" });
    const terminalPuzzles = threadPuzzles.map((list) => list[list.length - 1]).filter(Boolean) as GraphPuzzle[];
    for (const p of terminalPuzzles) {
      edges.push({ from: puzzleNodeId(p.id), to: "finale", kind: "requires", label: "Terminal input" });
    }
  } else if (gatewayIds.length > 0) {
    edges.push({ from: gatewayIds[gatewayIds.length - 1]!, to: "finale", kind: "requires" });
  } else {
    const last = main[main.length - 1]!;
    edges.push({ from: puzzleNodeId(last.id), to: "finale", kind: "requires" });
  }

  return {
    nodes,
    edges,
    threads,
    parallelWidth,
    pathKind: input.pathKind,
    masterCodeLabel,
  };
};

const progressionCoreLine = (pathKind: FlowPathKind, parallelWidth: number): string => {
  if (pathKind === "linear") {
    return "Linear path: puzzles unlock in a deliberate chain; keep branches short and label each reveal.";
  }
  if (pathKind === "multilinear") {
    return `Multi-linear path: up to ${parallelWidth} parallel clue tracks run at once, then merge at gates before the finale.`;
  }
  return `Open-path layout: up to ${parallelWidth} stations can stay live for concurrent players; merge gates prevent one crew from blocking the room.`;
};

export const deriveStoryViewsFromGraph = (
  graph: ProgressionGraph,
  puzzles: GraphPuzzle[],
  missionObjective: string,
  environmentType: string,
  pathWhy: { mid: string; final: string },
): DerivedStoryViews => {
  const mission = missionObjective.trim() || "Complete the mission before time elapses.";
  const puzzleById = new Map(puzzles.map((p) => [p.id, p] as const));
  const fragmentByPuzzleId = new Map<string, string>();
  graph.nodes
    .filter((n) => n.kind === "puzzle" && n.puzzleId)
    .forEach((n, i) => {
      if (n.puzzleId) fragmentByPuzzleId.set(n.puzzleId, fragmentDigit(n.puzzleId, i));
    });

  const gateways = graph.nodes.filter((n) => n.kind === "gateway").sort((a, b) => (a.waveIndex ?? 0) - (b.waveIndex ?? 0));
  const stages: DerivedStoryStage[] = [];

  if (gateways.length === 0) {
    const ids = graph.threads.flatMap((t) => t.puzzleIds);
    stages.push({
      stage: 1,
      title: "Stage 1",
      storyBeat: "Single-path progression",
      whyThisStageExists: pathWhy.final,
      objective: `Complete the puzzle path toward: ${mission}`,
      whatPlayersMustDo: ids.map((id) => `Complete "${puzzleById.get(id)?.title ?? id}".`),
      requiredPuzzleIds: ids,
      requiredPuzzleTitles: ids.map((id) => puzzleById.get(id)?.title ?? id),
      reveals: `Finishing unlocks the exit sequence for: ${mission}`,
    });
  } else {
    gateways.forEach((gateway, index) => {
      const wave = gateway.waveIndex ?? index;
      const wavePuzzleIds = graph.threads
        .map((t) => t.puzzleIds[wave])
        .filter((id): id is string => Boolean(id));
      const threadNames = wavePuzzleIds.map((id) => {
        const p = puzzleById.get(id);
        const thread = graph.threads.find((t) => t.puzzleIds.includes(id));
        return thread?.label ?? p?.title ?? id;
      });
      const fragments = wavePuzzleIds.map((id) => fragmentByPuzzleId.get(id) ?? "?").join("");
      const nextGateway = gateways[index + 1];
      const isLast = index === gateways.length - 1;
      stages.push({
        stage: index + 1,
        title: `Stage ${index + 1}`,
        storyBeat:
          wave === 0
            ? "Parallel discovery"
            : isLast
              ? "Terminal convergence"
              : "Cross-track merge",
        whyThisStageExists: isLast ? pathWhy.final : pathWhy.mid,
        objective: isLast
          ? `Merge all branch outputs${graph.masterCodeLabel ? ` into master sequence ${graph.masterCodeLabel}` : ""} and complete: ${mission}`
          : `Run ${threadNames.join(" and ")} in parallel, then satisfy ${gateway.label}.`,
        whatPlayersMustDo: [
          ...wavePuzzleIds.map(
            (id) =>
              `Complete "${puzzleById.get(id)?.title ?? id}" (${graph.threads.find((t) => t.puzzleIds.includes(id))?.zoneLabel ?? "station"}).`,
          ),
          wave === 0
            ? "Split crews across parallel tracks; no single lock should block all teams."
            : `Cross-check outputs; combined fragment slice: ${fragments || "—"}.`,
          isLast
            ? "Verify every thread has fed the finale gate before declaring victory."
            : "Route at least one clue from this stage into a different track (asymmetric gateway).",
        ],
        requiredPuzzleIds: wavePuzzleIds,
        requiredPuzzleTitles: wavePuzzleIds.map((id) => puzzleById.get(id)?.title ?? id),
        reveals: isLast
          ? `All tracks converge; finale unlocks when dependencies are met for: ${mission}`
          : `${gateway.label} opens the next wave of beats toward: ${mission}`,
      });
      void nextGateway;
    });
  }

  const puzzleLinks: DerivedPuzzleLink[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "puzzle" || !node.puzzleId) continue;
    const title = puzzleById.get(node.puzzleId)?.title ?? node.label;
    const thread = graph.threads.find((t) => t.puzzleIds.includes(node.puzzleId!));
    const requires = edgesTo(graph, node.id).filter((e) => e.from.startsWith("puzzle_"));
    const unlocks = edgesFrom(graph, node.id).filter(
      (e) => e.to.startsWith("gateway_") || e.to.startsWith("puzzle_") || e.to === "finale" || e.to === "code_master",
    );
    const frag = fragmentByPuzzleId.get(node.puzzleId) ?? "?";
    const cross = requires.some((e) => e.label === "Cross-track clue");
    puzzleLinks.push({
      puzzleId: node.puzzleId,
      puzzleTitle: title,
      storyRole: cross
        ? `Cross-track link on ${thread?.label ?? "parallel track"}`
        : node.waveIndex === 0
          ? `Opening beat — ${thread?.label ?? "track"}`
          : `Mid-run beat — ${thread?.label ?? "track"}`,
      unlocks:
        unlocks.length > 0
          ? `Contributes fragment ${frag}; ${unlocks
              .map((e) => nodeById(graph, e.to)?.label ?? e.to)
              .slice(0, 3)
              .join(" → ")}.`
          : `Contributes fragment ${frag} toward the master merge.`,
    });
  }

  const env = environmentType.trim() || "your play space";
  const stagingLines: string[] = [
    "### Recommended staging map (from progression graph)",
    "",
    `_Zones follow **your** props and puzzle stations in **${env}** — not a fixed template room._`,
    "",
    "| Track | Zone | Puzzles |",
    "|---|---|---|",
  ];
  for (const thread of graph.threads) {
    const titles = thread.puzzleIds.map((id) => puzzleById.get(id)?.title ?? id).join("; ");
    stagingLines.push(`| ${thread.label} | ${thread.zoneLabel} | ${titles || "—"} |`);
  }
  if (graph.masterCodeLabel) {
    stagingLines.push(
      "",
      `_Master combination (fragments from opening beats per track): **${graph.masterCodeLabel}**_`,
    );
  }
  stagingLines.push(
    "",
    "```text",
    ...graph.threads.map((t) => `  [${t.zoneLabel}] ${t.puzzleIds.length} beat(s)`),
    graph.masterCodeLabel ? `       └─> merge gates ─> code ${graph.masterCodeLabel} ─> finale` : "       └─> merge gates ─> finale",
    "```",
  );

  const progressionRule = `${progressionCoreLine(graph.pathKind, graph.parallelWidth)} Parallel tracks may advance independently; merge gates require every live track at that wave. Fragments from separate tracks combine${graph.masterCodeLabel ? ` into master sequence ${graph.masterCodeLabel}` : ""}; the finale requires inputs from multiple preceding branches when more than one track exists.`;

  return {
    stages,
    puzzleLinks,
    progressionRule,
    stagingDiagram: stagingLines.join("\n"),
  };
};
