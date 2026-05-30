/** Living inventory + prop-puzzle binding types (shared frontend/backend). */

export type InventoryItemRole = "unassigned" | "puzzle_carrier" | "set_dressing" | "red_herring";

export type PropAffordances = {
  size?: "small" | "medium" | "large";
  materials?: string[];
  traits?: string[];
  placement?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  status: "use" | "exclude";
  role: InventoryItemRole;
  affordances?: PropAffordances;
  stagingNotes?: string;
};

export type PropPuzzleLink = {
  propId: string;
  propLabel: string;
  logicKernel: string;
  clueDelivers: string;
};

export type TechLevel = "low_tech" | "mixed" | "maker_heavy";

export type DesignConstraintsInput = {
  designConstraints?: string;
  noGoItems?: string[];
  techLevel?: TechLevel;
};

let nextInventoryId = 1;

export const newInventoryItemId = (): string => {
  const id = `inv_${Date.now().toString(36)}_${nextInventoryId++}`;
  return id;
};

export const inventoryItemFromName = (name: string, status: "use" | "exclude" = "use"): InventoryItem => ({
  id: newInventoryItemId(),
  name: name.trim(),
  status,
  role: "unassigned",
});

/** Migrate legacy string[] availableItems to InventoryItem[]. */
export const migrateAvailableItemsToInventory = (items: string[]): InventoryItem[] => {
  const out: InventoryItem[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const low = t.toLowerCase().replace(/\s+/g, " ");
    if (low === "not specified yet") continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(inventoryItemFromName(t.length > 80 ? `${t.slice(0, 77)}…` : t, "use"));
    if (out.length >= 22) break;
  }
  return out;
};

export const inventoryItemNames = (items: InventoryItem[]): string[] =>
  items.filter((i) => i.status === "use").map((i) => i.name);

export const puzzleEligibleInventory = (items: InventoryItem[]): InventoryItem[] =>
  items.filter(
    (i) => i.status === "use" && (i.role === "unassigned" || i.role === "puzzle_carrier"),
  );

export const stagingOnlyInventory = (items: InventoryItem[]): InventoryItem[] =>
  items.filter((i) => i.status === "use" && (i.role === "set_dressing" || i.role === "red_herring"));

export const normalizeInventoryItems = (items: InventoryItem[]): InventoryItem[] => {
  const out: InventoryItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const name = String(item.name ?? "").trim();
    if (!name) continue;
    const low = name.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push({
      id: item.id?.trim() || newInventoryItemId(),
      name: name.length > 80 ? `${name.slice(0, 77)}…` : name,
      status: item.status === "exclude" ? "exclude" : "use",
      role: item.role ?? "unassigned",
      affordances: item.affordances,
      stagingNotes: item.stagingNotes?.trim() || undefined,
    });
    if (out.length >= 22) break;
  }
  return out;
};

export const resolveInventoryFromPlanning = (input: {
  inventoryItems?: InventoryItem[];
  availableItems?: string[];
}): InventoryItem[] => {
  if (Array.isArray(input.inventoryItems) && input.inventoryItems.length > 0) {
    return normalizeInventoryItems(input.inventoryItems);
  }
  if (Array.isArray(input.availableItems) && input.availableItems.length > 0) {
    return migrateAvailableItemsToInventory(input.availableItems);
  }
  return [];
};

export const formatAffordancesForPrompt = (item: InventoryItem): string => {
  const parts: string[] = [item.name];
  const a = item.affordances;
  if (a?.size) parts.push(`size=${a.size}`);
  if (a?.materials?.length) parts.push(`materials=${a.materials.join(",")}`);
  if (a?.traits?.length) parts.push(`traits=${a.traits.join(",")}`);
  if (a?.placement) parts.push(`placement=${a.placement}`);
  if (item.role !== "unassigned") parts.push(`role=${item.role}`);
  return parts.join(" | ");
};
