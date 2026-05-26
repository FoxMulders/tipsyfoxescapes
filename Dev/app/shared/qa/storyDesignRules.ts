/**
 * Escape Room Story Design QA — immersion, prop affordances, host-readable progression.
 * See QA/departments/story_design_qa.md
 */

export type StoryDesignQaIssue = {
  code: string;
  severity: "error" | "warn";
  field: string;
  message: string;
  requiredChange?: string;
};

export type PuzzleLinkForProgression = {
  puzzleId: string;
  puzzleTitle: string;
  storyRole: string;
  unlocks: string;
};

export type PuzzlePropForQa = {
  id: string;
  title: string;
  objective: string;
  howItWorks: string;
  category?: string;
  physical_anchor_prop?: string;
  themeFitReason?: string;
};

const META_IMMERSION_BREAK =
  /\b(you are (?:playing|in) (?:an )?escape room|this is (?:a )?fake|pretend room|simulation|role[- ]?play exercise|game master|builder tool|generated scenario|not a real|break(?:ing)? (?:the )?fourth wall|meta[- ]?puzzle about puzzles)\b/i;

const GENERIC_INVENTORY_PLACEMENT =
  /prefer a coffee-table riser|removable tray so resets|mark “[^”]+” in-play with a small tent card|write one concrete beat for “[^”]+” \(count, order/i;

const puzzleMechanismText = (p: PuzzlePropForQa): string =>
  `${p.title} ${p.objective} ${p.howItWorks}`.toLowerCase();

const propAffordanceMismatch = (prop: string, puzzle: PuzzlePropForQa): string | null => {
  const t = puzzleMechanismText(puzzle);
  const s = prop.toLowerCase();
  const wantsLight = /\b(light|shadow|hidden|glow|uv|blink|morse|beam|shade|dark)\b/.test(t);
  const wantsMass = /\b(weight|pressure|scale|balance|tilt|load|heavy|equilibrium|switch)\b/.test(t);
  const wantsMagnet = /\b(magnet|polarity|ferrous|attract|repel)\b/.test(t);
  const wantsCipher = /\b(cipher|decode|code|index|spine|book|volume|shelf|library)\b/.test(t);

  if (/\blamp\b|\bfloor lamp\b/.test(s) && !wantsLight && (wantsMagnet || wantsMass || wantsCipher)) {
    return `“${prop}” is a light source — it cannot plausibly drive a ${wantsMagnet ? "magnetic" : wantsMass ? "weight/pressure" : "cipher"} mechanism without a visible light-based beat.`;
  }
  if (/\bbookshelf\b|\bookcase\b|\bbook shelf\b/.test(s) && wantsMass && !wantsCipher) {
    return `“${prop}” is not a weight sensor — use a balance prop, pressure plate, or lever if the puzzle needs mass.`;
  }
  if (/\bsofa\b|\bcouch\b|\bchair\b|\bcushion\b/.test(s) && wantsMagnet && !/\b(cushion|zipper|pocket|tag)\b/.test(t)) {
    return `“${prop}” should not stand in for a magnetic lock unless the copy describes a hidden ferrous insert or tagged pocket.`;
  }
  if (/\brug\b|\bcarpet\b|\barea rug\b/.test(s) && wantsMagnet && !/\b(pocket|corner|lift|magnet)\b/.test(t)) {
    return `“${prop}” needs a pocket, corner lift, or pattern beat — not a magnetic sequence on its own.`;
  }
  return null;
};

export const stripMetaImmersionBreaks = (text: string): string =>
  text
    .replace(/\bPlayers are cast inside[^.!?]*[.!?]\s*/gi, "")
    .replace(/\b(for this (?:generated|builder|planning) session)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const buildBookCoverPremise = (themeName: string, hook: string, missionObjective: string): string => {
  const raw = stripMetaImmersionBreaks(hook || missionObjective);
  const cleaned = raw.replace(new RegExp(`^${themeName}\\s*[:—-]\\s*`, "i"), "").trim();
  const body = cleaned || missionObjective.trim() || themeName.trim();
  if (META_IMMERSION_BREAK.test(body)) {
    return `Something in ${themeName} does not add up — and the clock is already running. ${missionObjective.trim()}`.slice(0, 420);
  }
  if (/^(when|after|before|as|while|inside|trapped|sealed|tonight|the)\b/i.test(body)) {
    return body.endsWith(".") || body.endsWith("!") || body.endsWith("?") ? body : `${body}.`;
  }
  const lead = body.charAt(0).toLowerCase() + body.slice(1);
  const out = `When the story begins, ${lead}`;
  return out.endsWith(".") || out.endsWith("!") || out.endsWith("?") ? out : `${out}.`;
};

export const buildHostSituation = (
  themeName: string,
  environment: string,
  missionObjective: string,
  eventSnippet: string,
  invSummary: string,
): string => {
  const env = environment.trim() || "your play space";
  const mission = missionObjective.trim() || "complete the mission before time runs out.";
  const event = eventSnippet.trim();
  return stripMetaImmersionBreaks(
    `The team enters ${env} under the ${themeName} fiction. ${mission}${event}${invSummary}`.replace(/\s{2,}/g, " "),
  );
};

export const formatHostProgressionRule = (
  puzzleLinks: PuzzleLinkForProgression[],
  missionObjective: string,
): string => {
  if (puzzleLinks.length === 0) {
    return `Work the room in order until the crew achieves: ${missionObjective.trim() || "the mission objective."}`;
  }
  const lines = puzzleLinks.map((link, index) => {
    const unlock = link.unlocks
      .replace(/^Contributes fragment\s+(\S+);\s*/i, "Earns code fragment $1. ")
      .replace(/\.$/, "");
    return `${index + 1}. **${link.puzzleTitle}** — ${link.storyRole}. Solving it ${unlock.endsWith(".") ? unlock : `${unlock}.`}`;
  });
  return [
    "Follow this chain — each beat must pay off before the next lock opens:",
    "",
    ...lines,
    "",
    `Finale: ${missionObjective.trim() || "complete the mission."}`,
  ].join("\n");
};

export const auditPremiseImmersion = (premise: string, field = "storyPlan.premise"): StoryDesignQaIssue[] => {
  const issues: StoryDesignQaIssue[] = [];
  const text = premise.trim();
  if (!text) return issues;
  if (META_IMMERSION_BREAK.test(text)) {
    issues.push({
      code: "STORY_PREMISE_META_BREAK",
      severity: "error",
      field,
      message: "Premise breaks immersion with builder/game language.",
      requiredChange: "Rewrite the premise like a book-cover hook — no references to fake rooms or the builder tool.",
    });
  }
  if (/^[^:]+:\s*.{0,40}$/.test(text) && text.startsWith(text.split(":")[0]!)) {
    issues.push({
      code: "STORY_PREMISE_LABEL_STUB",
      severity: "warn",
      field,
      message: "Premise reads like a theme label plus one line, not a back-cover hook.",
      requiredChange: "Expand into a vivid, in-fiction hook (2–3 sentences max).",
    });
  }
  return issues;
};

export const auditPropAffordanceForPuzzle = (puzzle: PuzzlePropForQa): StoryDesignQaIssue[] => {
  const anchor = puzzle.physical_anchor_prop?.trim();
  if (!anchor) return [];
  const mismatch = propAffordanceMismatch(anchor, puzzle);
  if (!mismatch) return [];
  return [
    {
      code: "STORY_PROP_AFFORDANCE_MISMATCH",
      severity: "error",
      field: `puzzle.${puzzle.id}.physical_anchor_prop`,
      message: mismatch,
      requiredChange: `Replace the anchor or rewrite the beat so “${anchor}” matches the stated mechanism.`,
    },
  ];
};

export const auditInventoryHostCopy = (lines: string[]): StoryDesignQaIssue[] => {
  const issues: StoryDesignQaIssue[] = [];
  const seen = new Map<string, number>();
  for (const line of lines) {
    const norm = line.replace(/Item “[^”]+”:/g, "Item:").slice(0, 120);
    seen.set(norm, (seen.get(norm) ?? 0) + 1);
    if (GENERIC_INVENTORY_PLACEMENT.test(line)) {
      issues.push({
        code: "STORY_INVENTORY_GENERIC_FILLER",
        severity: "warn",
        field: "suggestedAdditions",
        message: "Inventory note repeats generic placement filler instead of a puzzle-specific beat.",
        requiredChange: "Tie each listed prop to a concrete puzzle beat or omit it from required staging notes.",
      });
    }
  }
  for (const [norm, count] of seen) {
    if (count > 1) {
      issues.push({
        code: "STORY_INVENTORY_DUPLICATE_NOTE",
        severity: "warn",
        field: "suggestedAdditions",
        message: `Duplicate inventory host note repeated ${count} times.`,
        requiredChange: `Deduplicate: ${norm.slice(0, 80)}…`,
      });
    }
  }
  return issues;
};

export const auditStoryDesignPlan = (
  premise: string,
  progressionRule: string,
  puzzleLinks: PuzzleLinkForProgression[],
): StoryDesignQaIssue[] => {
  const issues: StoryDesignQaIssue[] = [...auditPremiseImmersion(premise)];
  if (puzzleLinks.length > 0 && progressionRule.length > 0 && !progressionRule.includes("**")) {
    issues.push({
      code: "STORY_PROGRESSION_WALL_OF_TEXT",
      severity: "warn",
      field: "storyPlan.progressionRule",
      message: "Progression rule is one dense paragraph instead of per-puzzle steps.",
      requiredChange: "Format progression as numbered puzzle steps with unlock outcomes.",
    });
  }
  return issues;
};
