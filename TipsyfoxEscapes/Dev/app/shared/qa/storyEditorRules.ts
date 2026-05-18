/**
 * Shared Story Editor QA rules — used by backend storyEditorQa, puzzleQa (theme fit), and CI.
 */

import { auditProseEnglish } from "./proseQaRules.js";

export type StoryEditorQaIssue = {
  code: string;
  severity: "error" | "warn";
  field: string;
  message: string;
  requiredChange?: string;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "this",
  "that",
  "from",
  "into",
  "room",
  "escape",
  "theme",
  "story",
]);

export const significantWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

export const themeNameTokens = (themeName: string): string[] => significantWords(themeName);

/** Story Editor: theme fit / narrative copy must name the selected theme. */
export const auditThemeFitNarrative = (
  themeFitReason: string,
  themeName: string,
  field = "themeFitReason",
): StoryEditorQaIssue[] => {
  const issues: StoryEditorQaIssue[] = [];
  const fit = themeFitReason.trim();
  const theme = themeName.trim();
  if (!fit) {
    issues.push({
      code: "STORY_THEME_FIT_MISSING",
      severity: "error",
      field,
      message: "Why this fits the theme is required.",
      requiredChange: `Add 1–2 sentences that name "${theme || "the selected theme"}" and tie the puzzle beat to that fiction.`,
    });
    return issues;
  }
  if (!theme) return issues;
  const fitLower = fit.toLowerCase();
  const tokens = themeNameTokens(theme);
  const namesTheme = fitLower.includes(theme.toLowerCase()) || tokens.some((t) => fitLower.includes(t));
  if (!namesTheme) {
    issues.push({
      code: "STORY_THEME_FIT_NAME",
      severity: "error",
      field,
      message: `Theme fit must name "${theme}" or a clear keyword from that theme.`,
      requiredChange: `Rewrite to start with: For "${theme}", this puzzle…`,
    });
  }
  issues.push(...auditProseEnglish(fit, field, { requireTerminalPunctuation: true, label: field }));
  return issues;
};

export type JuniorHookLike = {
  title: string;
  detail: string;
  themeKeywords: string[];
  envKeywords: string[];
};

export const scoreHookTheme = (hook: JuniorHookLike, themeCorpus: string): number => {
  let score = 0;
  for (const kw of hook.themeKeywords) {
    if (themeCorpus.includes(kw)) score += 3;
  }
  return score;
};

export const scoreHookEnvironment = (hook: JuniorHookLike, envCorpus: string): number => {
  let score = 0;
  for (const kw of hook.envKeywords) {
    if (kw === "any") continue;
    if (envCorpus.includes(kw)) score += 2;
  }
  return score;
};

/** Story Editor: junior hooks must be theme-first, not environment-only. */
export const auditJuniorHooksForContext = (
  hooks: JuniorHookLike[],
  themeName: string,
  environmentType: string,
): StoryEditorQaIssue[] => {
  const issues: StoryEditorQaIssue[] = [];
  const themeCorpus = themeName.toLowerCase();
  const envCorpus = `${environmentType}`.toLowerCase();
  if (!themeCorpus.trim()) return issues;

  for (const hook of hooks) {
    const themeScore = scoreHookTheme(hook, themeCorpus);
    const envScore = scoreHookEnvironment(hook, envCorpus);
    if (themeScore < 3) {
      issues.push({
        code: "STORY_HOOK_OFF_THEME",
        severity: "error",
        field: "juniorStoryHooks",
        message: `Hook "${hook.title}" does not match theme "${themeName}".`,
        requiredChange: `Remove or replace with a hook whose theme keywords align to "${themeName}".`,
      });
    } else if (envScore > themeScore) {
      issues.push({
        code: "STORY_HOOK_ENV_DOMINANT",
        severity: "warn",
        field: "juniorStoryHooks",
        message: `Hook "${hook.title}" fits the environment more than the theme.`,
        requiredChange: `Re-skin copy so "${themeName}" is the primary fiction; environment is secondary.`,
      });
    }
  }
  return issues;
};
