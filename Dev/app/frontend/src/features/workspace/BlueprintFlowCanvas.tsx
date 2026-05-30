import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RoomSkeleton } from "../../../../shared/roomSkeleton";
import { generationToFlowGraph, type FlowNodeData } from "./generationFlowGraph";
import type { PuzzleInspectorSlice } from "./WorkspaceInspectorPanel";
import { BlueprintZoneNode } from "./nodes/BlueprintZoneNode";
import { PuzzleBeatNode } from "./nodes/PuzzleBeatNode";

const nodeTypes = { blueprintZone: BlueprintZoneNode, puzzleBeat: PuzzleBeatNode };

type BlueprintFlowCanvasProps = {
  skeleton: RoomSkeleton | null;
  puzzles: PuzzleInspectorSlice[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null, data: FlowNodeData | null) => void;
  layoutRevision?: number;
  className?: string;
};

function FitViewOnGraphChange({ graphKey, layoutRevision }: { graphKey: string; layoutRevision?: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 280, maxZoom: 1.25 });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [fitView, graphKey, layoutRevision]);

  return null;
}

function BlueprintFlowCanvasInner({
  skeleton,
  puzzles,
  selectedNodeId,
  onNodeSelect,
  layoutRevision,
  className,
}: BlueprintFlowCanvasProps) {
  const graph = useMemo(() => generationToFlowGraph(skeleton, puzzles), [skeleton, puzzles]);
  const graphKey = useMemo(
    () => `${skeleton?.flow_pattern ?? "empty"}:${graph.nodes.map((n) => n.id).join(",")}:${puzzles.length}`,
    [graph.nodes, puzzles.length, skeleton?.flow_pattern],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes((prev) => {
      const savedPositions = new Map(prev.map((n) => [n.id, n.position]));
      return graph.nodes.map((n) => ({
        ...n,
        position: savedPositions.get(n.id) ?? n.position,
        draggable: true,
      }));
    });
    setEdges(graph.edges);
  }, [graph.nodes, graph.edges, setNodes, setEdges]);

  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: selectedNodeId !== null && n.id === selectedNodeId,
      })),
    );
  }, [selectedNodeId, setNodes]);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node<FlowNodeData>[] }) => {
      const picked = selected[0];
      if (!picked) {
        onNodeSelect(null, null);
        return;
      }
      onNodeSelect(picked.id, picked.data);
    },
    [onNodeSelect],
  );

  return (
    <div className={`workspace-flow-canvas relative h-full w-full min-h-0 ${className ?? ""}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.25 }}
        minZoom={0.12}
        maxZoom={2}
        panOnScroll
        zoomOnPinch
        panOnDrag
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        className="workspace-flow-canvas__flow bg-slate-950"
      >
        <FitViewOnGraphChange graphKey={graphKey} layoutRevision={layoutRevision} />
        <Background variant={BackgroundVariant.Lines} gap={24} size={1} color="hsl(215 35% 28% / 0.45)" />
        <Controls className="workspace-flow-controls !border-slate-700 !bg-slate-900/90 !shadow-lg" position="bottom-left" />
        <MiniMap
          className="!border-slate-700 !bg-slate-900/80 hidden md:block"
          nodeColor={(node) => (node.type === "puzzleBeat" ? "#a78bfa" : "#22d3ee")}
          maskColor="rgb(15 23 42 / 0.75)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}

export function BlueprintFlowCanvas(props: BlueprintFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <BlueprintFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
