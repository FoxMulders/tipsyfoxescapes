/**
 * Diegetic Logic Compiler — reject generic flavor-text tropes that skin puzzles
 * instead of grounding them in physical affordances.
 */

export const BANNED_DIEGETIC_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "represents", pattern: /\brepresents\b/i },
  { label: "symbolizes", pattern: /\bsymbolizes\b/i },
  { label: "simulates", pattern: /\bsimulates\b/i },
  { label: "cipher chart", pattern: /\bcipher\s+chart\b/i },
  { label: "cipher wheel", pattern: /\bcipher\s+wheel\b/i },
  { label: "padlock", pattern: /\bpadlock\b/i },
  { label: "generic cipher", pattern: /\b(substitution|caesar|vigenere)\s+cipher\b/i },
  { label: "stands for", pattern: /\bstands\s+for\b/i },
  { label: "metaphor for", pattern: /\bmetaphor\s+for\b/i },
];

export const scanBannedDiegeticText = (text: string): string[] => {
  const hits: string[] = [];
  for (const { label, pattern } of BANNED_DIEGETIC_PATTERNS) {
    if (pattern.test(text)) hits.push(label);
  }
  return hits;
};

export type DiegeticValidationResult =
  | { ok: true }
  | { ok: false; field: string; violations: string[]; message: string };

export const validateDiegeticFields = (
  fields: Array<{ field: string; text: string }>,
  bannedWordCheck: boolean,
): DiegeticValidationResult => {
  if (!bannedWordCheck) {
    return {
      ok: false,
      field: "banned_word_check",
      violations: ["banned_word_check false"],
      message: "Model must attest banned_word_check=true after avoiding generic tropes.",
    };
  }

  for (const { field, text } of fields) {
    const violations = scanBannedDiegeticText(text);
    if (violations.length > 0) {
      return {
        ok: false,
        field,
        violations,
        message: `Banned diegetic trope(s) in ${field}: ${violations.join(", ")}.`,
      };
    }
  }

  return { ok: true };
};

export const assembleDiegeticPuzzle = (input: {
  layer: {
    hardware_and_electronics: { required_components: string[]; trigger_mechanism: string };
    physical_prop_translation: { player_action: string; prop_design: string };
  };
  narrative_justification: string;
  banned_word_check: boolean;
}): DiegeticValidationResult & { puzzle?: import("./schemas/diegeticPuzzle.js").DiegeticPuzzle } => {
  const diegetic = {
    hardware_and_electronics: input.layer.hardware_and_electronics,
    physical_prop_translation: input.layer.physical_prop_translation,
    narrative_justification: input.narrative_justification.trim(),
    banned_word_check: input.banned_word_check,
  };

  const narrativeCheck = validateDiegeticFields(
    [
      { field: "narrative_justification", text: diegetic.narrative_justification },
      { field: "trigger_mechanism", text: diegetic.hardware_and_electronics.trigger_mechanism },
      { field: "player_action", text: diegetic.physical_prop_translation.player_action },
      { field: "prop_design", text: diegetic.physical_prop_translation.prop_design },
    ],
    diegetic.banned_word_check,
  );

  if (!narrativeCheck.ok) return narrativeCheck;
  return { ok: true, puzzle: diegetic };
};
