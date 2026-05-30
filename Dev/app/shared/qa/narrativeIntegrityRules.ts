/**
 * Narrative-driven puzzle validation — thematic integrity, diegetic copy, mandatory hooks.
 */

import { significantWords, themeNameTokens } from "./storyEditorRules.js";

export type NarrativeIntegrityIssue = {
  code: string;
  severity: "error" | "warn";
  field: string;
  message: string;
};

/** Player-facing copy only — maker/electronics sections may name parts explicitly. */
export const BARE_MECHANICAL_PLAYER_COPY =
  /\b(maglock|mag-?lock|rfid|mfrc522|pn532|arduino|mcu|microcontroller|relay module|solenoid strike|electromagnetic lock|nfc reader|keypad controller|gpio|spi bus|i2c address)\b/i;

export const NARRATIVE_HOOK_PREFIX = /^narrative hook\s*:/i;

export const formatNarrativeDrivenHowItWorks = (narrativeHook: string, mechanismBody: string): string => {
  const hook = narrativeHook.trim() || "The room demands your team's attention before you can proceed.";
  const body = mechanismBody.trim();
  if (NARRATIVE_HOOK_PREFIX.test(body)) return body;
  return `Narrative Hook: ${hook}\n\nHow it works: ${body}`;
};

/** Theme-specific anchors — at least one token from theme name/tags must appear in player copy. */
export const auditThematicIntegrity = (
  playerCopy: string,
  themeName: string,
  themeTags: string[] = [],
  fields: string[] = ["howItWorks"],
): NarrativeIntegrityIssue[] => {
  const issues: NarrativeIntegrityIssue[] = [];
  const theme = themeName.trim();
  if (!theme) return issues;

  const corpus = playerCopy.toLowerCase();
  const tokens = [...themeNameTokens(theme), ...themeTags.flatMap((t) => significantWords(t))].filter(
    (t, i, arr) => arr.indexOf(t) === i,
  );

  if (tokens.length === 0) {
    if (!corpus.includes(theme.toLowerCase())) {
      issues.push({
        code: "THEME_INTEGRITY_MISSING",
        severity: "error",
        field: fields[0] ?? "howItWorks",
        message: `Player-facing copy must reference "${theme}" (setting, props, characters, or mood) — not generic escape-room filler.`,
      });
    }
    return issues;
  }

  const hasAnchor = tokens.some((t) => corpus.includes(t)) || corpus.includes(theme.toLowerCase());
  if (!hasAnchor) {
    issues.push({
      code: "THEME_INTEGRITY_MISSING",
      severity: "error",
      field: fields[0] ?? "howItWorks",
      message: `Player-facing copy must include a specific reference to "${theme}" (e.g. ${tokens.slice(0, 4).join(", ")}).`,
    });
  }

  return issues;
};

/** Maglocks, RFID, etc. must be re-skinned as in-world interactions in player copy. */
export const auditBareMechanicalPlayerCopy = (
  texts: Array<{ field: string; text: string }>,
): NarrativeIntegrityIssue[] => {
  const issues: NarrativeIntegrityIssue[] = [];
  for (const { field, text } of texts) {
    if (!text.trim()) continue;
    const match = text.match(BARE_MECHANICAL_PLAYER_COPY);
    if (match) {
      issues.push({
        code: "BARE_MECHANICAL_PLAYER_COPY",
        severity: "error",
        field,
        message: `Re-skin "${match[0]}" as a diegetic, in-world interaction — player copy must not expose raw hardware jargon.`,
      });
    }
  }
  return issues;
};

export const auditMandatoryNarrativeHook = (howItWorks: string): NarrativeIntegrityIssue[] => {
  const text = howItWorks.trim();
  if (!text) {
    return [
      {
        code: "NARRATIVE_HOOK_MISSING",
        severity: "error",
        field: "howItWorks",
        message: "How it works must start with a Narrative Hook explaining why before how.",
      },
    ];
  }
  if (!NARRATIVE_HOOK_PREFIX.test(text)) {
    return [
      {
        code: "NARRATIVE_HOOK_MISSING",
        severity: "error",
        field: "howItWorks",
        message: 'How it works must begin with "Narrative Hook:" — explain the story why before the mechanism.',
      },
    ];
  }
  const afterHook = text.replace(NARRATIVE_HOOK_PREFIX, "").trim();
  if (afterHook.length < 24) {
    return [
      {
        code: "NARRATIVE_HOOK_SHORT",
        severity: "error",
        field: "howItWorks",
        message: "Narrative Hook is too short — add 1–2 sentences of in-world motivation before the mechanism.",
      },
    ];
  }
  return [];
};
