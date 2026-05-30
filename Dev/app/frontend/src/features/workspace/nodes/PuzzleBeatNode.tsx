import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { PuzzleNodeData } from "../generationFlowGraph";

function PuzzleBeatNodeComponent({ data, selected }: NodeProps<Node<PuzzleNodeData>>) {
  return (
    <div className={`blueprint-puzzle-node ${selected ? "blueprint-puzzle-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} id="puzzle-in" className="blueprint-puzzle-handle" />
      <header className="blueprint-puzzle-node__head">
        <span className="blueprint-puzzle-node__tag">{data.category}</span>
      </header>
      <h4 className="blueprint-puzzle-node__title">{data.title}</h4>
      <p className="blueprint-puzzle-node__objective">{data.objective}</p>
    </div>
  );
}

export const PuzzleBeatNode = memo(PuzzleBeatNodeComponent);
