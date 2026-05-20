/**
 * English prose QA — grammar, punctuation, and capitalization checks for host-facing copy.
 * Used by Story Editor QA on narrative fields and by CI on curated UI strings.
 */

import type { StoryEditorQaIssue } from "./storyEditorRules.js";

export type ProseAuditOptions = {
  /** When true, multi-sentence blocks should end with . ! or ? */
  requireTerminalPunctuation?: boolean;
  /** Label for UI catalog entries (e.g. "roomDetails.inspirationCta") */
  label?: string;
};

const SPACE_BEFORE_PUNCT = / [,.;:!?]/;
const DOUBLE_PUNCT = /([,;])\1|\.{4,}/;
const DOUBLE_SPACE = /  +/;
const LOWERCASE_AFTER_SENTENCE_END = /\. [a-z]/;
const MISSING_COMMA_AFTER_EG = /\be\.g\. [A-Za-z]/;
const INFORMAL_CONTRACTIONS = /\b(dont|wont|cant|shouldnt|isnt|arent|wasnt|werent|doesnt|didnt|havent|hasnt)\b/i;

/** Curated Room-details and planning UI strings — CI guards copy edits. */
export const ROOM_DETAILS_UI_COPY: ReadonlyArray<{ id: string; text: string }> = [
  { id: "roomDetails.stepTitle", text: "Room details" },
  { id: "roomDetails.inspirationCta", text: "Get AI prop & theme inspiration" },
  { id: "roomDetails.continueCta", text: "Continue to theme selection" },
  {
    id: "roomDetails.facilityLabel",
    text: "Describe your facility layout or architectural shell",
  },
  {
    id: "roomDetails.puzzleEstimateTooltip",
    text: "This number updates live from your session duration and head count—the AI uses it to size how many puzzle nodes to generate in your main track.",
  },
  {
    id: "roomDetails.puzzleEstimateMicro",
    text: "Live estimate based on duration and concurrent players",
  },
  {
    id: "roomDetails.targetInterfaceLead",
    text: "Start here—this is your primary filter. Home Party optimizes print runbooks; Commercial Venue unlocks GM Live Console, staff checklists, and multi-display ops.",
  },
  {
    id: "roomDetails.juniorTitle",
    text: "Activate Multi-Generation Play (Junior Track Parallel Escape)",
  },
  {
    id: "roomDetails.juniorLead",
    text: "Dynamically appends a synchronized, kid-friendly puzzle layer to this room so families and mixed-age groups can play together without compromising the adult experience.",
  },
  {
    id: "roomDetails.propFabLead",
    text: "Tell the generator whether you are printing functional puzzle hardware or scenic dressing so exports bias toward the right build notes.",
  },
  {
    id: "roomDetails.propFabToggle",
    text: "Do you plan to 3D print props or components?",
  },
  {
    id: "roomDetails.emptyRoomLead",
    text: "Use this after your theme and puzzle set are locked—map physical installs to your fiction before you export and brief staff.",
  },
  {
    id: "roomDetails.flowHelper",
    text: "Pick your target interface first, then session timing and space details. The estimated puzzle node count updates live from duration and head count. Commercial venue install checklists unlock in Review after your theme and puzzle set are generated.",
  },
];

export const auditProseEnglish = (
  text: string,
  field: string,
  options: ProseAuditOptions = {},
): StoryEditorQaIssue[] => {
  const issues: StoryEditorQaIssue[] = [];
  const raw = text ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return issues;

  const label = options.label ?? field;

  if (DOUBLE_SPACE.test(raw)) {
    issues.push({
      code: "PROSE_DOUBLE_SPACE",
      severity: "warn",
      field,
      message: `"${label}" contains consecutive spaces.`,
      requiredChange: "Remove extra spaces between words.",
    });
  }

  if (SPACE_BEFORE_PUNCT.test(raw)) {
    issues.push({
      code: "PROSE_SPACE_BEFORE_PUNCT",
      severity: "error",
      field,
      message: `"${label}" has a space before punctuation.`,
      requiredChange: "Delete the space before the comma or period (e.g., write “word,” not “word ,”).",
    });
  }

  if (DOUBLE_PUNCT.test(raw)) {
    issues.push({
      code: "PROSE_REPEAT_PUNCT",
      severity: "error",
      field,
      message: `"${label}" repeats punctuation.`,
      requiredChange: "Use a single comma or period.",
    });
  }

  if (MISSING_COMMA_AFTER_EG.test(raw)) {
    issues.push({
      code: "PROSE_EG_COMMA",
      severity: "warn",
      field,
      message: `"${label}" uses “e.g.” without a following comma.`,
      requiredChange: 'Write “e.g.,” when introducing an example.',
    });
  }

  if (INFORMAL_CONTRACTIONS.test(raw)) {
    issues.push({
      code: "PROSE_CONTRACTION_APOSTROPHE",
      severity: "error",
      field,
      message: `"${label}" has a contraction missing an apostrophe.`,
      requiredChange: "Use don’t, won’t, can’t, etc., with an apostrophe.",
    });
  }

  if (LOWERCASE_AFTER_SENTENCE_END.test(trimmed)) {
    issues.push({
      code: "PROSE_CAPITAL_AFTER_PERIOD",
      severity: "warn",
      field,
      message: `"${label}" may start a sentence with a lowercase letter after a period.`,
      requiredChange: "Capitalize the first word of each sentence.",
    });
  }

  if (options.requireTerminalPunctuation && trimmed.length >= 48) {
    const sentenceLike = /[a-z]/i.test(trimmed) && /\s/.test(trimmed);
    const endsOk = /[.!?…)"'\]]$/.test(trimmed);
    if (sentenceLike && !endsOk) {
      issues.push({
        code: "PROSE_TERMINAL_PUNCT",
        severity: "warn",
        field,
        message: `"${label}" reads like a full sentence but does not end with . ! or ?`,
        requiredChange: "Add terminal punctuation.",
      });
    }
  }

  return issues;
};

export const auditProseFields = (
  fields: Array<{ text: string; field: string; requireTerminalPunctuation?: boolean }>,
): StoryEditorQaIssue[] => {
  const issues: StoryEditorQaIssue[] = [];
  for (const f of fields) {
    issues.push(
      ...auditProseEnglish(f.text, f.field, {
        requireTerminalPunctuation: f.requireTerminalPunctuation,
        label: f.field,
      }),
    );
  }
  return issues;
};

export const auditUiCopyCatalog = (
  entries: ReadonlyArray<{ id: string; text: string }>,
): StoryEditorQaIssue[] => {
  const issues: StoryEditorQaIssue[] = [];
  for (const entry of entries) {
    issues.push(
      ...auditProseEnglish(entry.text, `ui.${entry.id}`, {
        label: entry.id,
        requireTerminalPunctuation: entry.text.length >= 60,
      }),
    );
  }
  return issues;
};
