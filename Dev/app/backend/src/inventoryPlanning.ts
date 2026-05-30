import type { InventoryItem, PropPuzzleLink } from "../../shared/inventory.js";
import {
  formatAffordancesForPrompt,
  inventoryItemNames,
  migrateAvailableItemsToInventory,
  normalizeInventoryItems,
  puzzleEligibleInventory,
  resolveInventoryFromPlanning,
  stagingOnlyInventory,
} from "../../shared/inventory.js";

export type PuzzleWithPropLink = {
  id: string;
  propPuzzleLink?: PropPuzzleLink;
  physical_anchor_prop?: string;
};

export {
  formatAffordancesForPrompt,
  inventoryItemNames,
  migrateAvailableItemsToInventory,
  normalizeInventoryItems,
  puzzleEligibleInventory,
  resolveInventoryFromPlanning,
  stagingOnlyInventory,
};

export const buildInventoryPromptBlock = (items: InventoryItem[]): string => {
  const eligible = puzzleEligibleInventory(items);
  const staging = stagingOnlyInventory(items);
  const lines: string[] = [];
  if (eligible.length > 0) {
    lines.push("Puzzle-eligible props (may anchor mechanics):");
    eligible.forEach((i) => lines.push(`- ${formatAffordancesForPrompt(i)}`));
  }
  if (staging.length > 0) {
    lines.push("Staging-only props (atmosphere/red herring — do NOT require puzzle slots):");
    staging.forEach((i) => {
      const note = i.stagingNotes ? ` — ${i.stagingNotes}` : "";
      lines.push(`- ${i.name} (${i.role})${note}`);
    });
  }
  if (lines.length === 0) {
    return "Props available: common household items";
  }
  return lines.join("\n");
};

export const buildDesignConstraintsBlock = (input: {
  designConstraints?: string;
  noGoItems?: string[];
  techLevel?: string;
}): string => {
  const parts: string[] = [];
  if (input.designConstraints?.trim()) {
    parts.push(`Host design brief: ${input.designConstraints.trim()}`);
  }
  if (input.noGoItems?.length) {
    parts.push(`Hard exclusions (never use): ${input.noGoItems.join(", ")}`);
  }
  if (input.techLevel) {
    parts.push(`Tech level: ${input.techLevel.replace(/_/g, " ")}`);
  }
  return parts.join("\n");
};

export const inferThemeLogicStyle = (themeName: string, description: string, constraints?: string): string => {
  const blob = `${themeName} ${description} ${constraints ?? ""}`.toLowerCase();
  if (/\b(victorian|curator|brass|steampunk|ornate|antique|edwardian|gothic)\b/.test(blob)) {
    return "Logic style: tactile, analog, mechanical — ciphers hidden in paper ephemera, brass dials, weight and alignment.";
  }
  if (/\b(cyber|hacker|digital|neon|server|matrix)\b/.test(blob)) {
    return "Logic style: sequential, digital-feeling — keypads, signal patterns, rapid multi-step decoding.";
  }
  if (/\b(sci-?fi|space|orbital|station|alien)\b/.test(blob)) {
    return "Logic style: sensor-driven, sequential systems — conductivity, light paths, calibrated panels.";
  }
  return "Logic style: derive from theme materials — invent mechanisms that fit the fiction's era and props.";
};

export const findPuzzlesUsingProp = (puzzles: PuzzleWithPropLink[], propId: string): string[] =>
  puzzles.filter((p) => p.propPuzzleLink?.propId === propId).map((p) => p.id);

export const attachPropPuzzleLink = (
  puzzle: {
    id: string;
    title: string;
    objective: string;
    physical_anchor_prop?: string;
    propPuzzleLink?: PropPuzzleLink;
  },
  prop: InventoryItem | null,
  logicKernel?: string,
): PropPuzzleLink | undefined => {
  if (puzzle.propPuzzleLink) return puzzle.propPuzzleLink;
  const label = prop?.name ?? puzzle.physical_anchor_prop?.trim();
  if (!label || !prop) return undefined;
  return {
    propId: prop.id,
    propLabel: label,
    logicKernel: logicKernel ?? `Players interact with ${label} to advance: ${puzzle.objective.trim()}`,
    clueDelivers: puzzle.objective.trim(),
  };
};

/** Heuristic affordances when AI infer is unavailable. */
export const inferAffordancesFromName = (name: string): InventoryItem["affordances"] => {
  const s = name.toLowerCase();
  const traits: string[] = [];
  const materials: string[] = [];
  if (/\btrunk|chest|cabinet|box\b/.test(s)) traits.push("lockable", "hides_contents");
  if (/\bbrass|copper|metal\b/.test(s)) materials.push("brass");
  if (/\bwood|wooden\b/.test(s)) materials.push("wood");
  if (/\bpaper|journal|map|book\b/.test(s)) materials.push("paper");
  if (/\bheavy|stone|anvil\b/.test(s)) traits.push("heavy");
  if (/\bmagnet\b/.test(s)) traits.push("magnetic");
  if (/\blamp|light\b/.test(s)) traits.push("illumination");
  if (/\bglass|jar|bottle\b/.test(s)) {
    materials.push("glass");
    traits.push("pourable");
  }
  let size: "small" | "medium" | "large" | undefined;
  if (/\btrunk|desk|table|rug\b/.test(s)) size = "large";
  else if (/\bcompass|key|coin|dice\b/.test(s)) size = "small";
  else size = "medium";
  return {
    size,
    materials: materials.length ? materials : undefined,
    traits: traits.length ? traits : undefined,
  };
};
