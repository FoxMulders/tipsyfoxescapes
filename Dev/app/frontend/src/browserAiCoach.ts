import { createLanguageModel, extractJson, promptWithTimeout } from "./browserAiRuntime.ts";

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
