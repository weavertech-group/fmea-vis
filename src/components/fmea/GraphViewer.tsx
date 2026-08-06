"use client";

import React, { useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomGraphNode } from "./CustomGraphNode";

interface GraphViewerProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitToken?: number;
}

const nodeTypes: NodeTypes = {
  custom: CustomGraphNode,
};

function GraphViewerInternal({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
  fitToken = 0,
}: GraphViewerProps) {
  const { fitView: rfFitView } = useReactFlow();

  useEffect(() => {
    if (!nodes.length) return;
    const t = setTimeout(() => {
      rfFitView({
        padding: 0.08,
        duration: 180,
        maxZoom: 1,
        minZoom: 0.72,
      });
    }, 120);
    return () => clearTimeout(t);
  }, [fitToken, nodes.length, rfFitView]);

  return (
    <div className="h-full w-full overflow-hidden bg-[#003838]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        className="bg-[#003838]"
        onlyRenderVisibleElements
      >
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          position="bottom-right"
          maskColor="rgba(0, 20, 20, 0.75)"
          nodeColor={() => "#c0c0c0"}
        />
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          size={1}
          color="#005050"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphViewerWrapper(props: GraphViewerProps) {
  return (
    <ReactFlowProvider>
      <GraphViewerInternal {...props} />
    </ReactFlowProvider>
  );
}
