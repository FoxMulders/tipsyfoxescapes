/** Isometric projection helpers (30° dimetric, 0.5m world units). */

export const ISO_COS = Math.cos(Math.PI / 6);
export const ISO_SIN = Math.sin(Math.PI / 6);

export function worldToIso(
  xM: number,
  yM: number,
  pxPerM: number,
  originX: number,
  originY: number,
): { sx: number; sy: number } {
  return {
    sx: originX + (xM - yM) * ISO_COS * pxPerM,
    sy: originY + (xM + yM) * ISO_SIN * pxPerM,
  };
}

export function isoToWorld(
  sx: number,
  sy: number,
  pxPerM: number,
  originX: number,
  originY: number,
): { xM: number; yM: number } {
  const rx = (sx - originX) / pxPerM;
  const ry = (sy - originY) / pxPerM;
  const xM = (rx / ISO_COS + ry / ISO_SIN) / 2;
  const yM = (ry / ISO_SIN - rx / ISO_COS) / 2;
  return { xM, yM };
}

/** Room footprint bounding box in screen pixels (isometric). */
export function isoRoomBounds(
  roomWidthM: number,
  roomHeightM: number,
  pxPerM: number,
  originX: number,
  originY: number,
): { width: number; height: number } {
  const corners = [
    worldToIso(0, 0, pxPerM, originX, originY),
    worldToIso(roomWidthM, 0, pxPerM, originX, originY),
    worldToIso(0, roomHeightM, pxPerM, originX, originY),
    worldToIso(roomWidthM, roomHeightM, pxPerM, originX, originY),
  ];
  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function computeIsoPxPerM(
  canvasWidth: number,
  canvasHeight: number,
  roomWidthM: number,
  roomHeightM: number,
  pad = 48,
): { pxPerM: number; originX: number; originY: number } {
  const availW = Math.max(1, canvasWidth - pad * 2);
  const availH = Math.max(1, canvasHeight - pad * 2);
  const isoW = (roomWidthM + roomHeightM) * ISO_COS;
  const isoH = (roomWidthM + roomHeightM) * ISO_SIN;
  const pxPerM = Math.min(availW / isoW, availH / isoH);
  const bounds = isoRoomBounds(roomWidthM, roomHeightM, pxPerM, 0, 0);
  const originX = pad + (availW - bounds.width) / 2;
  const originY = pad + (availH - bounds.height) / 2 + roomHeightM * ISO_SIN * pxPerM;
  return { pxPerM, originX, originY };
}
