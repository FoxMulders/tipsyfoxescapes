import { useCallback, useMemo, useRef, useState } from "react";
import { creativeEnginesStore } from "./store.ts";
import { useCreativeEnginesStore } from "./hooks/useCreativeEnginesStore.ts";

const NODE_W = 120;
const NODE_H = 44;
const DEBOUNCE_MS = 48;

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: number | undefined;
  return ((...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  }) as T;
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function PuzzleDependencyGraph(): JSX.Element {
  const puzzleNodes = useCreativeEnginesStore((s) => s.puzzleNodes);
  const puzzleEdges = useCreativeEnginesStore((s) => s.puzzleEdges);
  const selectedId = useCreativeEnginesStore((s) => s.selectedPuzzleNodeId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);

  const nodeMap = useMemo(() => new Map(puzzleNodes.map((n) => [n.id, n])), [puzzleNodes]);

  const debouncedMove = useMemo(
    () =>
      debounce((nodeId: string, x: number, y: number) => {
        creativeEnginesStore.updatePuzzleNodePosition(nodeId, x, y);
      }, DEBOUNCE_MS),
    [],
  );

  const viewBox = useMemo(() => {
    if (!puzzleNodes.length) return { minX: 0, minY: 0, width: 800, height: 400 };
    const xs = puzzleNodes.map((n) => n.x);
    const ys = puzzleNodes.map((n) => n.y);
    const minX = Math.min(...xs) - 40;
    const minY = Math.min(...ys) - 40;
    const maxX = Math.max(...xs) + NODE_W + 40;
    const maxY = Math.max(...ys) + NODE_H + 40;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [puzzleNodes]);

  const visibleNodeIds = useMemo(() => {
    const pad = 80;
    const left = (-pan.x) / zoom - pad;
    const top = (-pan.y) / zoom - pad;
    const right = left + 900 / zoom + pad * 2;
    const bottom = top + 520 / zoom + pad * 2;
    return new Set(
      puzzleNodes
        .filter((n) => n.x + NODE_W >= left && n.x <= right && n.y + NODE_H >= top && n.y <= bottom)
        .map((n) => n.id),
    );
  }, [puzzleNodes, pan, zoom]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    if (e.target !== svgRef.current) return;
    panRef.current = { startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMoveCanvas = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.startX) / zoom;
      const dy = (e.clientY - d.startY) / zoom;
      debouncedMove(d.nodeId, d.origX + dx, d.origY + dy);
      return;
    }
    if (panRef.current) {
      const p = panRef.current;
      setPan({ x: p.origPanX + e.clientX - p.startX, y: p.origPanY + e.clientY - p.startY });
    }
  };

  const onPointerUpCanvas = () => {
    dragRef.current = null;
    panRef.current = null;
  };

  return (
    <div className="ce-puzzle-graph" role="region" aria-label="Puzzle dependency graph">
      <div className="ce-puzzle-graph-toolbar">
        <button type="button" className="secondary-btn" onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}>
          Zoom in
        </button>
        <button type="button" className="secondary-btn" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>
          Zoom out
        </button>
        <button type="button" className="secondary-btn" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>
          Reset view
        </button>
        <span className="muted">Drag nodes · scroll to zoom · edges use arrows and dash patterns</span>
      </div>

      <svg
        ref={svgRef}
        className="ce-puzzle-graph-svg"
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        onWheel={onWheel}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMoveCanvas}
        onPointerUp={onPointerUpCanvas}
        onPointerLeave={onPointerUpCanvas}
        role="img"
        aria-label="Interactive puzzle dependency diagram"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <defs>
            <marker id="ce-arrow-solid" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-success-neon)" />
            </marker>
            <marker id="ce-arrow-dashed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="hsl(38 92% 58%)" />
            </marker>
          </defs>

          {puzzleEdges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            if (!visibleNodeIds.has(from.id) && !visibleNodeIds.has(to.id)) return null;
            const x1 = from.x + NODE_W / 2;
            const y1 = from.y + NODE_H;
            const x2 = to.x + NODE_W / 2;
            const y2 = to.y;
            const dashed = edge.strokeStyle === "dashed" || edge.kind === "contributes";
            return (
              <g key={edge.id} className="ce-graph-edge">
                <path
                  d={edgePath(x1, y1, x2, y2)}
                  fill="none"
                  stroke={dashed ? "hsl(38 92% 58%)" : "var(--color-success-neon)"}
                  strokeWidth={2}
                  strokeDasharray={dashed ? "6 4" : undefined}
                  markerEnd={dashed ? "url(#ce-arrow-dashed)" : "url(#ce-arrow-solid)"}
                />
                {edge.label ? (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} className="ce-edge-label">
                    {edge.kind === "gates" ? "⛨ " : ""}
                    {edge.label.slice(0, 28)}
                  </text>
                ) : (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} className="ce-edge-label">
                    {edge.kind}
                  </text>
                )}
              </g>
            );
          })}

          {puzzleNodes.map((node) => {
            if (!visibleNodeIds.has(node.id)) return null;
            const selected = node.id === selectedId;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`ce-graph-node${selected ? " ce-graph-node--selected" : ""}${node.narrativeTriggerId ? " ce-graph-node--linked" : ""}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  creativeEnginesStore.selectPuzzleNode(node.id);
                  dragRef.current = {
                    nodeId: node.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: node.x,
                    origY: node.y,
                  };
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Puzzle node ${node.label}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    creativeEnginesStore.selectPuzzleNode(node.id);
                  }
                }}
              >
                <rect width={NODE_W} height={NODE_H} rx={8} className="ce-graph-node-rect" />
                <text x={8} y={18} className="ce-graph-node-title">
                  {node.label.slice(0, 16)}
                </text>
                <text x={8} y={34} className="ce-graph-node-sub">
                  {node.puzzleId}
                </text>
                {node.narrativeTriggerId ? (
                  <text x={NODE_W - 8} y={14} className="ce-graph-node-badge" textAnchor="end">
                    narr
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <table className="ce-a11y-mirror-table" aria-label="Keyboard navigable puzzle dependency mirror">
        <caption className="sr-only">Puzzle dependency edge list</caption>
        <thead>
          <tr>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Kind</th>
            <th scope="col">Style</th>
          </tr>
        </thead>
        <tbody>
          {puzzleEdges.map((edge) => (
            <tr key={`mirror-${edge.id}`}>
              <td>{nodeMap.get(edge.from)?.label ?? edge.from}</td>
              <td>{nodeMap.get(edge.to)?.label ?? edge.to}</td>
              <td>{edge.kind}</td>
              <td>{edge.strokeStyle ?? "solid"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
