"use client";

import React, { useCallback, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { CustomGraphNode } from "./CustomGraphNode";
import { InterfaceSubflowNode } from "./InterfaceSubflowNode";
import { InterfaceConnectionNode } from "./InterfaceConnectionNode";

interface InterfaceGraphViewerProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
  interfaceLinks?: any[];
}

const nodeTypes: NodeTypes = {
  custom: CustomGraphNode,
  subflow: InterfaceSubflowNode,
  interface: InterfaceConnectionNode,
};

export function InterfaceGraphViewer({
  nodes,
  edges,
  onNodeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
  interfaceLinks = [],
}: InterfaceGraphViewerProps) {
  
  // Transform nodes and edges to use subflows grouped by structureId
  const { subflowNodes, subflowEdges } = useMemo(() => {
    if (interfaceLinks.length === 0) {
      return { subflowNodes: nodes, subflowEdges: edges };
    }

    // Group interface links by structureId
    const interfacesByStructure = interfaceLinks.reduce((acc, link) => {
      const structureId = link.structureId.toString();
      if (!acc[structureId]) {
        acc[structureId] = [];
      }
      acc[structureId].push(link);
      return acc;
    }, {} as Record<string, any[]>);

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create subflow containers for each structure
    Object.entries(interfacesByStructure).forEach(([structureId, interfaces], structureIndex) => {
      // Find the structure node 
      const structureNode = nodes.find(node => node.id === structureId);
      if (!structureNode || !Array.isArray(interfaces)) return;

      // Create subflow parent node (container for interfaces)
      const subflowParent: Node = {
        id: `subflow-${structureId}`,
        type: 'subflow',
        position: {
          x: structureIndex * 400,
          y: 50,
        },
        data: {
          label: structureNode.data.label,
          structureId: structureId,
          interfaces: interfaces,
          originalNode: structureNode,
        },
        style: {
          width: 350,
          height: Math.max(200, 100 + interfaces.length * 90),
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          border: '2px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
        },
      };
      newNodes.push(subflowParent);

      // Create interface connection nodes within the subflow
      interfaces.forEach((interfaceLink: any, interfaceIndex: number) => {
        const startNode = nodes.find(n => n.id === interfaceLink.startId.toString());
        const endNode = nodes.find(n => n.id === interfaceLink.endId.toString());
        
        if (startNode && endNode) {
          // Create interface node representing the connection
          const interfaceNode: Node = {
            id: `interface-${interfaceLink.startId}-${interfaceLink.endId}-${interfaceLink.type}`,
            type: 'interface',
            position: {
              x: 20,
              y: 60 + interfaceIndex * 90,
            },
            data: {
              label: interfaceLink.description || interfaceLink.virtualParts || 'Interface',
              type: 'interface',
              interfaceLink,
              startNode,
              endNode,
            },
            parentNode: `subflow-${structureId}`,
            extent: 'parent',
            draggable: false,
            style: {
              width: 300,
              height: 80,
            },
          };
          newNodes.push(interfaceNode);
        }
      });
    });

    // Add component nodes that are referenced in interfaces
    const referencedNodeIds = new Set<string>();
    interfaceLinks.forEach(link => {
      referencedNodeIds.add(link.startId.toString());
      referencedNodeIds.add(link.endId.toString());
    });

    // Position component nodes around the subflows
    let componentIndex = 0;
    nodes.forEach(node => {
      if (referencedNodeIds.has(node.id) && !Object.keys(interfacesByStructure).includes(node.id)) {
        const componentNode = {
          ...node,
          position: {
            x: -200,
            y: componentIndex * 150,
          },
        };
        newNodes.push(componentNode);
        componentIndex++;
      }
    });

    // Create edges from component nodes to subflow containers
    interfaceLinks.forEach(link => {
      const startNodeId = link.startId.toString();
      const endNodeId = link.endId.toString();
      const structureId = link.structureId.toString();
      
      // Create edge from start component to subflow (if start is not the structure itself)
      if (startNodeId !== structureId) {
        const edgeToSubflow: Edge = {
          id: `edge-to-subflow-${startNodeId}-${structureId}`,
          source: startNodeId,
          target: `subflow-${structureId}`,
          type: 'smoothstep',
          style: { stroke: 'rgba(59, 130, 246, 0.6)', strokeWidth: 2, strokeDasharray: '5,5' },
          animated: true,
        };
        
        // Only add if not already exists
        if (!newEdges.find(e => e.id === edgeToSubflow.id)) {
          newEdges.push(edgeToSubflow);
        }
      }
      
      // Create edge from subflow to end component (if end is not the structure itself)
      if (endNodeId !== structureId && startNodeId !== endNodeId) {
        const edgeFromSubflow: Edge = {
          id: `edge-from-subflow-${structureId}-${endNodeId}`,
          source: `subflow-${structureId}`,
          target: endNodeId,
          type: 'smoothstep',
          style: { stroke: 'rgba(59, 130, 246, 0.6)', strokeWidth: 2, strokeDasharray: '5,5' },
          animated: true,
        };
        
        // Only add if not already exists
        if (!newEdges.find(e => e.id === edgeFromSubflow.id)) {
          newEdges.push(edgeFromSubflow);
        }
      }
    });

    return { subflowNodes: newNodes, subflowEdges: newEdges };
  }, [nodes, edges, interfaceLinks]);

  const proOptions = { hideAttribution: true };

  return (
    <div className="w-full h-full rounded-lg shadow-lg overflow-hidden border border-border">
      <ReactFlow
        nodes={subflowNodes}
        edges={subflowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView={fitView}
        fitViewOptions={{ padding: 0.2 }}
        proOptions={proOptions}
        className="bg-background"
      >
        <Controls className="[&_button]:bg-card [&_button]:border-border [&_button_path]:fill-foreground hover:[&_button]:bg-muted" />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="!bg-card border border-border" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-50" />
      </ReactFlow>
    </div>
  );
}

// Wrap with ReactFlowProvider if it's used at the root of InterfaceGraphViewer or its parent
export function InterfaceGraphViewerWrapper(props: InterfaceGraphViewerProps) {
  return (
    <ReactFlowProvider>
      <InterfaceGraphViewer {...props} />
    </ReactFlowProvider>
  );
}