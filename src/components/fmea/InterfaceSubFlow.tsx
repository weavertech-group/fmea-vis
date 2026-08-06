"use client";

import React, { useMemo, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  Handle,
  Position,
  NodeProps,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useReactFlow,
} from "reactflow";
import { formatBigIntForDisplay, idKey } from "@/lib/bigint-utils";
import { CustomNodeData, InterfaceLink } from "@/types/fmea";
import { Network } from "lucide-react";
import { CustomGraphNode } from "./CustomGraphNode";

interface InterfaceGroupData {
  structureId: bigint | string | number;
  interfaces: InterfaceLink[];
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

interface InterfaceSubFlowProps {
  interfaceGroup: InterfaceGroupData;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
}

function InterfaceStructureNode({
  data,
}: NodeProps<{ structureId: bigint | string | number; interfaceCount: number }>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-primary"
      />
      <div className="w-48 rounded-xl border border-primary/30 bg-card px-3 py-2.5 shadow-panel">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
            <Network className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Structure
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {formatBigIntForDisplay(data.structureId)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {data.interfaceCount} interface link{data.interfaceCount === 1 ? "" : "s"}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-primary"
      />
    </>
  );
}

const nodeTypes = {
  interfaceStructure: InterfaceStructureNode,
  custom: CustomGraphNode,
};

function InterfaceSubFlow({
  interfaceGroup,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
}: InterfaceSubFlowProps) {
  const { fitView: rfFitView } = useReactFlow();

  const structureNode: Node = useMemo(
    () => ({
      id: `structure_${idKey(interfaceGroup.structureId)}`,
      type: "interfaceStructure",
      position: { x: 0, y: 0 },
      data: {
        structureId: interfaceGroup.structureId,
        interfaceCount: interfaceGroup.interfaces.length,
      },
    }),
    [interfaceGroup.structureId, interfaceGroup.interfaces.length]
  );

  const allNodes = useMemo(
    () => [
      structureNode,
      ...interfaceGroup.nodes.map((node) => ({
        ...node,
        position: {
          x: node.position.x,
          y: node.position.y + 100,
        },
      })),
    ],
    [structureNode, interfaceGroup.nodes]
  );

  useEffect(() => {
    if (fitView) {
      rfFitView({ padding: 0.2, duration: 200 });
    }
  }, [fitView, rfFitView, allNodes, interfaceGroup.edges]);

  return (
    <div className="h-full w-full bg-canvas">
      <ReactFlow
        nodes={allNodes}
        edges={interfaceGroup.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        minZoom={0.15}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        className="bg-canvas"
      >
        <Controls showInteractive={false} position="bottom-left" />
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="hsl(220 12% 18%)"
        />
        <Panel position="top-left" className="m-2">
          <div className="rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
            Structure {formatBigIntForDisplay(interfaceGroup.structureId)} ·{" "}
            {interfaceGroup.interfaces.length} links
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default InterfaceSubFlow;
