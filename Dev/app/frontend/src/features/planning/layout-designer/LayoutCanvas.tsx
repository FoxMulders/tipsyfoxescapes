import { useCallback, useEffect, useRef, useState } from "react";
import { usePlanning } from "../context/PlanningProvider";
import { hitTestElement, snapMeters, type PaletteItem } from "./layoutScene";
import { canvasToWorldM, computePxPerM, drawLayoutScene } from "./layoutRenderer";
import { useLayoutKeyboard } from "./useLayoutKeyboard";

type DragPreview = { id: string; xM: number; yM: number };

export function LayoutCanvas({ pendingItem }: { pendingItem: PaletteItem | null }) {
  const { state, dispatch } = usePlanning();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string; offsetXM: number; offsetYM: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const pxPerMRef = useRef(40);

  useLayoutKeyboard(dispatch);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      drawLayoutScene(ctx, state.roomLayout, pxPerMRef.current, state.layoutSelectedId, hoverId, dragPreview);
    });
  }, [state.roomLayout, state.layoutSelectedId, hoverId, dragPreview]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = host.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pxPerMRef.current = computePxPerM(rect.width, rect.height, state.roomLayout);
        scheduleDraw();
      }, 80);
    });
    ro.observe(host);
    return () => {
      ro.disconnect();
      if (debounce) clearTimeout(debounce);
    };
  }, [state.roomLayout, scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw, state.roomLayout.elements, state.layoutSelectedId, hoverId, dragPreview]);

  const placeAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !pendingItem) return;
    const rect = canvas.getBoundingClientRect();
    const { xM: rawX, yM: rawY } = canvasToWorldM(clientX, clientY, rect, state.roomLayout, pxPerMRef.current);
    const xM = snapMeters(rawX, state.roomLayout.snapM, state.roomLayout.snapEnabled);
    const yM = snapMeters(rawY, state.roomLayout.snapM, state.roomLayout.snapEnabled);
    dispatch({
      type: "LAYOUT_PLACE",
      element: {
        kind: pendingItem.kind,
        label: pendingItem.label,
        xM,
        yM,
        meta: pendingItem.propKey ? { propKey: pendingItem.propKey } : undefined,
      },
    });
  };

  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { xM, yM } = canvasToWorldM(ev.clientX, ev.clientY, rect, state.roomLayout, pxPerMRef.current);
    if (pendingItem) {
      placeAt(ev.clientX, ev.clientY);
      return;
    }
    const hit = hitTestElement(state.roomLayout.elements, xM, yM);
    if (hit) {
      dispatch({ type: "LAYOUT_SELECT", id: hit.id });
      dragRef.current = { id: hit.id, offsetXM: xM - hit.xM, offsetYM: yM - hit.yM };
      canvas.setPointerCapture(ev.pointerId);
    } else {
      dispatch({ type: "LAYOUT_SELECT", id: null });
    }
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { xM, yM } = canvasToWorldM(ev.clientX, ev.clientY, rect, state.roomLayout, pxPerMRef.current);
    if (dragRef.current) {
      const nx = snapMeters(
        Math.max(0, Math.min(state.roomLayout.roomWidthM, xM - dragRef.current.offsetXM)),
        state.roomLayout.snapM,
        state.roomLayout.snapEnabled,
      );
      const ny = snapMeters(
        Math.max(0, Math.min(state.roomLayout.roomHeightM, yM - dragRef.current.offsetYM)),
        state.roomLayout.snapM,
        state.roomLayout.snapEnabled,
      );
      setDragPreview({ id: dragRef.current.id, xM: nx, yM: ny });
      return;
    }
    const hit = hitTestElement(state.roomLayout.elements, xM, yM);
    setHoverId(hit?.id ?? null);
  };

  const onPointerUp = () => {
    if (dragRef.current && dragPreview) {
      dispatch({ type: "LAYOUT_MOVE", id: dragPreview.id, xM: dragPreview.xM, yM: dragPreview.yM });
    }
    dragRef.current = null;
    setDragPreview(null);
  };

  return (
    <div ref={hostRef} className="layout-designer-canvas-host">
      <canvas
        ref={canvasRef}
        className="layout-designer-canvas"
        role="img"
        aria-label="Interactive room layout designer. Use palette buttons then click to place. Arrow keys move selection."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
}
