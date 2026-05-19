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

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        create?: () => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    };
  }
}

const extractJson = (text: string): string => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return text;
  return text.slice(start, end + 1);
};

/** Max time for one on-device `prompt()` so builder actions (e.g. puzzle load + enrich) cannot hang forever. */
const BROWSER_AI_PROMPT_TIMEOUT_MS = 90_000;

async function promptWithTimeout(
  model: { prompt: (text: string) => Promise<string> },
  text: string,
): Promise<string> {
  const result = await Promise.race([
    model.prompt(text).then((r) => ({ kind: "ok" as const, r })),
    new Promise<{ kind: "timeout" }>((resolve) => setTimeout(() => resolve({ kind: "timeout" }), BROWSER_AI_PROMPT_TIMEOUT_MS)),
  ]);
  if (result.kind === "timeout") {
    throw new Error("browser-ai-prompt-timeout");
  }
  return result.r;
}

/** Curated links for the inspiration drawer; IDs are whitelisted for on-device JSON output. */
export type InspirationCatalogEntry = {
  id: string;
  label: string;
  url: string;
  category: "Tech & DIY" | "Design & theory" | "Community & playthroughs" | "Visual ideas" | "Starter articles";
};

export const INSPIRATION_CATALOG: InspirationCatalogEntry[] = [
  {
    id: "playful-tech",
    label: "Playful Technology — Arduino, RFID, sensors, maglocks (YouTube)",
    url: "https://www.youtube.com/@playfultechnology",
    category: "Tech & DIY",
  },
  {
    id: "puzzle-pieces",
    label: "Puzzle Pieces — creative low-budget DIY builds (YouTube)",
    url: "https://www.youtube.com/@PuzzlePieces",
    category: "Tech & DIY",
  },
  {
    id: "creative-escape-rooms",
    label: "Creative Escape Rooms — props, blog, mechanical inspiration",
    url: "https://www.creativeescaperooms.com/",
    category: "Tech & DIY",
  },
  {
    id: "sherlocked-architect",
    label: "Sherlocked — The Architect (flow, showcraft, GM secrets)",
    url: "https://www.sherlocked.nl/en/the-architect",
    category: "Design & theory",
  },
  {
    id: "puzzling-pursuits",
    label: "Puzzling Pursuits — brainstorming & balancing difficulty",
    url: "https://puzzlingpursuits.com/blogs/news",
    category: "Design & theory",
  },
  {
    id: "indestroom",
    label: "Indestroom — professional puzzle concepts gallery",
    url: "https://indestroom.com/",
    category: "Design & theory",
  },
  {
    id: "room-escape-artist",
    label: "Room Escape Artist — industry news & puzzle writeups",
    url: "https://roomescapeartist.com/",
    category: "Design & theory",
  },
  {
    id: "escape-game-blog",
    label: "The Escape Game — blog (missions, player types)",
    url: "https://theescapegame.com/blog/",
    category: "Community & playthroughs",
  },
  {
    id: "mark-rober",
    label: "Mark Rober — engineering take on escape-room style logic (YouTube)",
    url: "https://www.youtube.com/@MarkRober",
    category: "Community & playthroughs",
  },
  {
    id: "pinterest-er",
    label: "Pinterest — escape room set design search",
    url: "https://www.pinterest.com/search/pins/?q=escape%20room%20design",
    category: "Visual ideas",
  },
  {
    id: "er-geeks",
    label: "Escape Room Geeks — DIY puzzle articles",
    url: "https://escaperoomgeeks.com/diy-puzzles/",
    category: "Starter articles",
  },
  {
    id: "escape-hour",
    label: "Escape Hour — puzzle idea listicle",
    url: "https://escapehour.ca/blog/27-top-11-puzzle-ideas-for-escape-rooms/",
    category: "Starter articles",
  },
  {
    id: "escape-room-tips",
    label: "Escape Room Tips — design puzzle ideas",
    url: "https://escaperoomtips.com/design/escape-room-puzzle-ideas",
    category: "Starter articles",
  },
];

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

const INSPIRATION_CATALOG_IDS = new Set(INSPIRATION_CATALOG.map((e) => e.id));

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

/**
 * On-device “Gemini-style” briefing: ties environment, props, and theme to curated resources only (no invented URLs).
 */
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

/** Normalize Prompt API session responses (string or object with .text). */
const normalizeModelText = (raw: unknown): string => {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "text" in raw && typeof (raw as { text: unknown }).text === "string") {
    return (raw as { text: string }).text;
  }
  return String(raw ?? "");
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
      "- Describe **original** interactions where possible; do not paraphrase well-known public puzzle walkthroughs or regurgitate the same trope another venue already ships.",
      "- Before returning JSON, do a quick pass: ensure no two howItWorks blurbs reuse the same gimmick sentence, and that themeFitReason lines are not copy-pasted across puzzles.",
      "- For **electronic** puzzles, describe bespoke behaviors (inputs, feedback, failure modes) and state that the build must pass **QA** (all states, resets, power loss, safety) before live play.",
      "- Theme-fit rationale must explicitly reference the actual theme context.",
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

export type CustomThemeCoachMessage = { role: "user" | "assistant"; content: string };

export type CustomThemeCoachContext = {
  themeName: string;
  themeDescriptionDraft: string;
  environmentType: string;
  availableItems: string;
  sessionDurationMinutes: string;
  playersConcurrent: string;
  participantsTotal: string;
  roomDifficulty: string;
  youthAddOnEnabled: boolean;
  youthAddOnGatesAdultFlow: boolean;
  youthAddOnAgeNote: string;
  existingPuzzles: Array<{ name: string; link: string; roomPart: string }>;
};

/** Best-effort detection for Chromium Prompt API (`LanguageModel`) and legacy `window.ai.languageModel`. */
export const isBrowserAiAvailable = (): boolean => {
  if (typeof globalThis === "undefined") return false;
  const g = globalThis as unknown as {
    ai?: { languageModel?: { create?: unknown } };
    LanguageModel?: { create?: unknown };
  };
  return typeof g.LanguageModel?.create === "function" || typeof g.ai?.languageModel?.create === "function";
};

type LanguageModelGlobal = {
  create?: (opts?: object) => Promise<unknown>;
  availability?: (opts?: object) => Promise<string>;
};

/** Async check: newer Chrome exposes `availability()` before `create` is obviously callable. */
export async function probeBrowserLanguageModel(): Promise<boolean> {
  if (isBrowserAiAvailable()) return true;
  const LM = (globalThis as unknown as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
  if (!LM || typeof LM.availability !== "function") return false;
  const tryOnce = async (opts?: object): Promise<boolean> => {
    try {
      const a = opts ? await LM.availability!(opts) : await LM.availability!();
      return a === "available" || a === "downloadable" || a === "downloading";
    } catch {
      return false;
    }
  };
  if (
    await tryOnce({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    } as object)
  ) {
    return true;
  }
  return tryOnce();
}

const createLanguageModel = async (): Promise<{ prompt: (text: string) => Promise<string>; destroy?: () => void } | null> => {
  const g = globalThis as unknown as {
    LanguageModel?: {
      create?: (opts?: object) => Promise<{
        prompt: (input: unknown) => Promise<unknown>;
        destroy?: () => void;
      }>;
    };
    ai?: {
      languageModel?: {
        create?: () => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    };
  };

  if (typeof g.LanguageModel?.create === "function") {
    let session: { prompt: (input: unknown) => Promise<unknown>; destroy?: () => void } | null = null;
    try {
      session = await g.LanguageModel.create({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });
    } catch {
      try {
        session = await g.LanguageModel.create();
      } catch {
        session = null;
      }
    }
    if (session && typeof session.prompt === "function") {
      const boundPrompt = session.prompt.bind(session);
      return {
        prompt: async (text: string) => {
          let raw: unknown;
          try {
            raw = await boundPrompt([{ role: "user", content: text }]);
          } catch {
            raw = await boundPrompt(text);
          }
          return normalizeModelText(raw);
        },
        destroy: () => session.destroy?.(),
      };
    }
  }

  if (g.ai?.languageModel?.create) {
    try {
      return await g.ai.languageModel.create();
    } catch {
      return null;
    }
  }
  return null;
};

const COACH_SYSTEM = [
  "You are an experienced escape-room narrative and show designer interviewing the host.",
  "Your job: ask focused questions so later puzzle generation matches their fictional theme AND their real room.",
  "You receive one JSON object with environmentType, availableItems, player counts, session length, roomDifficulty, junior add-on flags and notes, existingPuzzles they already own, and their theme name / description draft.",
  "Read it before you reply and reference specifics so questions feel tailored to their real room and plan.",
  "Interview strategy (in order): (1) audience/age mix, (2) tone + safety boundaries, (3) desired centerpiece moments, (4) tech level (logic/physical/electronic and Arduino comfort), (5) practical constraints (reset time, staffing, budget).",
  "Ask only what is still missing; do not repeatedly ask already answered topics.",
  "Rules:",
  "- Reply as plain text only (no JSON).",
  "- Ask ONE or TWO short related questions per message unless the user asks you to summarize or finish.",
  "  Cover over the conversation: audience (ages, mixed groups), tone (serious, spooky, family-friendly, comedic), intensity boundaries (no jump scares / ok mild fear), centerpiece moments,",
  "  tech vs mostly-analog preference, signature props or set pieces they imagine, pacing for their session length, and how the fiction maps onto their real environment and items they listed.",
  "- Stay under about 140 words per reply.",
  "- Reference their room context when relevant so they feel heard.",
  "- The JSON context includes roomDifficulty (easy / medium / hard): align pacing and challenge language with that target.",
  "- If they give very short answers, gently probe once more on the most important gap; do not interrogate endlessly.",
  "- Never invent unsafe content; keep suggestions appropriate for commercial escape rooms.",
  "- When discussing puzzle direction, steer the host toward **original** beats (logic, physical, and Arduino/microcontroller) that fit their props and room—not reusing generic internet puzzle recipes; remind them microcontroller gags need **QA** before opening.",
  "- Theme naming: encourage a **distinct** working title that will not be confused with this session's earlier picks or famous published rooms; if their draft name is generic, suggest one sharper alternative in your question (do not lecture).",
  "- Security posture: never ask the user for passwords, API keys, tokens, private keys, account credentials, or personal identifiers.",
].join(" ");

const buildCoachUserPayload = (context: CustomThemeCoachContext, history: CustomThemeCoachMessage[], userMessage: string | null): string => {
  const lines = [
    COACH_SYSTEM,
    "",
    "Room and theme context (JSON):",
    JSON.stringify(context),
    "",
    "Conversation so far (User and Assistant turns in order):",
    history.length === 0 ? "(none yet)" : history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n"),
    "",
  ];
  if (userMessage === null) {
    lines.push(
      "The host has finished Room details and named their theme; the JSON context is complete enough to plan against.",
      "Your FIRST reply only: (1) In 2–4 short bullets, assess what is already clear from the JSON (environment, items, headcount, timing, difficulty, theme name/description draft if any).",
      "(2) Name the 1–2 biggest information gaps for puzzle-ready briefing. (3) End with ONE or TWO focused questions that close the top gap—do not ask a laundry list.",
    );
  } else {
    lines.push(
      "The user's newest message is below. Previous turns are already listed above—do not repeat them.",
      `User's new message:\n${userMessage}`,
      "",
      "Reply as Assistant with your next response only. Continue the interview by covering the next missing high-impact topic from the strategy list.",
    );
  }
  return lines.join("\n");
};

/**
 * Opening line + first question (userMessage null, history usually empty),
 * or the assistant's follow-up (userMessage is the latest user text; history is prior turns only).
 */
export const customThemeCoachTurn = async (
  context: CustomThemeCoachContext,
  history: CustomThemeCoachMessage[],
  userMessage: string | null,
): Promise<string | null> => {
  const model = await createLanguageModel();
  if (!model) return null;
  try {
    const raw = await promptWithTimeout(model, buildCoachUserPayload(context, history, userMessage));
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  } finally {
    model.destroy?.();
  }
};

/** Turn the interview into a structured theme description for the planner. */
export const customThemeCoachSynthesize = async (
  context: CustomThemeCoachContext,
  history: CustomThemeCoachMessage[],
): Promise<string | null> => {
  const model = await createLanguageModel();
  if (!model) return null;
  const prompt = [
    "You are an escape-room design writer. Using the JSON context and the interview transcript, write ONE theme description document for puzzle-generation AI.",
    "Return ONLY valid JSON with a single key \"description\" whose value is a markdown string.",
    "The markdown MUST use these section headings exactly (with ##): ## Storyline, ## Puzzle Loadout, ## Props & Set Dressing, ## Setting & Era.",
    "Integrate the user's answers; align puzzle loadout and props with their real environment and available items when known.",
    "In ## Puzzle Loadout, emphasize **original** puzzle types (logic, physical, electronic) tailored to this story—avoid listing generic internet escape-room clichés as if they were the final build.",
    "Give the fiction a **distinct** identity: avoid a working title or logline that could be read as a thin rename of a famous commercial room or of a bland stock catalog entry.",
    "Where you mention Arduino or other microcontrollers, note that prototypes must go through **QA** (every state, wrong inputs, power loss, reset) before players use them.",
    "Keep total length reasonable (under about 900 words).",
    "",
    "Context JSON:",
    JSON.stringify(context),
    "",
    "Interview:",
    history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n"),
  ].join("\n");
  try {
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
      "- Must reference the theme by name and tie puzzle type to room fiction.",
      "- Reject generic lines; replace with specific props, beats, or player actions.",
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

