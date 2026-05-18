type PuzzleLike = {
  id: string;
  category: string;
  title: string;
  difficulty: string;
  audienceTrack?: string;
  stageHint?: string;
};

export type PuzzlePreview = {
  id: string;
  category: string;
  title: string;
  previewLabel: string;
  difficulty: string;
  audienceTrack?: string;
  stageHint?: string;
  locked: true;
};

export type StoryPlanPreview = {
  situation: string;
  premise: string;
  missionObjective: string;
  progressionRule: string;
  stages: Array<{ stage: number; title: string; previewLabel: string }>;
  puzzleLinks: Array<{ puzzleId: string; puzzleTitle: string; storyRole: string }>;
  locked: true;
};

const stripDetail = (text: string, max = 120): string => {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
};

export const toPuzzlePreview = (puzzle: PuzzleLike, index: number): PuzzlePreview => {
  const label = stripDetail(puzzle.title, 80);
  return {
    id: puzzle.id,
    category: puzzle.category,
    title: puzzle.title,
    previewLabel: `Puzzle ${index + 1}: ${label}`,
    difficulty: puzzle.difficulty,
    audienceTrack: puzzle.audienceTrack,
    stageHint: puzzle.stageHint ? "Stage assigned" : undefined,
    locked: true,
  };
};

export const redactPuzzlesForClient = (
  puzzles: PuzzleLike[],
  fullAccess: boolean,
): PuzzleLike[] | PuzzlePreview[] => {
  if (fullAccess) return puzzles;
  return puzzles.map((p, i) => toPuzzlePreview(p, i));
};

export const redactStoryPlanForClient = (
  storyPlan: Record<string, unknown> | null | undefined,
  fullAccess: boolean,
): StoryPlanPreview | Record<string, unknown> | null => {
  if (!storyPlan || fullAccess) return storyPlan ?? null;
  const stages = Array.isArray(storyPlan.stages)
    ? (storyPlan.stages as Array<{ stage?: number; title?: string }>).map((st, i) => ({
        stage: typeof st.stage === "number" ? st.stage : i + 1,
        title: String(st.title ?? `Stage ${i + 1}`),
        previewLabel: `Stage ${i + 1}: ${stripDetail(String(st.title ?? "Story beat"), 60)}`,
      }))
    : [];
  const links = Array.isArray(storyPlan.puzzleLinks)
    ? (storyPlan.puzzleLinks as Array<{ puzzleId?: string; puzzleTitle?: string; storyRole?: string }>).map(
        (link, i) => ({
          puzzleId: String(link.puzzleId ?? `pz_${i}`),
          puzzleTitle: stripDetail(String(link.puzzleTitle ?? "Puzzle"), 50),
          storyRole: "Linked beat (details after export credit)",
        }),
      )
    : [];
  return {
    situation: "Story situation unlocks after your export credit is reserved at puzzle generation.",
    premise: "Full premise available once this room is manifested to your account.",
    missionObjective: "Mission objective is hidden until generation is billed to your plan.",
    progressionRule: "Progression details are available in the exported runbook.",
    stages,
    puzzleLinks: links,
    locked: true,
  };
};
