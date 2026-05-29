import type { RoomLayoutElement, RoomLayoutElementKind } from "../../../../../shared/roomLayout";
import type { TargetInterface } from "../../../../../shared/contracts";
import { parseItemChips } from "../domain/parseItems";

export function snapMeters(value: number, snapM: number, enabled: boolean): number {
  if (!enabled) return Math.round(value * 10) / 10;
  return Math.round(value / snapM) * snapM;
}

export function hitTestElement(
  elements: RoomLayoutElement[],
  xM: number,
  yM: number,
  toleranceM = 0.35,
): RoomLayoutElement | null {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const e = elements[i];
    if (Math.abs(e.xM - xM) <= toleranceM && Math.abs(e.yM - yM) <= toleranceM) return e;
  }
  return null;
}

export type PaletteItem = { kind: RoomLayoutElementKind; label: string; propKey?: string; category: string };

export function buildLayoutPalette(
  targetInterface: TargetInterface,
  environmentType: string,
  availableItems: string,
  presetLabels: string[],
): PaletteItem[] {
  const items: PaletteItem[] = [
    { kind: "airlock", label: "Airlock", category: "Shell" },
    { kind: "tech_pit", label: "Tech Pit", category: "Shell" },
    { kind: "finale", label: "Finale zone", category: "Shell" },
    { kind: "puzzle_node", label: "Puzzle node", category: "Gameplay" },
    { kind: "wall", label: "Wall segment", category: "Structure" },
    { kind: "door", label: "Door", category: "Structure" },
  ];
  if (targetInterface === "commercial_venue") {
    items.push(
      { kind: "prop", label: "GM sightline marker", category: "Venue ops" },
      { kind: "prop", label: "Sensor / lock placeholder", category: "Venue ops" },
      { kind: "prop", label: "Digital display", category: "Venue ops" },
    );
  }
  const chips = parseItemChips(availableItems);
  const labels = [...new Set([...presetLabels.slice(0, 8), ...chips])];
  for (const label of labels) {
    items.push({ kind: "prop", label, propKey: label, category: "Props" });
  }
  return items;
}
