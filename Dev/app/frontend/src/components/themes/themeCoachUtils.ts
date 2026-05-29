import {
  buildAssistantCoachMessage,
  enforceSingleCoachQuestion,
  isAllowedCoachUserReply,
  normalizeCoachOptions,
  parseCoachChoiceOptions,
  parseCoachComplete,
  type ThemeCoachChoiceMessage,
} from "../../../../shared/themeCoachOptions.ts";

export type ThemeCoachUiMessage = ThemeCoachChoiceMessage;

export function newCoachMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `coach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export { buildAssistantCoachMessage, isAllowedCoachUserReply, normalizeCoachOptions, parseCoachChoiceOptions, parseCoachComplete, enforceSingleCoachQuestion };

export const getLatestPendingCoachOptions = (messages: ThemeCoachUiMessage[]): string[] => {
  if (messages.length === 0) return [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return [];
  if (last.coachComplete) return [];
  if (last.options?.length) return normalizeCoachOptions(last.options);
  return parseCoachChoiceOptions(last.content).options;
};

const COACH_COVERAGE_CHECKS = [
  { key: "audience", label: "Audience / ages", re: /\bage|ages|audience|kids?|adult|family|mixed\b/i },
  { key: "tone", label: "Tone / vibe", re: /\btone|vibe|spooky|serious|comedic|horror|lighthearted|mood\b/i },
  { key: "boundaries", label: "Safety boundaries", re: /\bboundar|no jump|jump scare|content warning|safe|limit\b/i },
  { key: "centerpiece", label: "Centerpiece moment", re: /\bcenterpiece|wow moment|set piece|signature|hero prop\b/i },
  { key: "tech", label: "Tech vs analog", re: /\belectronic|arduino|microcontroller|analog|tech\b/i },
  { key: "ops", label: "Reset / ops constraints", re: /\breset|staff|facilitation|turnover|runtime|minutes|budget\b/i },
] as const;

export const getCoachCoverageStatus = (messages: ThemeCoachUiMessage[]): { done: number; total: number; doneLabels: string[] } => {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");
  const doneLabels = COACH_COVERAGE_CHECKS.filter((check) => check.re.test(userText)).map((check) => check.label);
  return { done: doneLabels.length, total: COACH_COVERAGE_CHECKS.length, doneLabels };
};

/** Coach or heuristics say the interview can end and the brief can be drafted. */
export const isCoachReadyToSynthesize = (messages: ThemeCoachUiMessage[]): boolean => {
  const userCount = messages.filter((m) => m.role === "user").length;
  if (userCount === 0) return false;
  if (messages.some((m) => m.role === "assistant" && m.coachComplete)) return true;
  if (userCount < 3) return false;
  const { done } = getCoachCoverageStatus(messages);
  return done >= 4;
};

export const coachInterviewComplete = (messages: ThemeCoachUiMessage[]): boolean =>
  messages.some((m) => m.role === "assistant" && m.coachComplete);
