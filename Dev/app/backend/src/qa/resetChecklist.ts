export type ResetChecklistPuzzle = {
  id: string;
  title: string;
  category: "logic" | "physical" | "electronic";
};

export type ResetChecklistInput = {
  puzzles: ResetChecklistPuzzle[];
  availableItems: string[];
};

export const buildResetChecklistSteps = (input: ResetChecklistInput): string[] => {
  const hasElectronic = input.puzzles.some((p) => p.category === "electronic");
  const steps = [
    ...(hasElectronic ? ["Power down electronic puzzles and disconnect batteries if required."] : []),
    "Reset locks, codes, and props to their starting positions.",
    ...input.puzzles.map(
      (p, i) =>
        `Puzzle ${i + 1} — ${p.title}: restore props, clear player markings, verify ${p.category} station.`,
    ),
    ...input.availableItems.map((item) => `Return "${item}" to its documented home position.`),
    "Run a 60-second walkthrough: timer at zero, clue screen cleared, GM console shows 0 puzzles solved.",
  ];
  return steps;
};

export type ResetValidationIssue = {
  code: string;
  message: string;
  requiredChange: string;
};

/** Venue reset checklist must cover electronics when the room has electronic puzzles. */
export const validateResetChecklistCoverage = (
  steps: string[],
  input: ResetChecklistInput,
): ResetValidationIssue[] => {
  const issues: ResetValidationIssue[] = [];
  const corpus = steps.join("\n").toLowerCase();
  const hasElectronic = input.puzzles.some((p) => p.category === "electronic");

  if (hasElectronic && !/power down|electronic|batter/i.test(corpus)) {
    issues.push({
      code: "RESET_MISSING_ELECTRONICS",
      message: "Electronic puzzles require a power-down / wiring reset step.",
      requiredChange: "Add a step to power down electronics and verify wiring is safe.",
    });
  }

  for (const puzzle of input.puzzles) {
    if (!corpus.includes(puzzle.title.toLowerCase())) {
      issues.push({
        code: "RESET_MISSING_PUZZLE",
        message: `Reset checklist missing puzzle: ${puzzle.title}`,
        requiredChange: `Add a per-puzzle reset line for "${puzzle.title}".`,
      });
    }
  }

  if (input.availableItems.length > 0) {
    const missingItem = input.availableItems.find((item) => !corpus.includes(item.toLowerCase()));
    if (missingItem) {
      issues.push({
        code: "RESET_MISSING_PROP",
        message: `Reset checklist missing prop: ${missingItem}`,
        requiredChange: `Add return-to-home step for "${missingItem}".`,
      });
    }
  }

  return issues;
};
