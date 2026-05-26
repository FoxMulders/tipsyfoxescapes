import { formatPuzzleCategoryLabel, puzzleCategoryClassSuffix } from "@/lib/puzzleDisplayUtils";

type PuzzleCategoryBadgeProps = {
  puzzle: { id: string; title: string; category: "logic" | "physical" | "electronic" };
};

export function PuzzleCategoryBadge({ puzzle }: PuzzleCategoryBadgeProps) {
  const suffix = puzzleCategoryClassSuffix(puzzle);
  return (
    <span className={`puzzle-type-pill puzzle-type-pill--${suffix}`} title={formatPuzzleCategoryLabel(puzzle)}>
      {formatPuzzleCategoryLabel(puzzle)}
    </span>
  );
}
