"use client";

import type { FmeaNode, ApiResponseType } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBigIntForEditor } from "@/lib/bigint-utils";

interface PropertiesEditorPanelProps {
  nodeData: FmeaNode | null;
  apiResponseType: ApiResponseType | null;
  onPropertyChange: (updatedNodeData: FmeaNode) => void;
  onUpdateNode: () => void;
  disabled?: boolean;
}

const getExtraFieldsConfig = (
  nodeType: string,
  apiResponseType: ApiResponseType | null
): { key: string; label: string; type: "string" | "number" | "textarea" }[] => {
  if (!apiResponseType) return [];
  switch (apiResponseType) {
    case "requirements":
      if (nodeType === "requirement")
        return [
          { key: "partNo", label: "Part No", type: "string" },
          { key: "partName", label: "Part Name", type: "string" },
        ];
      return [];
    case "dfmea":
      switch (nodeType) {
        case "system":
        case "subsystem":
        case "component":
          return [{ key: "dr", label: "DR", type: "number" }];
        case "func":
          return [{ key: "category", label: "Category", type: "number" }];
        case "failure":
          return [
            { key: "failureType", label: "Failure Type", type: "number" },
            { key: "severity", label: "Severity", type: "number" },
            { key: "occurrence", label: "Occurrence", type: "number" },
          ];
        case "action":
          return [
            { key: "category", label: "Category", type: "number" },
            { key: "detection", label: "Detection", type: "number" },
          ];
        default:
          return [];
      }
    case "pfmea":
      switch (nodeType) {
        case "elem":
          return [{ key: "em", label: "EM", type: "number" }];
        case "cha":
          return [{ key: "type", label: "Type (product/process)", type: "string" }];
        case "effect":
          return [
            { key: "category", label: "Category", type: "number" },
            { key: "severity", label: "Severity", type: "number" },
          ];
        case "cause":
          return [{ key: "occurrence", label: "Occurrence", type: "number" }];
        case "action":
          return [
            { key: "category", label: "Category", type: "number" },
            { key: "detection", label: "Detection", type: "number" },
          ];
        default:
          return [];
      }
    default:
      return [];
  }
};

export function PropertiesEditorPanel({
  nodeData,
  apiResponseType,
  onPropertyChange,
  onUpdateNode,
  disabled,
}: PropertiesEditorPanelProps) {
  const [newExtraKey, setNewExtraKey] = useState("");
  const [newExtraValue, setNewExtraValue] = useState("");

  useEffect(() => {
    setNewExtraKey("");
    setNewExtraValue("");
  }, [nodeData]);

  if (!nodeData) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <p className="text-sm font-medium">No selection</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a node on the diagram or outline to inspect.
        </p>
      </div>
    );
  }

  const handleInputChange = (
    field: keyof FmeaNode | `extra.${string}`,
    value: string | number | bigint
  ) => {
    const updatedNode = { ...nodeData, extra: { ...(nodeData.extra || {}) } } as FmeaNode;
    if (typeof field === "string" && field.startsWith("extra.")) {
      const extraKey = field.substring(6);
      (updatedNode.extra as any)![extraKey] = value;
    } else {
      (updatedNode as any)[field] = value;
    }
    onPropertyChange(updatedNode);
  };

  const handleAddExtraProperty = () => {
    if (!newExtraKey.trim() || !nodeData) return;
    onPropertyChange({
      ...nodeData,
      extra: { ...(nodeData.extra || {}), [newExtraKey.trim()]: newExtraValue },
    } as FmeaNode);
    setNewExtraKey("");
    setNewExtraValue("");
  };

  const extraFieldsConfig = getExtraFieldsConfig(nodeData.nodeType, apiResponseType);
  const dynamicExtraProperties = nodeData.extra
    ? Object.entries(nodeData.extra).filter(
        ([key]) => !extraFieldsConfig.find((field) => field.key === key)
      )
    : [];

  const parentStr = formatBigIntForEditor(nodeData.parentId);
  const parentDisplay = parentStr === "-1" ? "" : parentStr;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <span className="font-mono text-[11px] font-semibold uppercase text-primary">
          {nodeData.nodeType}
        </span>
        <p className="font-mono text-[11px] text-muted-foreground">
          {formatBigIntForEditor(nodeData.uuid)}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={nodeData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Parent ID</Label>
            <Input
              type="text"
              value={parentDisplay}
              onChange={(e) => {
                const v = e.target.value.trim();
                handleInputChange("parentId", v === "" ? BigInt(-1) : (v as any));
              }}
              disabled={disabled}
              className="font-mono text-xs"
            />
          </div>

          {extraFieldsConfig.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Extra fields</p>
              {extraFieldsConfig.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={String((nodeData.extra as any)?.[field.key] ?? "")}
                      onChange={(e) =>
                        handleInputChange(`extra.${field.key}`, e.target.value)
                      }
                      disabled={disabled}
                    />
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={String((nodeData.extra as any)?.[field.key] ?? "")}
                      onChange={(e) =>
                        handleInputChange(
                          `extra.${field.key}`,
                          field.type === "number"
                            ? Number(e.target.value)
                            : e.target.value
                        )
                      }
                      disabled={disabled}
                      className="font-mono text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {dynamicExtraProperties.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Other</p>
              {dynamicExtraProperties.map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{key}</Label>
                  <Input
                    value={String(value ?? "")}
                    onChange={(e) => handleInputChange(`extra.${key}`, e.target.value)}
                    disabled={disabled}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Add property</p>
            <Input
              placeholder="Key"
              value={newExtraKey}
              onChange={(e) => setNewExtraKey(e.target.value)}
              disabled={disabled}
            />
            <Input
              placeholder="Value"
              value={newExtraValue}
              onChange={(e) => setNewExtraValue(e.target.value)}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAddExtraProperty}
              disabled={disabled || !newExtraKey.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <Button
          type="button"
          className="w-full"
          onClick={onUpdateNode}
          disabled={disabled}
        >
          Apply changes
        </Button>
      </div>
    </div>
  );
}
