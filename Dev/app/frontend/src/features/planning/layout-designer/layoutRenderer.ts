import type { RoomLayoutDocument, RoomLayoutElement } from "../../../../../shared/roomLayout";
import { computeIsoPxPerM, isoRoomBounds, isoToWorld, worldToIso } from "./isometric";

const KIND_COLORS: Record<RoomLayoutElement["kind"], string> = {
  wall: "#94a3b8",
  door: "#fbbf24",
  puzzle_node: "#22d3ee",
  prop: "#a78bfa",
  airlock: "#38bdf8",
  tech_pit: "#f472b6",
  finale: "#fbbf24",
};

const KIND_GLOW: Record<RoomLayoutElement["kind"], string> = {
  wall: "rgba(148, 163, 184, 0.35)",
  door: "rgba(251, 191, 36, 0.4)",
  puzzle_node: "rgba(34, 211, 238, 0.55)",
  prop: "rgba(167, 139, 250, 0.45)",
  airlock: "rgba(56, 189, 248, 0.5)",
  tech_pit: "rgba(244, 114, 182, 0.5)",
  finale: "rgba(251, 191, 36, 0.55)",
};

export type IsoViewport = {
  pxPerM: number;
  originX: number;
  originY: number;
};

export function resolveIsoViewport(
  canvasWidth: number,
  canvasHeight: number,
  layout: RoomLayoutDocument,
): IsoViewport {
  return computeIsoPxPerM(canvasWidth, canvasHeight, layout.roomWidthM, layout.roomHeightM);
}

function drawIsoTile(
  ctx: CanvasRenderingContext2D,
  xM: number,
  yM: number,
  wM: number,
  hM: number,
  vp: IsoViewport,
  fill: string,
  stroke: string,
  glow?: string,
): void {
  const { pxPerM, originX, originY } = vp;
  const pts = [
    worldToIso(xM, yM, pxPerM, originX, originY),
    worldToIso(xM + wM, yM, pxPerM, originX, originY),
    worldToIso(xM + wM, yM + hM, pxPerM, originX, originY),
    worldToIso(xM, yM + hM, pxPerM, originX, originY),
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
  ctx.closePath();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawIsoGrid(ctx: CanvasRenderingContext2D, layout: RoomLayoutDocument, vp: IsoViewport): void {
  const { pxPerM, originX, originY } = vp;
  const step = layout.snapM;
  ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= layout.roomWidthM; x += step) {
    const a = worldToIso(x, 0, pxPerM, originX, originY);
    const b = worldToIso(x, layout.roomHeightM, pxPerM, originX, originY);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  for (let y = 0; y <= layout.roomHeightM; y += step) {
    const a = worldToIso(0, y, pxPerM, originX, originY);
    const b = worldToIso(layout.roomWidthM, y, pxPerM, originX, originY);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
}

export function drawLayoutScene(
  ctx: CanvasRenderingContext2D,
  layout: RoomLayoutDocument,
  vp: IsoViewport,
  selectedId: string | null,
  hoverId: string | null,
  dragOverride?: { id: string; xM: number; yM: number } | null,
): void {
  const { pxPerM, originX, originY } = vp;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  grad.addColorStop(0, "#0b1220");
  grad.addColorStop(1, "#0f172a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const bounds = isoRoomBounds(layout.roomWidthM, layout.roomHeightM, pxPerM, originX, originY);
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  drawIsoTile(ctx, 0, 0, layout.roomWidthM, layout.roomHeightM, vp, "rgba(30, 41, 59, 0.85)", "rgba(34, 211, 238, 0.45)");

  drawIsoGrid(ctx, layout, vp);

  for (const el of layout.elements) {
    const drawEl = dragOverride?.id === el.id ? { ...el, xM: dragOverride.xM, yM: dragOverride.yM } : el;
    const isSel = el.id === selectedId;
    const isHover = el.id === hoverId;
    const color = KIND_COLORS[el.kind];
    const glow = KIND_GLOW[el.kind];
    let wM = 1;
    let hM = 1;
    if (el.kind === "airlock") {
      wM = 1.2;
      hM = 0.8;
    } else if (el.kind === "tech_pit") {
      wM = 1.5;
      hM = 1;
    } else if (el.kind === "finale") {
      wM = 1.4;
      hM = 1.2;
    } else if (el.kind === "puzzle_node") {
      wM = 0.7;
      hM = 0.7;
    } else if (el.kind === "wall") {
      wM = 1;
      hM = 0.2;
    } else if (el.kind === "door") {
      wM = 0.5;
      hM = 0.8;
    } else {
      wM = 0.6;
      hM = 0.6;
    }
    const ox = drawEl.xM - wM / 2;
    const oy = drawEl.yM - hM / 2;
    drawIsoTile(
      ctx,
      ox,
      oy,
      wM,
      hM,
      vp,
      isSel || isHover ? color : `${color}cc`,
      isSel ? "#f0fdff" : isHover ? "rgba(240, 253, 255, 0.7)" : color,
      isSel || isHover ? glow : undefined,
    );
    const center = worldToIso(drawEl.xM, drawEl.yM, pxPerM, originX, originY);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `${Math.max(9, pxPerM * 0.12)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(drawEl.label.slice(0, 16), center.sx, center.sy - 4);
    ctx.textAlign = "left";
  }

  void bounds;
}

/** @deprecated Use resolveIsoViewport — kept for LayoutCanvas migration. */
export function computePxPerM(canvasWidth: number, canvasHeight: number, layout: RoomLayoutDocument): number {
  return resolveIsoViewport(canvasWidth, canvasHeight, layout).pxPerM;
}

export function canvasToWorldM(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  layout: RoomLayoutDocument,
  vp: IsoViewport,
): { xM: number; yM: number } {
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const { xM, yM } = isoToWorld(sx, sy, vp.pxPerM, vp.originX, vp.originY);
  return {
    xM: Math.max(0, Math.min(layout.roomWidthM, xM)),
    yM: Math.max(0, Math.min(layout.roomHeightM, yM)),
  };
}
