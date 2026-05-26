export type PuzzleCategory = "logic" | "physical" | "electronic";

export const isMaglockPuzzle = (puzzle: { id?: string; title?: string; category: string }): boolean => {
  const blob = `${puzzle.id ?? ""} ${puzzle.title ?? ""}`.toLowerCase();
  return puzzle.category === "electronic" && (blob.includes("maglock") || blob.includes("magnetic lock"));
};

export const formatPuzzleCategoryLabel = (puzzle: {
  id?: string;
  title?: string;
  category: string;
}): string => {
  if (isMaglockPuzzle(puzzle)) return "Electronic / Maglock";
  if (puzzle.category === "logic") return "Logic";
  if (puzzle.category === "physical") return "Physical";
  if (puzzle.category === "electronic") return "Electronic";
  return puzzle.category;
};

export const puzzleCategoryClassSuffix = (puzzle: {
  id?: string;
  title?: string;
  category: string;
}): string => {
  if (isMaglockPuzzle(puzzle)) return "maglock";
  if (puzzle.category === "logic" || puzzle.category === "physical" || puzzle.category === "electronic") {
    return puzzle.category;
  }
  return "logic";
};

/** Extract digit-length hints from solve copy for micro-copy under code fields. */
export const extractCodeConstraintHint = (text: string): string | null => {
  const t = text.trim();
  if (!t) return null;
  const exact = t.match(/(?:requires?\s+)?exactly\s+(\d+)\s+digit/i);
  if (exact) return `(Requires exactly ${exact[1]} digits)`;
  const nDigit = t.match(/(\d+)[-\s]?digit/i);
  if (nDigit) return `(Requires exactly ${nDigit[1]} digits)`;
  const wordLock = t.match(/(\d+)[-\s]?letter/i);
  if (wordLock) return `(Requires exactly ${wordLock[1]} letters)`;
  return null;
};

export const parseStagingPropLine = (
  line: string,
): { badge: string | null; body: string } => {
  const match = line.match(/^(Used for:\s*Puzzle\s*#\d+[^:]*?)(?::\s*(.+))?$/i);
  if (!match) return { badge: null, body: line };
  return { badge: match[1].trim(), body: (match[2] ?? "").trim() || line.replace(match[1], "").replace(/^:\s*/, "") };
};
