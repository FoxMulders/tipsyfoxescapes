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
import { roomSkeletonToFlowGraph, type ZoneNodeData } from "./skeletonFlowGraph";
import { ZoneFlowNode } from "./nodes/ZoneFlowNode";

const nodeTypes = { zone: ZoneFlowNode };

type BlueprintFlowCanvasProps = {
  skeleton: RoomSkeleton | null;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null, data: ZoneNodeData | null) => void;
  layoutRevision?: number;
  className?: string;
};

function FitViewOnGraphChange({ graphKey, layoutRevision }: { graphKey: string; layoutRevision?: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 280, maxZoom: 1.35 });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [fitView, graphKey, layoutRevision]);

  return null;
}

function BlueprintFlowCanvasInner({
  skeleton,
  selectedNodeId,
  onNodeSelect,
  layoutRevision,
  className,
}: BlueprintFlowCanvasProps) {
  const graph = useMemo(() => roomSkeletonToFlowGraph(skeleton), [skeleton]);
  const graphKey = useMemo(
    () => `${skeleton?.flow_pattern ?? "placeholder"}:${graph.nodes.map((n) => n.id).join(",")}`,
    [graph.nodes, skeleton?.flow_pattern],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
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
    ({ nodes: selected }: { nodes: Node<ZoneNodeData>[] }) => {
      const picked = selected[0];
      if (!picked) {
        onNodeSelect(null, null);
        return;
      }
      if (picked.id.startsWith("placeholder-")) {
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
        fitViewOptions={{ padding: 0.2, maxZoom: 1.35 }}
        minZoom={0.15}
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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(187 50% 40% / 0.35)" />
        <Controls className="workspace-flow-controls !border-slate-700 !bg-slate-900/90 !shadow-lg" position="bottom-left" />
        <MiniMap
          className="!border-slate-700 !bg-slate-900/80 hidden md:block"
          nodeColor={() => "#22d3ee"}
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
