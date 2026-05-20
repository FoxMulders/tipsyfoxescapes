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

const crossTrackEdgeLabel = (
  donor: GraphPuzzle,
  recipient: GraphPuzzle,
  donorZone: string,
  recipientZone: string,
): string =>
  `Cross-track: "${donor.title}" (${donorZone}) → "${recipient.title}" (${recipientZone})`;

const crossStageKeyEdgeLabel = (donor: GraphPuzzle, recipient: GraphPuzzle, donorZone: string): string =>
  `Cross-stage key: "${donor.title}" at ${donorZone} unlocks "${recipient.title}"`;

/** Pick opening, mid, and terminal beats per track for multi-location master codes. */
const masterCodeContributorIds = (threads: ProgressionThread[], threadPuzzles: GraphPuzzle[][]): string[] => {
  const picked: string[] = [];
  const seen = new Set<string>();
  threads.forEach((_thread, threadIndex) => {
    const list = threadPuzzles[threadIndex] ?? [];
    const indices =
      list.length <= 1 ? [0] : list.length === 2 ? [0, list.length - 1] : [0, Math.floor(list.length / 2), list.length - 1];
    for (const idx of indices) {
      const id = list[idx]?.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        picked.push(id);
      }
    }
  });
  return picked.slice(0, 6);
};

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
          const donorZone = threads[donorThread]?.zoneLabel ?? "track";
          const recipientZone = threads[threadIndex]?.zoneLabel ?? "track";
          edges.push({
            from: puzzleNodeId(donor.id),
            to: nid,
            kind: "requires",
            label: crossTrackEdgeLabel(donor, puzzle, donorZone, recipientZone),
          });
        }
      }
    }
    if (parallelWidth > 1 && list.length > 1) {
      const donorThread = (threadIndex + 1) % parallelWidth;
      const donorList = threadPuzzles[donorThread] ?? [];
      const earlyDonor = donorList[0];
      const lateRecipient = list[list.length - 1];
      if (earlyDonor && lateRecipient && earlyDonor.id !== lateRecipient.id) {
        const donorZone = threads[donorThread]?.zoneLabel ?? "track";
        edges.push({
          from: puzzleNodeId(earlyDonor.id),
          to: puzzleNodeId(lateRecipient.id),
          kind: "requires",
          label: crossStageKeyEdgeLabel(earlyDonor, lateRecipient, donorZone),
        });
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
    const contributors = masterCodeContributorIds(threads, threadPuzzles);
    masterCodeLabel = contributors.map((id) => fragmentByPuzzleId.get(id) ?? "?").join("");
    codeNodeId = "code_master";
    nodes.push({ id: codeNodeId, kind: "code", label: `Master sequence ${masterCodeLabel}` });
    const lastGateway = gatewayIds[gatewayIds.length - 1]!;
    edges.push({ from: lastGateway, to: codeNodeId, kind: "requires" });
    for (const pid of contributors) {
      const thread = threads.find((t) => t.puzzleIds.includes(pid));
      edges.push({
        from: puzzleNodeId(pid),
        to: codeNodeId,
        kind: "contributes",
        label: `${thread?.zoneLabel ?? "Zone"}:${fragmentByPuzzleId.get(pid) ?? "?"}`,
      });
    }
  }

  let finaleEntryId: string | undefined = codeNodeId ?? gatewayIds[gatewayIds.length - 1];
  if (parallelWidth > 1 && (codeNodeId || gatewayIds.length > 0)) {
    const asymId = "gateway_asymmetric_finale";
    nodes.push({ id: asymId, kind: "gateway", label: "Asymmetric finale gateway" });
    if (codeNodeId) {
      edges.push({ from: codeNodeId, to: asymId, kind: "requires", label: "Master code accepted" });
    } else if (gatewayIds.length > 0) {
      edges.push({
        from: gatewayIds[gatewayIds.length - 1]!,
        to: asymId,
        kind: "requires",
        label: "Merge convergence",
      });
    }
    for (const thread of threads) {
      const terminalId = thread.puzzleIds[thread.puzzleIds.length - 1];
      if (terminalId) {
        edges.push({
          from: puzzleNodeId(terminalId),
          to: asymId,
          kind: "requires",
          label: `Terminal — ${thread.zoneLabel}`,
        });
      }
      if (thread.puzzleIds.length >= 3) {
        const midId = thread.puzzleIds[Math.floor(thread.puzzleIds.length / 2)]!;
        edges.push({
          from: puzzleNodeId(midId),
          to: asymId,
          kind: "requires",
          label: `Mid-branch — ${thread.zoneLabel}`,
        });
      }
    }
    finaleEntryId = asymId;
  }

  nodes.push({ id: "finale", kind: "finale", label: "Finale / exit sequence" });
  if (finaleEntryId) {
    edges.push({ from: finaleEntryId, to: "finale", kind: "requires" });
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
            : `Cross-check outputs across zones; combined fragment slice: ${fragments || "—"}.`,
          isLast
            ? "Feed every branch terminal plus the master sequence into the asymmetric finale gateway before declaring victory."
            : "Route at least one cross-stage key from an early beat on another track into this wave (narrative permission, UV clue, or code fragment).",
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
    const crossTrack = requires.some((e) => e.label?.startsWith("Cross-track:"));
    const crossStage = requires.some((e) => e.label?.startsWith("Cross-stage key:"));
    puzzleLinks.push({
      puzzleId: node.puzzleId,
      puzzleTitle: title,
      storyRole: crossStage
        ? `Cross-stage dependency on ${thread?.label ?? "parallel track"}`
        : crossTrack
          ? `Cross-track bridge on ${thread?.label ?? "parallel track"}`
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

  const zoneList = graph.threads.map((t) => t.zoneLabel).join(", ");
  const progressionParts = [
    progressionCoreLine(graph.pathKind, graph.parallelWidth),
    graph.threads.length > 1
      ? `Parallel/open threads (${zoneList}) may advance independently so multiple crews stay busy without a single bottleneck loop.`
      : "",
    "Cross-stage keys force beats on one track to consume narrative or physical outputs from another track before late-game locks open.",
    graph.masterCodeLabel
      ? `Multi-layer code gate: compile fragments from distinct zones into master sequence ${graph.masterCodeLabel} before the terminal unlock.`
      : "Merge gates require every live track at that wave before the next beat opens.",
    graph.parallelWidth > 1
      ? "Asymmetric finale gateway: the exit sequence waits for terminal nodes from multiple branching paths—not one rigid linear checkpoint."
      : "",
  ].filter(Boolean);
  const progressionRule = progressionParts.join(" ");

  return {
    stages,
    puzzleLinks,
    progressionRule,
    stagingDiagram: stagingLines.join("\n"),
  };
};
