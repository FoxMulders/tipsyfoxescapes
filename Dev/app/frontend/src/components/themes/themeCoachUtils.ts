export type ThemeCoachUiMessage = { id: string; role: "user" | "assistant"; content: string };

export function newCoachMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `coach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const COACH_COVERAGE_CHECKS = [
  { key: "audience", label: "Audience / ages", re: /\bage|ages|audience|kids?|adult|family|mixed\b/i },
  { key: "tone", label: "Tone / vibe", re: /\btone|vibe|spooky|serious|comedic|horror|lighthearted|mood\b/i },
  { key: "boundaries", label: "Safety boundaries", re: /\bboundar|no jump|jump scare|content warning|safe|limit\b/i },
  { key: "centerpiece", label: "Centerpiece moment", re: /\bcenterpiece|wow moment|set piece|signature|hero prop\b/i },
  { key: "tech", label: "Tech vs analog", re: /\belectronic|arduino|microcontroller|analog|tech\b/i },
  { key: "ops", label: "Reset / ops constraints", re: /\breset|staff|facilitation|turnover|runtime|minutes|budget\b/i },
] as const;

export const looksSensitiveForCoach = (text: string): string | null => {
  const t = text.trim();
  if (!t) return null;
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(t)) return "private key block";
  if (/\b(?:api[_ -]?key|secret|password|passwd|token|bearer)\b\s*[:=]/i.test(t)) return "credential pattern";
  if (/\b(?:ghp_|github_pat_|sk-[A-Za-z0-9]|AIza[0-9A-Za-z_-]{20,})\b/.test(t)) return "API token pattern";
  if (/[A-Za-z0-9+/]{80,}={0,2}/.test(t)) return "high-entropy secret-like string";
  return null;
};

export const getCoachCoverageStatus = (messages: ThemeCoachUiMessage[]): { done: number; total: number; doneLabels: string[] } => {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");
  const doneLabels = COACH_COVERAGE_CHECKS.filter((check) => check.re.test(userText)).map((check) => check.label);
  return { done: doneLabels.length, total: COACH_COVERAGE_CHECKS.length, doneLabels };
};
