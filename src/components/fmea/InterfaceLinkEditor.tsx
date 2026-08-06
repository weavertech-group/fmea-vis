"use client";

import type { InterfaceLink } from "@/types/fmea";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBigIntForEditor } from "@/lib/bigint-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Share2 } from "lucide-react";

interface InterfaceLinkEditorProps {
  interfaceLink: InterfaceLink | null;
  onPropertyChange: (updatedInterfaceLink: InterfaceLink) => void;
  onUpdateInterfaceLink: () => void;
  disabled?: boolean;
}

export function InterfaceLinkEditor({
  interfaceLink,
  onPropertyChange,
  onUpdateInterfaceLink,
  disabled,
}: InterfaceLinkEditorProps) {
  if (!interfaceLink) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <Share2 className="mb-3 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Select an interface edge to edit.</p>
      </div>
    );
  }

  const handleInputChange = (field: keyof InterfaceLink, value: string | number | bigint) => {
    onPropertyChange({ ...interfaceLink, [field]: value });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Interface link
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          struct {formatBigIntForEditor(interfaceLink.structureId)}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                value={formatBigIntForEditor(interfaceLink.startId)}
                readOnly
                disabled
                className="font-mono text-xs bg-muted/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                value={formatBigIntForEditor(interfaceLink.endId)}
                readOnly
                disabled
                className="font-mono text-xs bg-muted/50"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={interfaceLink.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              disabled={disabled}
              className="resize-none text-sm bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Virtual parts</Label>
            <Input
              value={interfaceLink.virtualParts}
              onChange={(e) => handleInputChange("virtualParts", e.target.value)}
              disabled={disabled}
              className="text-sm bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Interaction</Label>
            <Select
              value={String(interfaceLink.interaction)}
              onValueChange={(v) => handleInputChange("interaction", parseInt(v, 10))}
              disabled={disabled}
            >
              <SelectTrigger className="bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Unidirectional</SelectItem>
                <SelectItem value="1">Bidirectional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Effect</Label>
            <Select
              value={String(interfaceLink.effect)}
              onValueChange={(v) => handleInputChange("effect", parseInt(v, 10))}
              disabled={disabled}
            >
              <SelectTrigger className="bg-muted/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Normal (green)</SelectItem>
                <SelectItem value="1">Adverse (red)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Input
              type="number"
              value={interfaceLink.type}
              onChange={(e) => handleInputChange("type", parseInt(e.target.value, 10) || 0)}
              disabled={disabled}
              className="bg-muted/30"
            />
          </div>
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t border-border p-3">
        <Button onClick={onUpdateInterfaceLink} className="w-full" disabled={disabled}>
          <Save className="mr-2 h-4 w-4" />
          Apply to graph
        </Button>
      </div>
    </div>
  );
}
