import { createLanguageModel, extractJson, promptWithTimeout } from "./browserAiRuntime.ts";

export type BrowserPuzzleDraft = {
  category: "logic" | "physical" | "electronic";
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason: string;
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
};

export type BrowserPuzzleGenerateInput = {
  themeName: string;
  themeTldr: string;
  themeDescription: string;
  environmentType: string;
  availableItems: string;
  roomDifficulty: "easy" | "medium" | "hard";
  logicCount: number;
  physicalCount: number;
  electronicCount: number;
  targetInterface?: string;
};

const parsePuzzlesPayload = (raw: string, expected: number): BrowserPuzzleDraft[] | null => {
  const parsed = JSON.parse(extractJson(raw)) as { puzzles?: unknown };
  if (!Array.isArray(parsed.puzzles)) return null;
  const puzzles: BrowserPuzzleDraft[] = [];
  for (const row of parsed.puzzles) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const category = o.category;
    if (category !== "logic" && category !== "physical" && category !== "electronic") continue;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const objective = typeof o.objective === "string" ? o.objective.trim() : "";
    const howItWorks = typeof o.howItWorks === "string" ? o.howItWorks.trim() : "";
    const themeFitReason = typeof o.themeFitReason === "string" ? o.themeFitReason.trim() : "";
    const difficulty = o.difficulty;
    if (!title || !objective || !howItWorks || !themeFitReason) continue;
    const solveSteps = Array.isArray(o.solveSteps)
      ? o.solveSteps.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 6)
      : [];
    puzzles.push({
      category,
      title,
      objective,
      howItWorks,
      themeFitReason,
      solveSteps: solveSteps.length > 0 ? solveSteps : ["Follow in-room clues.", "Combine results with the team."],
      difficulty: difficulty === "easy" || difficulty === "hard" ? difficulty : "medium",
    });
  }
  return puzzles.length >= Math.min(1, expected) ? puzzles : null;
};

/** Free on-device puzzle set draft — server QA and enrichment still apply on import. */
export async function generatePuzzlesInBrowser(input: BrowserPuzzleGenerateInput): Promise<BrowserPuzzleDraft[] | null> {
  const model = await createLanguageModel();
  if (!model) return null;
  const total = input.logicCount + input.physicalCount + input.electronicCount;
  if (total < 1) return null;
  try {
    const home = input.targetInterface !== "commercial_venue";
    const prompt = [
      "You are an escape-room puzzle designer. Create ORIGINAL puzzles for the theme below. Return ONLY JSON.",
      home
        ? "Home party: no maglocks or Arduino — electronic puzzles must be print-and-play or phone/QR only."
        : "Commercial: electronic puzzles may include simple Arduino/button props.",
      "",
      `Theme: ${input.themeName}`,
      `Hook: ${input.themeTldr}`,
      `Brief excerpt: ${input.themeDescription.slice(0, 1200)}`,
      `Environment: ${input.environmentType}`,
      `Props: ${input.availableItems || "household items"}`,
      `Difficulty: ${input.roomDifficulty}`,
      "",
      `Generate exactly ${total} puzzles: ${input.logicCount} logic, ${input.physicalCount} physical, ${input.electronicCount} electronic.`,
      "",
      '{"puzzles":[',
      ' {"category":"logic|physical|electronic","title":"...","objective":"...","howItWorks":"1-2 sentences","themeFitReason":"tie to theme by name","solveSteps":["..."],"difficulty":"easy|medium|hard"}',
      "]}",
      "Each puzzle must be unique; avoid Pattern Archive / Riddle Ledger / Weighted Switch tropes by name or mechanic.",
    ].join("\n");
    const raw = await promptWithTimeout(model, prompt);
    return parsePuzzlesPayload(raw, total);
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
}
