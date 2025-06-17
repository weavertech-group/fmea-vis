"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CustomNodeData } from "@/types/fmea";
import { HardDrive, Server, Puzzle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SubFlowNodeData extends CustomNodeData {
  isExpanded?: boolean;
  onToggleExpand?: (nodeId: string) => void;
  childCount?: number;
  subFlowType?: 'system' | 'subsystem' | 'component';
}

const subFlowStyleMap: Record<string, { 
  icon: React.ComponentType<{className?: string}>, 
  colorClass: string, 
  bgColorClass: string, 
  borderColorClass: string 
}> = {
  system: { icon: HardDrive, colorClass: "text-chart-4", bgColorClass: "bg-chart-4/10", borderColorClass: "border-chart-4" },
  subsystem: { icon: Server, colorClass: "text-chart-5", bgColorClass: "bg-chart-5/10", borderColorClass: "border-chart-5" },
  component: { icon: Puzzle, colorClass: "text-chart-1", bgColorClass: "bg-chart-1/10", borderColorClass: "border-chart-1" },
  default: { icon: HardDrive, colorClass: "text-slate-500", bgColorClass: "bg-slate-500/10", borderColorClass: "border-slate-500" },
};

export const SubFlowNode = memo(({ 
  data, 
  selected, 
  sourcePosition = Position.Right, 
  targetPosition = Position.Left 
}: NodeProps<SubFlowNodeData>) => {
  const { 
    label, 
    type, 
    originalApiNode, 
    isExpanded = true, 
    onToggleExpand, 
    childCount = 0,
    subFlowType = 'system'
  } = data;
  
  const styleInfo = subFlowStyleMap[subFlowType] || subFlowStyleMap.default;
  const IconComponent = styleInfo.icon;
  const ExpandIcon = isExpanded ? ChevronDown : ChevronRight;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand && originalApiNode) {
      onToggleExpand(originalApiNode.uuid.toString());
    }
  };

  return (
    <>
      <Handle type="target" position={targetPosition} className="!bg-accent w-3 h-3" />
      <Card 
        className={cn(
          "shadow-lg w-80 relative transition-all duration-200", 
          styleInfo.bgColorClass, 
          styleInfo.borderColorClass,
          selected ? `ring-2 ring-offset-1 ${styleInfo.borderColorClass} ring-opacity-75` : "",
          isExpanded ? "border-2" : "border"
        )}
        style={{
          // @ts-ignore
          '--tw-border-opacity': selected ? 1 : 0.7,
          borderColor: selected ? `hsl(var(--accent))` : undefined,
        }}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IconComponent className={cn("w-5 h-5", styleInfo.colorClass)} />
              <CardTitle className={cn("text-sm font-medium leading-none", styleInfo.colorClass, "font-headline")}>
                {subFlowType.toUpperCase()} INTERFACE
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="h-6 w-6 p-0 hover:bg-accent/50"
            >
              <ExpandIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute top-1 right-10 px-1.5 py-0.5 rounded bg-black/5 text-muted-foreground text-[10px] font-mono">
            UUID: {originalApiNode?.uuid ? originalApiNode.uuid.toString().slice(-6) : 'N/A'}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {label}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{childCount} child{childCount !== 1 ? 'ren' : ''}</span>
              <span className={cn("px-2 py-1 rounded text-xs", styleInfo.bgColorClass, styleInfo.colorClass)}>
                {isExpanded ? 'Expanded' : 'Collapsed'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={sourcePosition} className="!bg-accent w-3 h-3" />
    </>
  );
});

SubFlowNode.displayName = 'SubFlowNode';