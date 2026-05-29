export type ThemeCoachChoiceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Present on assistant turns — allowed user selections for the next reply. */
  options?: string[];
  /** Coach has enough context; no further questions. */
  coachComplete?: boolean;
};

const MAX_OPTIONS = 8;
const MAX_OPTION_LEN = 120;

/** Parse assistant reply; strip CHOICE_OPTIONS line or trailing bracket tags. */
export const parseCoachChoiceOptions = (raw: string): { content: string; options: string[] } => {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let options: string[] = [];
  const contentLines: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    const choiceMatch = trimmed.match(/^CHOICE_OPTIONS:\s*(.+)$/i);
    if (choiceMatch) {
      options = splitOptionTokens(choiceMatch[1] ?? "");
      continue;
    }
    contentLines.push(line);
  }

  let content = contentLines.join("\n").trim();

  if (options.length === 0) {
    const bracketMatches = [...raw.matchAll(/\[([^\]\n]{1,80})\]/g)];
    if (bracketMatches.length >= 2) {
      options = bracketMatches.map((m) => m[1].trim()).filter(Boolean);
    }
  }

  options = normalizeCoachOptions(options);

  if (!content && raw.trim()) content = raw.trim();

  return { content, options };
};

const splitOptionTokens = (blob: string): string[] =>
  blob
    .split(/\s*\|\s*|\s*,\s*(?=[A-Za-z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

export const normalizeCoachOptions = (options: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const opt of options) {
    const trimmed = opt.trim().slice(0, MAX_OPTION_LEN);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
};

export const isAllowedCoachUserReply = (reply: string, allowed: string[]): boolean => {
  const normalized = reply.trim();
  if (!normalized) return false;
  return allowed.some((opt) => opt.trim() === normalized);
};

/** Walk transcript; user turns must match prior assistant options when options exist. */
export const validateThemeCoachTranscript = (messages: ThemeCoachChoiceMessage[]): string | null => {
  let pendingOptions: string[] | null = null;

  for (const msg of messages) {
    if (msg.role === "assistant") {
      if (msg.coachComplete) {
        pendingOptions = null;
        continue;
      }
      const parsed = msg.options?.length ? normalizeCoachOptions(msg.options) : parseCoachChoiceOptions(msg.content).options;
      pendingOptions = parsed.length > 0 ? parsed : null;
      continue;
    }
    if (msg.role === "user") {
      if (!pendingOptions || pendingOptions.length === 0) {
        return "User replies must select a coach option; free text is not allowed.";
      }
      if (!isAllowedCoachUserReply(msg.content, pendingOptions)) {
        return `User reply must be one of the coach options: ${pendingOptions.join(" | ")}`;
      }
      pendingOptions = null;
    }
  }
  return null;
};

/** Keep intro bullets but only the first question — options map to one ask per turn. */
export const enforceSingleCoachQuestion = (content: string): string => {
  const text = content.replace(/\r\n/g, "\n").trim();
  if (!text || !text.includes("?")) return text;
  const lines = text.split("\n");
  const outLines: string[] = [];
  let questionClosed = false;
  for (const line of lines) {
    if (!questionClosed) {
      if (!line.includes("?")) {
        outLines.push(line);
        continue;
      }
      const qPos = line.indexOf("?");
      outLines.push(line.slice(0, qPos + 1).trim());
      questionClosed = true;
      continue;
    }
    if (line.includes("?")) continue;
    outLines.push(line);
  }
  return outLines.join("\n").trim();
};

/** Parse COACH_COMPLETE line — interview done, no more CHOICE_OPTIONS. */
export const parseCoachComplete = (raw: string): { content: string; complete: boolean } => {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let complete = false;
  const contentLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const completeMatch = trimmed.match(/^COACH_COMPLETE:\s*(.*)$/i);
    if (completeMatch) {
      complete = true;
      const tail = (completeMatch[1] ?? "").trim();
      if (tail) contentLines.push(tail);
      continue;
    }
    if (/^CHOICE_OPTIONS:/i.test(trimmed)) continue;
    contentLines.push(line);
  }
  const content = contentLines.join("\n").trim();
  return { content, complete };
};

export const buildAssistantCoachMessage = (
  raw: string,
  id: string,
): ThemeCoachChoiceMessage => {
  const { content: completeBody, complete } = parseCoachComplete(raw);
  if (complete) {
    return {
      id,
      role: "assistant",
      content:
        completeBody ||
        "I have enough to draft a strong theme brief from your answers — applying it to the description field now.",
      coachComplete: true,
    };
  }
  const { content, options } = parseCoachChoiceOptions(raw);
  const singleQuestionContent = enforceSingleCoachQuestion(content);
  return {
    id,
    role: "assistant",
    content: singleQuestionContent,
    ...(options.length > 0 ? { options } : {}),
  };
};
