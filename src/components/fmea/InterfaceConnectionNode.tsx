"use client";

import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBigIntForDisplay } from "@/lib/bigint-utils";
import { 
  Cable, 
  Zap, 
  ArrowRightLeft, 
  Package2, 
  User, 
  Info,
  ArrowRight
} from "lucide-react";

interface InterfaceNodeData {
  label: string;
  type: string;
  interfaceLink: any;
  startNode: any;
  endNode: any;
}

// Map interface types to icons and descriptions
const interfaceTypeMap: Record<number, { icon: React.ComponentType<{className?: string}>, label: string, color: string }> = {
  1: { icon: Cable, label: "Physical Connection (P)", color: "text-amber-600" },
  2: { icon: Zap, label: "Energy Transfer (E)", color: "text-orange-600" },
  3: { icon: ArrowRightLeft, label: "Physical Gap (Pc)", color: "text-gray-600" },
  4: { icon: Package2, label: "Material Exchange (M)", color: "text-green-600" },
  5: { icon: User, label: "Human-Machine (H)", color: "text-blue-600" },
  6: { icon: Info, label: "Information Transfer (I)", color: "text-purple-600" },
};

const interactionTypeMap: Record<number, string> = {
  0: "Unidirectional",
  1: "Bidirectional",
};

const effectTypeMap: Record<number, { label: string, color: string }> = {
  0: { label: "Positive/Useful", color: "text-green-700" },
  1: { label: "Negative/Harmful", color: "text-red-700" },
};

export function InterfaceConnectionNode({ data, selected }: NodeProps<InterfaceNodeData>) {
  const { label, interfaceLink, startNode, endNode } = data;
  
  const interfaceTypeInfo = interfaceTypeMap[interfaceLink.type] || { icon: Cable, label: "Unknown", color: "text-gray-600" };
  const IconComponent = interfaceTypeInfo.icon;
  const interactionLabel = interactionTypeMap[interfaceLink.interaction] || "Unknown";
  const effectInfo = effectTypeMap[interfaceLink.effect] || { label: "Unknown", color: "text-gray-600" };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-blue-500 w-2 h-2" />
      <Card 
        className={cn(
          "shadow-md w-72 relative border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900",
          selected ? "ring-2 ring-blue-500 ring-offset-1" : ""
        )}
      >
        <CardHeader className="p-2 pb-1">
          <div className="flex items-center space-x-2">
            <IconComponent className={cn("w-4 h-4", interfaceTypeInfo.color)} />
            <CardTitle className="text-xs font-medium leading-none font-headline">
              {interfaceTypeInfo.label}
            </CardTitle>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {formatBigIntForDisplay(interfaceLink.startId)} → {formatBigIntForDisplay(interfaceLink.endId)}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-1">
          <CardDescription className="text-xs text-foreground/80 break-words">
            {label}
          </CardDescription>
          
          {/* Virtual Parts */}
          {interfaceLink.virtualParts && (
            <div className="text-xs">
              <span className="font-medium text-indigo-600 dark:text-indigo-400">Virtual Parts:</span>{" "}
              <span className="text-foreground/70">{interfaceLink.virtualParts}</span>
            </div>
          )}
          
          {/* Connection Details */}
          <div className="flex flex-col gap-1 text-[10px] border-t border-border/50 pt-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">From:</span>
              <span className="text-foreground/70 truncate">{startNode?.data?.label || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">To:</span>
              <span className="text-foreground/70 truncate">{endNode?.data?.label || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Interaction:</span>
              <span className="text-foreground/70">{interactionLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Effect:</span>
              <span className={cn("font-medium", effectInfo.color)}>{effectInfo.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Right} className="!bg-blue-500 w-2 h-2" />
    </>
  );
}