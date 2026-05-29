import { createLanguageModel, extractJson, promptWithTimeout } from "./browserAiRuntime.ts";

export type BrowserThemeDraft = {
  name: string;
  tldr: string;
  description: string;
};

export type BrowserThemePlanningContext = {
  playersConcurrent: string;
  participantsTotal: string;
  sessionDurationMinutes: string;
  environmentType: string;
  availableItems: string;
  roomDifficulty: string;
  eventType?: string;
  themeMustMatchEnvironment?: boolean;
  targetInterface?: string;
  excludeNames?: string[];
};

const parseThemesPayload = (raw: string): BrowserThemeDraft[] | null => {
  const parsed = JSON.parse(extractJson(raw)) as { themes?: unknown };
  if (!Array.isArray(parsed.themes) || parsed.themes.length < 1) return null;
  const themes: BrowserThemeDraft[] = [];
  for (const row of parsed.themes.slice(0, 3)) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const tldr = typeof o.tldr === "string" ? o.tldr.trim() : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    if (name.length < 3 || tldr.length < 8 || description.length < 80) continue;
    themes.push({ name, tldr, description });
  }
  return themes.length >= 3 ? themes : themes.length > 0 ? themes : null;
};

/** Free on-device theme generation via Chrome Language Model API. */
export async function generateThemesInBrowser(ctx: BrowserThemePlanningContext): Promise<BrowserThemeDraft[] | null> {
  const model = await createLanguageModel();
  if (!model) return null;
  try {
    const items = ctx.availableItems.trim() || "common household props";
    const prompt = [
      "You are an escape-room theme designer. Generate exactly 3 ORIGINAL theme concepts. Return ONLY valid JSON.",
      "",
      `Players at once: ${ctx.playersConcurrent}, total: ${ctx.participantsTotal}`,
      `Session: ${ctx.sessionDurationMinutes} minutes`,
      `Environment: ${ctx.environmentType || "home living room"}`,
      `Props: ${items}`,
      `Difficulty: ${ctx.roomDifficulty}`,
      ctx.eventType ? `Event: ${ctx.eventType}` : "",
      ctx.themeMustMatchEnvironment ? "Every theme MUST fit the physical environment above." : "",
      ctx.excludeNames?.length ? `Do NOT reuse these names: ${ctx.excludeNames.join(", ")}` : "",
      ctx.targetInterface === "commercial_venue"
        ? "Commercial venue: themes should support ticketed groups and modular reset."
        : "",
      "",
      '{"themes":[',
      ' {"name":"Unique Title","tldr":"One punchy hook sentence.","description":"Markdown with ## Story, ## Mission, ## Puzzle Flavour (3 bullets tied to props). At least 120 words."},',
      ' {"name":"...","tldr":"...","description":"..."},',
      ' {"name":"...","tldr":"...","description":"..."}',
      "]}",
      "All three themes must differ in genre and tone.",
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await promptWithTimeout(model, prompt);
    return parseThemesPayload(raw);
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
}
