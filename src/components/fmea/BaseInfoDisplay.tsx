"use client";

import type { DfmeaBaseInfo, PfmeaBaseInfo } from "@/types/fmea";
import { FileBadge2 } from "lucide-react";

interface BaseInfoDisplayProps {
  baseInfo: DfmeaBaseInfo | PfmeaBaseInfo | null;
  compact?: boolean;
}

export function BaseInfoDisplay({ baseInfo, compact }: BaseInfoDisplayProps) {
  if (!baseInfo) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <FileBadge2 className="h-3.5 w-3.5 text-primary" />
          {baseInfo.name}
        </span>
        <span className="font-mono text-[11px]">{baseInfo.partNo}</span>
        <span className="hidden sm:inline">{baseInfo.partName}</span>
        <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wide">
          {baseInfo.evaluationCriteria}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <FileBadge2 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Base info
          </p>
          <h3 className="truncate text-sm font-semibold text-foreground">{baseInfo.name}</h3>
        </div>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Part No</dt>
          <dd className="font-mono text-xs text-foreground">{baseInfo.partNo}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Part</dt>
          <dd className="text-right text-foreground">{baseInfo.partName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Criteria</dt>
          <dd className="text-right text-foreground">{baseInfo.evaluationCriteria}</dd>
        </div>
      </dl>
    </div>
  );
}
