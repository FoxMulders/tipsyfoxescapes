/**
 * Technical Director export sections — printable runbook structure, BOM, narrative justification, GM briefing.
 */

export type ExportPuzzleRef = {
  title: string;
  id: string;
  category: "logic" | "physical" | "electronic";
  difficulty: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  stageHint?: string;
  audienceTrack?: "main" | "youth_addon";
  gatesAdultProgression?: boolean;
  solveSteps: string[];
  referenceLinks: Array<{ title: string; url: string; creditTo?: string; affiliateUrl?: string }>;
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    buildSteps: string[];
    arduinoCode: string;
  };
};

export type ExportSessionContext = {
  environmentType: string;
  themeName: string;
  sessionDurationMinutes: number;
  playersConcurrent: number;
  operatingMode: "home" | "venue";
};

const PLAYFUL_TECH_URL = "https://www.youtube.com/@playfultechnology";

export const EXPORT_PDF_PRINT_GUIDE: string[] = [
  "## Printable runbook (PDF-ready)",
  "",
  "_Open the **HTML** download in your browser and choose **Print → Save as PDF**. Sections marked with page breaks separate room phases for binders and build packets._",
  "",
  "<!-- pdf-page-break -->",
  "",
];

const extractInventoryProp = (themeFitReason?: string): string | null => {
  if (!themeFitReason) return null;
  const m = themeFitReason.match(/Inventory tie-in\s*\(“([^”]+)”\)/i) ?? themeFitReason.match(/Inventory tie-in\s*\("([^"]+)"\)/i);
  return m?.[1]?.trim() ?? null;
};

const zoneLabel = (puzzle: ExportPuzzleRef, environment: string): string => {
  const hint = puzzle.stageHint?.trim();
  if (hint) return hint;
  const env = environment.trim() || "the play space";
  if (puzzle.audienceTrack === "youth_addon") return `Junior track zone in ${env}`;
  return env;
};

/** Structured "Why + Where" narrative for build teams (not vague one-liners). */
export const buildNarrativeJustification = (
  puzzle: ExportPuzzleRef,
  ctx: ExportSessionContext,
): string => {
  const where = zoneLabel(puzzle, ctx.environmentType);
  const prop =
    extractInventoryProp(puzzle.themeFitReason) ??
    (puzzle.category === "electronic"
      ? "installed control panel or sensor rig"
      : puzzle.category === "physical"
        ? "tactile prop assembly"
        : "deduction station");
  const mechanism = puzzle.howItWorks.split(/[.!?]/).find((s) => s.trim().length > 12)?.trim() ?? puzzle.howItWorks;
  const why =
    puzzle.themeFitReason?.trim() ||
    `This beat advances "${ctx.themeName}" through ${puzzle.category} play that matches the room fiction.`;
  return (
    `Inside **${where}**, the player engages **${prop}** to complete **${puzzle.objective.trim()}**. ` +
    `${mechanism.endsWith(".") ? mechanism : `${mechanism}.`} ` +
    `**Why it belongs here:** ${why}`
  );
};

const buildResourceLines = (puzzle: ExportPuzzleRef, redactElectronic: boolean): string[] => {
  const rows: string[] = ["#### Build resources", ""];
  if (puzzle.category === "electronic") {
    rows.push(
      `- **Technique library:** [Playful Technology — Arduino escape-room patterns](${PLAYFUL_TECH_URL}) — compare their wiring discipline to your generated pinout below.`,
    );
    if (!redactElectronic && puzzle.electronicDetails) {
      const parts = puzzle.electronicDetails.parts ?? [];
      if (parts.length > 0) {
        rows.push("- **Bill of materials (this puzzle):**");
        parts.forEach((p) => rows.push(`  - ${p}`));
      }
      const wiring = puzzle.electronicDetails.wiringDiagram ?? [];
      if (wiring.length > 0) {
        rows.push("- **Logic flow / wiring sequence:**");
        wiring.forEach((w, i) => rows.push(`  ${i + 1}. ${w}`));
      }
      const steps = puzzle.electronicDetails.buildSteps ?? [];
      if (steps.length > 0) {
        rows.push("- **Bench build steps:**");
        steps.forEach((s, i) => rows.push(`  ${i + 1}. ${s}`));
      }
      rows.push("- **Firmware:** See **Electronic Puzzle Implementation Details** for the full Arduino sketch (host QA required before live play).");
    } else if (redactElectronic) {
      rows.push("- _Full wiring maps and firmware are omitted until export credits are available — purchase credits to unlock build-ready electronics._");
    }
  } else if (puzzle.category === "physical") {
    rows.push("- **Fabrication logic flow:**");
    const steps = puzzle.solveSteps.length > 0 ? puzzle.solveSteps : [puzzle.howItWorks];
    steps.slice(0, 6).forEach((s, i) => rows.push(`  ${i + 1}. ${s}`));
    rows.push("- **Off-the-shelf alternative:** Prefer reputable escape-room suppliers or original builds — adapt dimensions to your footprint.");
  } else {
    rows.push("- **Deduction logic flow:**");
    const steps = puzzle.solveSteps.length > 0 ? puzzle.solveSteps : [puzzle.howItWorks];
    steps.slice(0, 5).forEach((s, i) => rows.push(`  ${i + 1}. ${s}`));
  }
  const refs = puzzle.referenceLinks ?? [];
  if (refs.length > 0) {
    rows.push("- **Curated build & technique links:**");
    refs.forEach((ref) => {
      rows.push(`  - [${ref.title}](${ref.url})${ref.creditTo ? ` — _${ref.creditTo}_` : ""}`);
      if (ref.affiliateUrl && ref.affiliateUrl !== ref.url) {
        rows.push(`    - Support / official: [${ref.title}](${ref.affiliateUrl})`);
      }
    });
  } else if (puzzle.category === "electronic") {
    rows.push(`  - [Playful Technology](${PLAYFUL_TECH_URL}) — primary electronics reference for this export.`);
  }
  rows.push("");
  return rows;
};

type BomRow = { puzzle: string; category: string; component: string; qty: string; notes: string };

export const buildConsolidatedBomTable = (
  puzzles: ExportPuzzleRef[],
  redactElectronic: boolean,
): string[] => {
  const rows: BomRow[] = [];
  for (const puzzle of puzzles) {
    if (puzzle.category === "electronic" && puzzle.electronicDetails && !redactElectronic) {
      for (const part of puzzle.electronicDetails.parts ?? []) {
        rows.push({
          puzzle: puzzle.title,
          category: "electronic",
          component: part,
          qty: "1 set",
          notes: "Verify against wiring diagram in export",
        });
      }
    } else if (puzzle.category === "physical") {
      const prop = extractInventoryProp(puzzle.themeFitReason) ?? "Physical prop kit";
      rows.push({
        puzzle: puzzle.title,
        category: "physical",
        component: prop,
        qty: "1",
        notes: "Fabricate or source; see narrative justification",
      });
    } else {
      rows.push({
        puzzle: puzzle.title,
        category: "logic",
        component: "Printed clues / tokens",
        qty: "1 set",
        notes: "Paper or laminate; no MCU",
      });
    }
  }
  if (rows.length === 0) {
    return ["## Consolidated bill of materials", "", "_No inventory rows — add available items in Room details and regenerate puzzles._", ""];
  }
  const lines = [
    "## Consolidated bill of materials",
    "",
    "_Procurement table for your build team. Cross-check each row against the per-puzzle **Build resources** and narrative justification sections._",
    "",
    "| Puzzle | Type | Component / material | Qty | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) => `| ${r.puzzle.replace(/\|/g, "\\|")} | ${r.category} | ${r.component.replace(/\|/g, "\\|")} | ${r.qty} | ${r.notes.replace(/\|/g, "\\|")} |`,
    ),
    "",
    "<!-- pdf-page-break -->",
    "",
  ];
  return lines;
};

export const buildTechnicalPuzzleSections = (
  puzzles: ExportPuzzleRef[],
  ctx: ExportSessionContext,
  redactElectronic: boolean,
): string[] => {
  const lines: string[] = [
    "## Technical puzzle packet (build-ready)",
    "",
    "_Each puzzle includes **Narrative justification** (why + where), **Build resources** (links and logic flow — no placeholder code), and host steps._",
    "",
  ];
  puzzles.forEach((puzzle, index) => {
    lines.push(`<!-- pdf-page-break -->`, "");
    lines.push(`### Puzzle ${index + 1}: ${puzzle.title}`);
    lines.push(`- **Type:** ${puzzle.category} · **Difficulty:** ${puzzle.difficulty}${puzzle.audienceTrack === "youth_addon" ? " · Junior add-on" : ""}`);
    lines.push(`- **Player-facing objective:** ${puzzle.objective}`);
    lines.push("");
    lines.push("#### Narrative justification (why + where)");
    lines.push(buildNarrativeJustification(puzzle, ctx));
    lines.push("");
    lines.push(...buildResourceLines(puzzle, redactElectronic));
    lines.push("#### Host operation steps");
    if (puzzle.solveSteps.length > 0) {
      puzzle.solveSteps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    } else {
      lines.push(`  1. ${puzzle.howItWorks}`);
    }
    lines.push("");
  });
  return lines;
};

export const buildGmLiveOpsBriefing = (
  puzzles: ExportPuzzleRef[],
  ctx: ExportSessionContext,
  storyLinks: Array<{ puzzleTitle: string; storyRole: string; unlocks?: string }>,
): string[] => {
  const mainPuzzles = puzzles.filter((p) => p.audienceTrack !== "youth_addon");
  const lines: string[] = [
    "## Live Ops — Gamemaster briefing",
    "",
    `_Use with the **Gamemaster Live Console** (\`/gm/{sessionId}\`) and **player display** (\`/room/{sessionId}/player-display\`). Session: **${ctx.themeName}** · **${ctx.sessionDurationMinutes} min** · **${ctx.playersConcurrent}** players at one time._`,
    "",
    "### Session controls",
    "- Start the timer only after the player display shows **ready**.",
    "- Send clues from the **Clue box**; pre-saved hints from this export can be pasted as custom clues.",
    "- Use **Screen Manager** to switch the projector between Active Game, Hint Overlay, End Game, or Custom Media.",
    ...(ctx.operatingMode === "venue"
      ? ["- **Venue mode:** Reset checklist and session report live in the console Reports tab."]
      : ["- **Home mode:** Runbook on your device; player screen shows timer and hints only."]),
    "",
    "### Puzzle progression & clue triggers",
    "",
    "| Puzzle | Story role | Suggested clue trigger | Failure recovery |",
    "| --- | --- | --- | --- |",
  ];
  for (const puzzle of mainPuzzles) {
    const link = storyLinks.find((l) => l.puzzleTitle === puzzle.title);
    const role = link?.storyRole ?? "Advances the mission chain";
    const trigger =
      puzzle.solveSteps.length >= 2
        ? `After ~${Math.max(3, Math.floor(ctx.sessionDurationMinutes / (mainPuzzles.length + 2)))} min stuck on step 1, nudge: "${puzzle.solveSteps[0]?.slice(0, 80)}…"`
        : `If team idle >5 min, hint toward: ${puzzle.objective.slice(0, 90)}…`;
    const recovery =
      puzzle.category === "electronic"
        ? "Power-cycle MCU; verify USB/serial; swap to manual code entry backup if firmware fails."
        : puzzle.category === "physical"
          ? "Re-seat mechanism; confirm prop was not moved from anchor position; offer tactile demo without revealing solution."
          : "Re-state fiction beat; point to visible clue surface; split group for parallel deduction.";
    lines.push(
      `| ${puzzle.title.replace(/\|/g, "\\|")} | ${role.replace(/\|/g, "\\|")} | ${trigger.replace(/\|/g, "\\|")} | ${recovery.replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("", "<!-- pdf-page-break -->", "");
  return lines;
};
