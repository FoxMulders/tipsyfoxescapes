import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ZoneNodeData } from "../skeletonFlowGraph";

function ZoneFlowNodeComponent({ data, selected }: NodeProps<Node<ZoneNodeData>>) {
  return (
    <div
      className={`workspace-zone-node rounded-lg border px-3 py-2 shadow-lg transition-colors ${
        selected
          ? "border-cyan-400 bg-slate-900/95 ring-2 ring-cyan-400/40"
          : "border-slate-600/80 bg-slate-900/90 hover:border-cyan-500/50"
      }`}
      style={{ minWidth: 160, maxWidth: 220 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-2 !h-2 !border-0" />
      <p className="m-0 text-sm font-semibold text-slate-50 leading-tight">{data.label}</p>
      <p className="mt-1 mb-0 text-xs text-slate-400 leading-snug line-clamp-3">{data.action}</p>
      {data.hardware ? (
        <span className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-300/90 bg-cyan-950/60">
          {data.hardware.replace(/_/g, " ")}
        </span>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-2 !h-2 !border-0" />
    </div>
  );
}

export const ZoneFlowNode = memo(ZoneFlowNodeComponent);
