import { createLanguageModel, extractJson, promptWithTimeout } from "./browserAiRuntime.ts";
import { INSPIRATION_CATALOG, INSPIRATION_CATALOG_IDS } from "./inspirationCatalog.ts";

export type { InspirationCatalogEntry } from "./inspirationCatalog.ts";
export { INSPIRATION_CATALOG } from "./inspirationCatalog.ts";

export type ContextualInspirationResult = {
  intro: string;
  propIdeas: Array<{
    props: string[];
    puzzleAngle: string;
    resourceIds: string[];
    searchHints?: string[];
  }>;
  resourceNotes: Array<{ resourceId: string; note: string }>;
  proTip: string;
};

function sanitizeInspirationResult(raw: ContextualInspirationResult | null): ContextualInspirationResult | null {
  if (!raw) return null;
  const filterIds = (ids: unknown): string[] =>
    Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && INSPIRATION_CATALOG_IDS.has(x)) : [];
  return {
    intro: typeof raw.intro === "string" ? raw.intro.trim() : "",
    proTip: typeof raw.proTip === "string" ? raw.proTip.trim() : "",
    propIdeas: Array.isArray(raw.propIdeas)
      ? raw.propIdeas
          .map((row) => ({
            props: Array.isArray(row.props) ? row.props.filter((p): p is string => typeof p === "string" && p.trim().length > 0) : [],
            puzzleAngle: typeof row.puzzleAngle === "string" ? row.puzzleAngle.trim() : "",
            resourceIds: filterIds(row.resourceIds),
            searchHints: Array.isArray(row.searchHints)
              ? row.searchHints.filter((h): h is string => typeof h === "string" && h.trim().length > 0)
              : undefined,
          }))
          .filter((row) => row.puzzleAngle.length > 0)
      : [],
    resourceNotes: Array.isArray(raw.resourceNotes)
      ? raw.resourceNotes
          .map((r) => ({
            resourceId: typeof r.resourceId === "string" && INSPIRATION_CATALOG_IDS.has(r.resourceId) ? r.resourceId : "",
            note: typeof r.note === "string" ? r.note.trim() : "",
          }))
          .filter((r) => r.resourceId && r.note.length > 0)
      : [],
  };
}

/** On-device briefing: ties environment, props, and theme to curated resources only. */
export async function generateContextualInspirationInBrowser(input: {
  environmentType: string;
  availableItems: string;
  eventType: string;
  themeName: string;
  themeTldr: string;
  themeDescriptionExcerpt: string;
  isCommercialVenue: boolean;
}): Promise<ContextualInspirationResult | null> {
  const model = await createLanguageModel();
  if (!model) return null;
  const catalogJson = JSON.stringify(INSPIRATION_CATALOG.map(({ id, label, category }) => ({ id, label, category })));
  try {
    const prompt = [
      "You help escape-room hosts turn **real props and rooms** into **original** puzzle directions (not copy-paste internet walkthroughs).",
      "Return ONLY valid JSON (no markdown fences) with this exact shape:",
      '{"intro":"1-2 sentences","propIdeas":[{"props":["prop from their list"],"puzzleAngle":"concrete interactive idea using those props","resourceIds":["id"],"searchHints":["optional YouTube/site search keywords"]}],"resourceNotes":[{"resourceId":"id","note":"one sentence why this link fits their plan"}],"proTip":"one memorable actionable tip"}',
      "Rules:",
      "- Use ONLY resourceIds that appear in the RESOURCE_CATALOG JSON below. Never invent URLs or new ids.",
      "- Parse their comma-separated available items; mention 2–5 props across propIdeas when possible. If the list is vague, still give 2 propIdeas grounded in environment + theme.",
      "- puzzleAngle must sound buildable (logic, physical, or light electronics). For Arduino/maglock/RFID ideas, prefer resourceIds that include playful-tech.",
      "- searchHints: short phrases they could type on YouTube or Google (e.g. keypad tutorial, magnetic compartment, blow sensor) — do not claim a specific video title exists.",
      "- If isCommercialVenue is true, stress differentiation: adapt techniques into a unique beat for their room.",
      "- If theme is missing, infer from environment wording only.",
      "- Before you lock wording, mentally reject any idea that could be mistaken for another venue's published room title; prefer distinctive hooks over generic catalog names.",
      "- Keep intro under 220 characters; each puzzleAngle under 380 characters; proTip under 220 characters.",
      "",
      "RESOURCE_CATALOG (whitelist ids):",
      catalogJson,
      "",
      "Host plan JSON:",
      JSON.stringify(input),
    ].join("\n");
    const raw = await promptWithTimeout(model, prompt);
    const parsed = JSON.parse(extractJson(raw)) as ContextualInspirationResult;
    return sanitizeInspirationResult(parsed);
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
}
