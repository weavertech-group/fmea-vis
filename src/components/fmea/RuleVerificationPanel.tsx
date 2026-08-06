"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { ApiResponseType, FmeaApiResponse } from "@/types/fmea";
import type { RuleGroup, RuleItemStatus } from "@/lib/fmea-rules";
import { runAllRules } from "@/lib/fmea-rules";
import { parseJsonWithBigInt } from "@/lib/bigint-utils";
import { extractUuidsFromText } from "@/lib/fmea-model";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RuleVerificationPanelProps {
  fmeaJson: string;
  fmeaType: ApiResponseType | null;
  disabled?: boolean;
  precomputed?: RuleGroup[] | null;
  onFocusUuid?: (uuid: string) => void;
}

const statusStyle: Record<RuleItemStatus, string> = {
  success: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-slate-100 text-slate-600",
};

export function RuleVerificationPanel({
  fmeaJson,
  fmeaType,
  precomputed,
  onFocusUuid,
}: RuleVerificationPanelProps) {
  const [resultGroups, setResultGroups] = useState<RuleGroup[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "error" | "warning" | "success">(
    "all"
  );

  useEffect(() => {
    if (precomputed) {
      setResultGroups(precomputed);
      setParseError(null);
      return;
    }
    if (!fmeaJson || !fmeaType) {
      setResultGroups([]);
      setParseError(null);
      return;
    }
    try {
      const parsedData = parseJsonWithBigInt(fmeaJson) as FmeaApiResponse;
      setParseError(null);
      setResultGroups(runAllRules(parsedData, fmeaType));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "JSON parse failed");
      setResultGroups([]);
    }
  }, [fmeaJson, fmeaType, precomputed]);

  const totalRules = useMemo(
    () => resultGroups.reduce((acc, group) => acc + group.rules.length, 0),
    [resultGroups]
  );
  const totalSummary = useMemo(
    () =>
      resultGroups.reduce(
        (acc, group) => {
          acc.error += group.summary.error || 0;
          acc.warning += group.summary.warning || 0;
          acc.success += group.summary.success || 0;
          return acc;
        },
        { error: 0, warning: 0, success: 0 }
      ),
    [resultGroups]
  );

  const filteredGroups = useMemo(() => {
    if (parseError) return [];
    if (filterStatus === "all") return resultGroups;
    return resultGroups
      .map((group) => ({
        ...group,
        rules: group.rules.filter((rule) => rule.status === filterStatus),
      }))
      .filter((group) => group.rules.length > 0);
  }, [resultGroups, filterStatus, parseError]);

  if (!fmeaJson) return null;

  return (
    <div className="panel">
      <div className="panel-head flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Structure verification</h2>
          <p className="text-xs text-muted-foreground">
            {totalRules} rules · methodology / agent constraints
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "All", totalRules],
              ["error", "Errors", totalSummary.error],
              ["warning", "Warnings", totalSummary.warning],
              ["success", "Passed", totalSummary.success],
            ] as const
          ).map(([key, label, count]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filterStatus === key ? "default" : "outline"}
              disabled={key !== "all" && count === 0}
              onClick={() => setFilterStatus(key)}
            >
              {label} ({count})
            </Button>
          ))}
        </div>
      </div>

      <div className="panel-body space-y-2">
        {parseError ? (
          <div className="rounded-md border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
            JSON parse error: {parseError}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No rules match this filter.
          </div>
        ) : (
          filteredGroups.map((group) => (
            <details
              key={group.groupTitle}
              open={
                group.overallStatus === "error" || group.overallStatus === "warning"
              }
              className="rounded-lg border border-border"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    group.overallStatus === "error"
                      ? "bg-red-500"
                      : group.overallStatus === "warning"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{group.groupTitle}</span>
                <span className="text-xs text-muted-foreground">
                  E{group.summary.error || 0} · W{group.summary.warning || 0} · OK
                  {group.summary.success || 0}
                </span>
              </summary>
              <ul className="border-t border-border bg-muted/20">
                {group.rules.map((rule) => {
                  if (rule.status === "info") return null;
                  const uuids = extractUuidsFromText(rule.details || "");
                  return (
                    <li
                      key={rule.id}
                      className="border-b border-border/60 px-3 py-2.5 text-sm last:border-0"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {rule.id}
                        </code>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px]", statusStyle[rule.status])}
                        >
                          {rule.status}
                        </Badge>
                        {uuids.length > 0 && onFocusUuid && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onFocusUuid(uuids[0])}
                          >
                            Focus
                          </Button>
                        )}
                      </div>
                      <p className="mt-1">{rule.description}</p>
                      {rule.details && (
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {rule.details}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
