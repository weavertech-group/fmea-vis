"use client";

import React, { useMemo } from "react";
import { Node, Edge, OnNodesChange, OnEdgesChange, ReactFlowProvider } from "reactflow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomNodeData, InterfaceLink } from "@/types/fmea";
import { formatBigIntForDisplay, idKey } from "@/lib/bigint-utils";
import InterfaceSubFlow from "./InterfaceSubFlow";
import { Network, Share2 } from "lucide-react";

interface InterfaceViewerProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  interfaceLinks: InterfaceLink[];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
}

interface InterfaceGroupData {
  structureId: bigint | string | number;
  interfaces: InterfaceLink[];
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

function InterfaceViewerInternal({
  nodes,
  edges,
  interfaceLinks,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
  fitView,
}: InterfaceViewerProps) {
  const interfaceGroups = useMemo(() => {
    const groupMap = new Map<string, InterfaceGroupData>();

    interfaceLinks.forEach((iface) => {
      const structureKey = idKey(iface.structureId);

      if (!groupMap.has(structureKey)) {
        groupMap.set(structureKey, {
          structureId: iface.structureId,
          interfaces: [],
          nodes: [],
          edges: [],
        });
      }

      groupMap.get(structureKey)!.interfaces.push(iface);
    });

    groupMap.forEach((group) => {
      const nodeIds = new Set<string>();
      group.interfaces.forEach((iface) => {
        nodeIds.add(idKey(iface.startId));
        nodeIds.add(idKey(iface.endId));
      });
      group.nodes = nodes.filter((node) => nodeIds.has(node.id));
      group.edges = edges.filter(
        (edge) =>
          edge.id.includes(`interface_${idKey(group.structureId)}`) ||
          (nodeIds.has(edge.source) && nodeIds.has(edge.target))
      );
    });

    return Array.from(groupMap.values());
  }, [nodes, edges, interfaceLinks]);

  if (interfaceGroups.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-canvas px-6 text-center">
        <Share2 className="h-6 w-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">No interface data in this payload</p>
      </div>
    );
  }

  if (interfaceGroups.length === 1) {
    return (
      <div className="h-full w-full">
        <InterfaceSubFlow
          interfaceGroup={interfaceGroups[0] as any}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView={fitView}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-canvas">
      <Tabs
        defaultValue={idKey(interfaceGroups[0]?.structureId)}
        className="flex h-full flex-col"
      >
        <div className="shrink-0 border-b border-border bg-panel/80 px-2 py-1.5">
          <TabsList className="h-8 justify-start gap-0.5 overflow-x-auto bg-transparent p-0">
            {interfaceGroups.map((group) => (
              <TabsTrigger
                key={idKey(group.structureId)}
                value={idKey(group.structureId)}
                className="h-7 gap-1.5 rounded-md px-2 text-[11px] data-[state=active]:bg-muted"
              >
                <Network size={12} />
                {formatBigIntForDisplay(group.structureId)}
                <span className="opacity-60">({group.interfaces.length})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1">
          {interfaceGroups.map((group) => (
            <TabsContent
              key={idKey(group.structureId)}
              value={idKey(group.structureId)}
              className="m-0 h-full"
            >
              <InterfaceSubFlow
                interfaceGroup={group as any}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView={fitView}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

export function InterfaceViewer(props: InterfaceViewerProps) {
  return (
    <ReactFlowProvider>
      <InterfaceViewerInternal {...props} />
    </ReactFlowProvider>
  );
}
