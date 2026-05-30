import { createLanguageModel, extractJson, isBrowserAiAvailable, isMobileLikeDevice, probeBrowserLanguageModel, promptWithTimeout } from "./browserAiRuntime.ts";

export { isBrowserAiAvailable, isMobileLikeDevice, probeBrowserLanguageModel };
export type { CustomThemeCoachContext, CustomThemeCoachMessage } from "./browserAiCoach.ts";
export type { ContextualInspirationResult, InspirationCatalogEntry } from "./browserAiInspiration.ts";
export { INSPIRATION_CATALOG, generateContextualInspirationInBrowser } from "./browserAiInspiration.ts";

type Theme = { id: string; name: string; description: string; tldr?: string };
type Puzzle = {
  id: string;
  category: "logic" | "physical" | "electronic";
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  referenceLinks: { title: string; url: string; creditTo?: string; affiliateUrl?: string }[];
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  audienceTrack?: "main" | "youth_addon";
  gatesAdultProgression?: boolean;
};

type ExistingPuzzle = { name: string; link: string; roomPart: string };

type BrowserEnhancementInput = {
  theme: Theme | undefined;
  environment: string;
  availableItems: string;
  existingPuzzles: ExistingPuzzle[];
  puzzles: Puzzle[];
  suggestedAdditions: string[];
};

type BrowserEnhancementOutput = {
  puzzles: Array<{
    id: string;
    howItWorks: string;
    themeFitReason: string;
  }>;
  stages?: Array<{
    stage: number;
    whyThisStageExists: string;
  }>;
  suggestedAdditions: string[];
};

/** Developmental-edit pass on theme markdown (on-device); preserves ## sections, fixes unclear copy. */
export const polishThemeBriefInBrowser = async (input: {
  themeName: string;
  description: string;
  environmentType: string;
  availableItems: string;
}): Promise<string | null> => {
  const model = await createLanguageModel();
  if (!model) return null;
  try {
    const prompt = [
      "You are a senior developmental editor polishing escape-room theme markdown (first-edition quality).",
      "Fix unclear, contradictory, or sloppy sentences. Ensure every sentence begins with a capital letter.",
      "Keep existing ## section headings and their order; you may fix heading capitalization to Title Case (e.g. ## Props & Set Dressing, ## Puzzle Loadout, ## Setting & Era, ## Run Twist, ## Studio Build Policy, ## Copy QA (Host Read-Through), ## Your Available Items (Story Integration)).",
      "Do not remove inventory integration or safety notes; do not invent props the host did not list unless they are generic staging advice.",
      "Prefer distinctive naming and story hooks so the theme does not read like a retitled stock scenario; tighten any phrasing that sounds like a duplicate of a well-known public-room title.",
      "Return ONLY valid JSON: {\"description\":\"...full markdown...\"}",
      "",
      JSON.stringify(input),
    ].join("\n");
    const raw = await promptWithTimeout(model, prompt);
    const parsed = JSON.parse(extractJson(raw)) as { description?: string };
    const desc = typeof parsed.description === "string" ? parsed.description.trim() : "";
    return desc.length > 0 ? desc : null;
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
};

export const enhancePlanInBrowser = async (
  input: BrowserEnhancementInput,
): Promise<BrowserEnhancementOutput | null> => {
  const model = await createLanguageModel();
  if (!model) return null;
  try {
    const prompt = [
      "You are an escape room design assistant for a studio that sells **unique** rooms—not copies of common internet puzzles.",
      "Return ONLY JSON with this exact shape:",
      '{"puzzles":[{"id":"...","howItWorks":"...","themeFitReason":"..."}],"stages":[{"stage":1,"whyThisStageExists":"..."}],"suggestedAdditions":["..."]}',
      "Rules:",
      "- Keep each howItWorks practical and concise (1-2 sentences); every sentence must start with a capital letter.",
      "- CRITICAL: Every howItWorks MUST mention the theme by name and tie the puzzle mechanic to a specific story beat in that theme. Generic descriptions (e.g. 'decode the message', 'find the key') with no theme connection are NOT allowed — rewrite them as in-world actions the fictional characters would perform.",
      "- Describe **original** interactions where possible; do not paraphrase well-known public puzzle walkthroughs or regurgitate the same trope another venue already ships.",
      "- Before returning JSON, do a quick pass: ensure no two howItWorks blurbs reuse the same gimmick sentence, and that themeFitReason lines are not copy-pasted across puzzles.",
      "- For **electronic** puzzles, describe bespoke behaviors (inputs, feedback, failure modes) that are specific to the theme fiction, and state that the build must pass **QA** (all states, resets, power loss, safety) before live play.",
      "- Theme-fit rationale must explicitly name the theme, reference a specific prop or story beat, and explain why this puzzle mechanic belongs in that fictional world — not generic praise.",
      "- Stage whyThisStageExists must be specific per stage and must not repeat generic phrasing.",
      "- Suggested additions should reflect the physical room/environment constraints.",
      "Input:",
      JSON.stringify(input),
    ].join("\n");

    const raw = await promptWithTimeout(model, prompt);
    const parsed = JSON.parse(extractJson(raw)) as BrowserEnhancementOutput;
    if (!Array.isArray(parsed.puzzles) || !Array.isArray(parsed.suggestedAdditions)) return null;
    return parsed;
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
};

export type ThemeFitQaInput = {
  themeName: string;
  themeDescription: string;
  puzzleTitle: string;
  puzzleCategory: string;
  objective: string;
  rawThemeFitReason: string;
};

/** QA pass on theme-fit copy before showing in the puzzle card. */
export async function refineThemeFitReasonInBrowser(input: ThemeFitQaInput): Promise<string | null> {
  const model = await createLanguageModel();
  if (!model) return null;
  try {
    const prompt = [
      "You are the onboard Escape Room Builder QA designer.",
      "Evaluate and refine the theme-fit explanation for structural escape room design quality.",
      "Rules:",
      "- Keep 1–2 sentences, practical, no marketing fluff.",
      "- MUST reference the theme by name AND tie the puzzle mechanic to a specific story beat or in-world action in that theme.",
      "- Reject generic lines like 'supports the theme through clue style' — replace with specific props, beats, or player actions that only make sense inside this theme's fiction.",
      "- Every puzzle in the set must have a distinctly different theme-fit reason; no copy-pasted rationale across cards.",
      "- Do not invent electronics unless category is electronic.",
      'Return ONLY JSON: {"themeFitReason":"..."}',
      "",
      JSON.stringify(input),
    ].join("\n");
    const raw = await promptWithTimeout(model, prompt);
    const parsed = JSON.parse(extractJson(raw)) as { themeFitReason?: string };
    const line = typeof parsed.themeFitReason === "string" ? parsed.themeFitReason.trim() : "";
    return line.length > 0 ? line : null;
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
}
