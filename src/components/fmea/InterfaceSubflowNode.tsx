"use client";

import type { NodeProps } from "reactflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBigIntForDisplay } from "@/lib/bigint-utils";
import { Building2 } from "lucide-react";

interface SubflowNodeData {
  label: string;
  structureId: string;
  interfaces: any[];
  originalNode: any;
}

export function InterfaceSubflowNode({ data, selected }: NodeProps<SubflowNodeData>) {
  const { label, interfaces, structureId } = data;

  return (
    <Card 
      className={cn(
        "shadow-lg border-2 bg-blue-50/80 dark:bg-blue-950/20 backdrop-blur-sm",
        "border-blue-300 dark:border-blue-700",
        selected ? "ring-2 ring-blue-500 ring-offset-2" : ""
      )}
      style={{
        minWidth: 320,
        minHeight: 180,
      }}
    >
      <CardHeader className="p-3 pb-2 bg-blue-100 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-200 font-headline">
            INTERFACE STRUCTURE
          </CardTitle>
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-300 font-mono">
          ID: {formatBigIntForDisplay(BigInt(structureId))}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="text-sm font-medium text-foreground/90 mb-2">
          {label}
        </div>
        <div className="text-xs text-muted-foreground mb-1">
          Contains {interfaces.length} interface{interfaces.length !== 1 ? 's' : ''}
        </div>
        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          ↓ Interface connections below ↓
        </div>
      </CardContent>
    </Card>
  );
}