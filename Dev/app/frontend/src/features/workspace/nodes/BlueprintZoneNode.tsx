import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ZoneNodeData } from "../generationFlowGraph";

function DoorHandle({ type, position, id }: { type: "source" | "target"; position: Position; id: string }) {
  const side =
    position === Position.Left ? "blueprint-door-handle--west" : position === Position.Right ? "blueprint-door-handle--east" : position === Position.Top ? "blueprint-door-handle--north" : "blueprint-door-handle--south";
  return (
    <Handle
      id={id}
      type={type}
      position={position}
      className={`blueprint-door-handle ${side}`}
      aria-label={type === "target" ? "Entry pathway" : "Exit pathway"}
    />
  );
}

function BlueprintZoneNodeComponent({ data, selected }: NodeProps<Node<ZoneNodeData>>) {
  return (
    <div
      className={`blueprint-zone-node ${selected ? "blueprint-zone-node--selected" : ""}`}
      style={{ minWidth: 200, maxWidth: 260 }}
    >
      <DoorHandle type="target" position={Position.Left} id="door-in" />
      <DoorHandle type="source" position={Position.Right} id="door-out" />
      <DoorHandle type="target" position={Position.Top} id="door-n-in" />
      <DoorHandle type="source" position={Position.Bottom} id="door-s-out" />

      <div className="blueprint-zone-node__grid" aria-hidden="true" />
      <header className="blueprint-zone-node__head">
        <span className="blueprint-zone-node__tag">ROOM</span>
        <span className="blueprint-zone-node__id">{data.zoneId.replace(/^skel_|^placeholder-/, "").slice(0, 12)}</span>
      </header>
      <h3 className="blueprint-zone-node__title">{data.label}</h3>
      <p className="blueprint-zone-node__action">{data.action}</p>
      {data.hardware ? (
        <footer className="blueprint-zone-node__foot">
          <span className="blueprint-zone-node__hw">{data.hardware.replace(/_/g, " ")}</span>
        </footer>
      ) : null}
    </div>
  );
}

export const BlueprintZoneNode = memo(BlueprintZoneNodeComponent);
