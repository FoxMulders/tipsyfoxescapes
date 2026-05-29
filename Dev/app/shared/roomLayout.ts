export type RoomLayoutElementKind = "wall" | "door" | "puzzle_node" | "prop";

export type RoomLayoutElement = {
  id: string;
  kind: RoomLayoutElementKind;
  label: string;
  xM: number;
  yM: number;
  rotationDeg?: number;
  meta?: { propKey?: string; locked?: boolean };
};

export type RoomLayoutDocument = {
  version: 1;
  roomWidthM: number;
  roomHeightM: number;
  snapM: 0.5;
  snapEnabled: boolean;
  elements: RoomLayoutElement[];
};

export const DEFAULT_ROOM_LAYOUT: RoomLayoutDocument = {
  version: 1,
  roomWidthM: 8,
  roomHeightM: 6,
  snapM: 0.5,
  snapEnabled: true,
  elements: [],
};

export const ROOM_LAYOUT_MAX_ELEMENTS = 200;
export const ROOM_LAYOUT_MIN_M = 2;
export const ROOM_LAYOUT_MAX_M = 40;

export function countPlacedPuzzleNodes(layout: RoomLayoutDocument): number {
  return layout.elements.filter((e) => e.kind === "puzzle_node").length;
}

export function validateRoomLayout(raw: unknown): RoomLayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Partial<RoomLayoutDocument>;
  if (doc.version !== 1) return null;
  const w = Number(doc.roomWidthM);
  const h = Number(doc.roomHeightM);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (w < ROOM_LAYOUT_MIN_M || w > ROOM_LAYOUT_MAX_M || h < ROOM_LAYOUT_MIN_M || h > ROOM_LAYOUT_MAX_M) return null;
  if (!Array.isArray(doc.elements) || doc.elements.length > ROOM_LAYOUT_MAX_ELEMENTS) return null;
  const allowed = new Set<RoomLayoutElementKind>(["wall", "door", "puzzle_node", "prop"]);
  const elements: RoomLayoutElement[] = [];
  for (const row of doc.elements) {
    if (!row || typeof row !== "object") return null;
    const kind = (row as RoomLayoutElement).kind;
    if (!allowed.has(kind)) return null;
    const id = String((row as RoomLayoutElement).id ?? "").trim().slice(0, 80);
    const label = String((row as RoomLayoutElement).label ?? "").trim().slice(0, 120);
    const xM = Number((row as RoomLayoutElement).xM);
    const yM = Number((row as RoomLayoutElement).yM);
    if (!id || !label || !Number.isFinite(xM) || !Number.isFinite(yM)) return null;
    if (xM < 0 || yM < 0 || xM > w || yM > h) return null;
    elements.push({
      id,
      kind,
      label,
      xM,
      yM,
      rotationDeg:
        (row as RoomLayoutElement).rotationDeg != null
          ? Math.max(0, Math.min(360, Number((row as RoomLayoutElement).rotationDeg)))
          : undefined,
      meta: (row as RoomLayoutElement).meta,
    });
  }
  return {
    version: 1,
    roomWidthM: w,
    roomHeightM: h,
    snapM: 0.5,
    snapEnabled: doc.snapEnabled !== false,
    elements,
  };
}

export function formatRoomLayoutMarkdown(layout: RoomLayoutDocument | undefined): string[] {
  if (!layout || layout.elements.length === 0) {
    return ["_No floor-plan elements placed in the layout designer._"];
  }
  return [
    `Room size: **${layout.roomWidthM}m × ${layout.roomHeightM}m** (snap ${layout.snapM}m, snap ${layout.snapEnabled ? "on" : "off"})`,
    "",
    "| # | Label | Type | X (m) | Y (m) |",
    "| --- | --- | --- | --- | --- |",
    ...layout.elements.map(
      (el, i) => `| ${i + 1} | ${el.label.replace(/\|/g, "\\|")} | ${el.kind} | ${el.xM} | ${el.yM} |`,
    ),
  ];
}
