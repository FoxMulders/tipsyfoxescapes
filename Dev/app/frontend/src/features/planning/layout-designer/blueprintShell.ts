import type { RoomLayoutDocument, RoomLayoutElement, RoomLayoutElementKind } from "../../../../../shared/roomLayout";
import { ARCHITECTURAL_SHELL_ELEMENTS } from "../../../../../shared/roomLayout";
import type { PaletteItem } from "./layoutScene";

export type BlueprintDockItem = {
  kind: RoomLayoutElementKind;
  label: string;
  icon: string;
  shortLabel: string;
};

export const BLUEPRINT_DOCK_ITEMS: BlueprintDockItem[] = [
  { kind: "airlock", label: "Airlock", icon: "⛊", shortLabel: "Airlock" },
  { kind: "tech_pit", label: "Tech Pit", icon: "⚙", shortLabel: "Tech Pit" },
  { kind: "finale", label: "Finale zone", icon: "★", shortLabel: "Finale" },
  { kind: "puzzle_node", label: "Puzzle node", icon: "◆", shortLabel: "Puzzle Node" },
];

export function nextPuzzleNodeLabel(elements: RoomLayoutElement[]): string {
  const nums = elements
    .filter((e) => e.kind === "puzzle_node")
    .map((e) => {
      const m = /(\d+)\s*$/.exec(e.label);
      return m ? Number(m[1]) : 0;
    });
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `Puzzle node ${next}`;
}

export function nextAutoPuzzlePosition(layout: RoomLayoutDocument): { xM: number; yM: number } {
  const nodes = layout.elements.filter((e) => e.kind === "puzzle_node");
  const baseX = 2 + (nodes.length % 4) * 1.5;
  const baseY = 3 + Math.floor(nodes.length / 4) * 1;
  return {
    xM: Math.min(layout.roomWidthM - 0.5, baseX),
    yM: Math.min(layout.roomHeightM - 0.5, baseY),
  };
}

export function layoutHasShellPreset(layout: RoomLayoutDocument): boolean {
  return layout.elements.some((e) => e.id.startsWith("shell_"));
}

export function ensureArchitecturalShell(layout: RoomLayoutDocument): RoomLayoutDocument {
  if (layout.elements.length > 0) return layout;
  return {
    ...layout,
    elements: ARCHITECTURAL_SHELL_ELEMENTS.map((e) => ({ ...e })),
  };
}

export function dockItemToPalette(item: BlueprintDockItem): PaletteItem {
  return { kind: item.kind, label: item.label, category: "Blueprint" };
}
