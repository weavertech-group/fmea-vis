"use client";

import { useMemo, useState } from "react";
import type { TreeNode } from "@/lib/fmea-model";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { idKey } from "@/lib/bigint-utils";

interface OutlineTreeProps {
  tree: TreeNode[];
  selectedId: string | null;
  searchQuery: string;
  typeFilter: string | null;
  onSelect: (id: string) => void;
  onSearchChange: (q: string) => void;
  onClearTypeFilter?: () => void;
}

export function OutlineTree({
  tree,
  selectedId,
  searchQuery,
  typeFilter,
  onSelect,
  onSearchChange,
  onClearTypeFilter,
}: OutlineTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const q = searchQuery.trim().toLowerCase();

  const matches = (tn: TreeNode): boolean => {
    const selfMatch =
      (!typeFilter || tn.node.nodeType === typeFilter) &&
      (!q ||
        tn.node.description.toLowerCase().includes(q) ||
        tn.node.nodeType.toLowerCase().includes(q) ||
        idKey(tn.node.uuid).includes(q));
    if (selfMatch) return true;
    return tn.children.some(matches);
  };

  const visibleRoots = useMemo(() => tree.filter(matches), [tree, q, typeFilter]);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (tn: TreeNode) => {
    if (!matches(tn)) return null;
    const hasChildren = tn.children.length > 0;
    const isCollapsed = collapsed.has(tn.id);
    const isSelected = selectedId === tn.id;
    const typeHit = !typeFilter || tn.node.nodeType === typeFilter;

    return (
      <div key={tn.id}>
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-md py-0.5 pr-1 text-sm",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted",
            !typeHit && !isSelected && "opacity-50"
          )}
          style={{ paddingLeft: 4 + tn.depth * 12 }}
        >
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center"
            onClick={() => hasChildren && toggle(tn.id)}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {hasChildren ? (
              isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )
            ) : (
              <span className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            onClick={() => onSelect(tn.id)}
          >
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] font-semibold uppercase",
                isSelected ? "text-primary-foreground/80" : "text-primary"
              )}
            >
              {tn.node.nodeType}
            </span>
            <span className="truncate">{tn.node.description}</span>
          </button>
        </div>
        {hasChildren && !isCollapsed && tn.children.map(renderNode)}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border bg-card px-3 py-2">
        <p className="text-sm font-semibold">Outline</p>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        {typeFilter && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mt-1 h-auto px-0"
            onClick={() => onClearTypeFilter?.()}
          >
            type: {typeFilter} <X className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {visibleRoots.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            No nodes match.
          </p>
        ) : (
          visibleRoots.map(renderNode)
        )}
      </div>
    </div>
  );
}
