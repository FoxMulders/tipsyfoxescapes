import type { RoomLayoutDocument, RoomLayoutElement } from "../../../../../shared/roomLayout";

const KIND_COLORS: Record<RoomLayoutElement["kind"], string> = {
  wall: "#94a3b8",
  door: "#fbbf24",
  puzzle_node: "#22d3ee",
  prop: "#a78bfa",
};

export function drawLayoutScene(
  ctx: CanvasRenderingContext2D,
  layout: RoomLayoutDocument,
  pxPerM: number,
  selectedId: string | null,
  hoverId: string | null,
  dragOverride?: { id: string; xM: number; yM: number } | null,
): void {
  const w = layout.roomWidthM * pxPerM;
  const h = layout.roomHeightM * pxPerM;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(12, 12);
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "rgba(34, 211, 238, 0.35)";
  ctx.lineWidth = 2;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeRect(0, 0, w, h);
  const gridStep = layout.snapM * pxPerM;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (const el of layout.elements) {
    const drawEl =
      dragOverride?.id === el.id ? { ...el, xM: dragOverride.xM, yM: dragOverride.yM } : el;
    const cx = drawEl.xM * pxPerM;
    const cy = drawEl.yM * pxPerM;
    const isSel = el.id === selectedId;
    const isHover = el.id === hoverId;
    ctx.fillStyle = KIND_COLORS[el.kind];
    ctx.globalAlpha = isSel || isHover ? 1 : 0.85;
    if (el.kind === "wall") {
      ctx.fillRect(cx - pxPerM * 0.5, cy - 0.08 * pxPerM, pxPerM, 0.16 * pxPerM);
    } else if (el.kind === "door") {
      ctx.fillRect(cx - 0.2 * pxPerM, cy - 0.35 * pxPerM, 0.4 * pxPerM, 0.7 * pxPerM);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, 0.22 * pxPerM, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isSel) {
      ctx.strokeStyle = "#f0fdff";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - pxPerM * 0.55, cy - pxPerM * 0.55, pxPerM * 1.1, pxPerM * 1.1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `${Math.max(10, pxPerM * 0.14)}px Inter, sans-serif`;
    ctx.fillText(drawEl.label.slice(0, 18), cx + 4, cy - 4);
  }
  ctx.restore();
}

export function computePxPerM(canvasWidth: number, canvasHeight: number, layout: RoomLayoutDocument): number {
  const pad = 24;
  const availW = Math.max(1, canvasWidth - pad);
  const availH = Math.max(1, canvasHeight - pad);
  return Math.min(availW / layout.roomWidthM, availH / layout.roomHeightM);
}

export function canvasToWorldM(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  layout: RoomLayoutDocument,
  pxPerM: number,
): { xM: number; yM: number } {
  const xPx = clientX - rect.left - 12;
  const yPx = clientY - rect.top - 12;
  const xM = Math.max(0, Math.min(layout.roomWidthM, xPx / pxPerM));
  const yM = Math.max(0, Math.min(layout.roomHeightM, yPx / pxPerM));
  return { xM, yM };
}
