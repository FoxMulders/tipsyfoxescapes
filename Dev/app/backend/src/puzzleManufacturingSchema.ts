/**
 * Manufacturing + narrative fields for puzzles and generation policy for inventory anchoring.
 */

import {
  formatPinoutTableMarkdown,
  routeArduinoProductionBundle,
  TRUSTED_MAKER_LIBRARIES,
  type ArduinoPinoutRow,
} from "./arduinoResourceRouter.js";

export type PuzzleManufacturingFields = {
  physical_anchor_prop?: string;
  narrative_justification?: string;
  bill_of_materials?: string[];
  build_documentation_url?: string;
};

export type PuzzleWithManufacturing = {
  id: string;
  category: "logic" | "physical" | "electronic";
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  referenceLinks: Array<{ title: string; url: string; creditTo?: string; affiliateUrl?: string }>;
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  stageHint?: string;
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    wiringDiagramSvg: string;
    buildSteps: string[];
    arduinoCode: string;
    pinoutTable?: ArduinoPinoutRow[];
  };
} & PuzzleManufacturingFields;

/** Policy block injected into generation context — rejects generic inventory-agnostic beats. */
export const PUZZLE_GENERATION_INVENTORY_POLICY = [
  "Reject generic puzzle copy that could apply to any room.",
  "When the host lists layout items, every generated beat MUST interact with a specific item's physical affordances (mass, transparency, magnetism, pour volume, latch travel, etc.).",
  "Do not assign a cipher or buzzer gag to an unrelated prop (e.g., fridge magnet → weight puzzle only when mass/tilt is the mechanism).",
  "Electronic builds must include a pinout table and links to trusted maker libraries — never ship naked tone() demos without wiring context.",
].join(" ");

type InventoryAnnotatorDeps = {
  normalizeInventory: (items: string[]) => string[];
  describeItem: (item: string, room: string) => { placement: string; puzzleUses: string };
  scoreItemForPuzzle: (puzzle: PuzzleWithManufacturing, item: string) => number;
  minAnchorScore: number;
  sentenceCaseLead: (s: string) => string;
};

const mentionsItem = (puzzle: PuzzleWithManufacturing, item: string): boolean => {
  const blob = `${puzzle.title} ${puzzle.objective} ${puzzle.howItWorks} ${puzzle.themeFitReason ?? ""}`.toLowerCase();
  return blob.includes(item.toLowerCase());
};

const isGenericHowItWorks = (howItWorks: string): boolean => {
  const t = howItWorks.toLowerCase();
  return (
    /\bplayers observe\b/.test(t) &&
    !/\b(must|physically|touch|lift|pour|open|slide|press|scan|align|weigh|tilt)\b/.test(t)
  );
};

const buildNarrativeJustification = (
  puzzle: PuzzleWithManufacturing,
  anchor: string | null,
  placement: string,
  puzzleUses: string,
  themeName: string,
  environment: string,
): string => {
  const where = puzzle.stageHint?.trim() || environment.trim() || "the play space";
  const prop = anchor ?? (puzzle.category === "electronic" ? "control panel" : "prop station");
  return (
    `Inside **${where}**, the crew engages **${prop}** to achieve: ${puzzle.objective.trim()}. ` +
    `Mechanism: ${puzzleUses} ` +
    `**Theme fit (${themeName}):** ${puzzle.themeFitReason?.trim() || "Advances the selected fiction with a staged, testable beat."} ` +
    `**Placement discipline:** ${placement}`
  );
};

const buildBillOfMaterials = (puzzle: PuzzleWithManufacturing, anchor: string | null): string[] => {
  const rows: string[] = [];
  if (anchor) rows.push(`${anchor} (host inventory anchor — do not relocate without redesign)`);
  if (puzzle.category === "electronic" && puzzle.electronicDetails?.parts?.length) {
    rows.push(...puzzle.electronicDetails.parts);
  } else if (puzzle.category === "physical") {
    rows.push("Lockable container or tactile interface", "Printed clue media", "Mounting hardware");
  } else {
    rows.push("Printed clue set", "Writing surface", "Timer or facilitator sheet");
  }
  return [...new Set(rows.map((r) => r.trim()).filter(Boolean))];
};

const anchorHowItWorks = (
  puzzle: PuzzleWithManufacturing,
  item: string,
  puzzleUses: string,
  environment: string,
): string => {
  if (mentionsItem(puzzle, item) && !isGenericHowItWorks(puzzle.howItWorks)) return puzzle.howItWorks;
  const env = environment.trim() || "the room";
  return (
    `Using the host's **${item}** staged in ${env}, players ${puzzleUses.charAt(0).toLowerCase()}${puzzleUses.slice(1)} ` +
    `This beat is not solvable without physically engaging that prop's real properties. ${puzzle.howItWorks}`
  );
};

export const enrichPuzzlesWithManufacturingSchema = <T extends PuzzleWithManufacturing>(
  puzzles: T[],
  deps: InventoryAnnotatorDeps & { environmentType: string; themeName: string; availableItems: string[] },
): T[] => {
  const inv = deps.normalizeInventory(deps.availableItems);
  const usage = new Map<string, number>();

  const pickAnchor = (puzzle: T): { item: string; placement: string; puzzleUses: string } | null => {
    if (inv.length === 0) return null;
    let best = inv[0]!;
    let bestKey = -1;
    for (const item of inv) {
      const uses = usage.get(item.toLowerCase()) ?? 0;
      const score = deps.scoreItemForPuzzle(puzzle, item);
      const key = score * 10_000 + (1000 - uses * 7);
      if (key > bestKey) {
        bestKey = key;
        best = item;
      }
    }
    if (deps.scoreItemForPuzzle(puzzle, best) < deps.minAnchorScore) return null;
    usage.set(best.toLowerCase(), (usage.get(best.toLowerCase()) ?? 0) + 1);
    const { placement, puzzleUses } = deps.describeItem(best, deps.environmentType);
    return { item: best, placement, puzzleUses };
  };

  return puzzles.map((puzzle) => {
    const anchorPick = pickAnchor(puzzle);
    const anchor = anchorPick?.item ?? null;
    const placement = anchorPick?.placement ?? "Dedicated prop table";
    const puzzleUses = anchorPick?.puzzleUses ?? "complete a fiction-aligned interaction tied to the room brief.";

    let next: T = {
      ...puzzle,
      physical_anchor_prop: anchor ?? puzzle.physical_anchor_prop,
      narrative_justification: buildNarrativeJustification(
        puzzle,
        anchor,
        placement,
        puzzleUses,
        deps.themeName,
        deps.environmentType,
      ),
      bill_of_materials: buildBillOfMaterials(puzzle, anchor),
    };

    if (anchor) {
      const tag = deps.sentenceCaseLead(
        `Inventory tie-in (“${anchor}”): ${puzzleUses} Placement hint: ${placement}`,
      );
      next = {
        ...next,
        howItWorks: anchorHowItWorks(next, anchor, puzzleUses, deps.environmentType),
        themeFitReason: next.themeFitReason ? `${next.themeFitReason} ${tag}` : tag,
      };
    }

    if (puzzle.category === "electronic" && puzzle.electronicDetails) {
      const bundle = routeArduinoProductionBundle(
        puzzle.title,
        puzzle.electronicDetails.wiringDiagram ?? [],
        puzzle.electronicDetails.parts ?? [],
      );
      const pinoutMd = formatPinoutTableMarkdown(bundle.pinoutTable);
      const extraRefs = bundle.makerLibraryLinks.map((link) => ({
        title: link.title,
        url: link.url,
        creditTo: "Trusted maker library — verify wiring against your bench build.",
      }));
      const mergedRefs = [...(next.referenceLinks ?? [])];
      for (const ref of extraRefs) {
        if (!mergedRefs.some((r) => r.url === ref.url)) mergedRefs.push(ref);
      }
      if (!mergedRefs.some((r) => r.url === TRUSTED_MAKER_LIBRARIES.playfulTechnology.url)) {
        mergedRefs.push({
          title: TRUSTED_MAKER_LIBRARIES.playfulTechnology.title,
          url: TRUSTED_MAKER_LIBRARIES.playfulTechnology.url,
          creditTo: "Technique reference for escape-room MCU staging.",
        });
      }

      const bom = [
        ...(next.bill_of_materials ?? []),
        ...(puzzle.electronicDetails.parts ?? []),
        `MCU pinout (${bundle.pinoutTable.length} mapped lines — see export pinout table)`,
      ];
      next = {
        ...next,
        build_documentation_url: bundle.buildDocumentationUrl,
        bill_of_materials: [...new Set(bom.map((r) => r.trim()).filter(Boolean))],
        referenceLinks: mergedRefs,
        electronicDetails: {
          ...puzzle.electronicDetails,
          pinoutTable: bundle.pinoutTable,
          arduinoCode: bundle.arduinoCode,
          buildSteps: [
            `Review pinout table (${pinoutMd.length} rows in export) and official guide: ${bundle.buildDocumentationUrl}`,
            ...(puzzle.electronicDetails.buildSteps ?? []),
            "Bench-test all states, power loss, and reset before mounting in the set.",
          ],
        },
      };
    } else if (!next.build_documentation_url && puzzle.category === "physical") {
      next = {
        ...next,
        build_documentation_url: "https://roomescapeartist.com/",
      };
    }

    return next;
  });
};
