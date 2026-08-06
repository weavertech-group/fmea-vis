"use client";

import type { DocumentAnalytics, ParsedDocument } from "@/lib/fmea-model";
import { TYPE_META } from "@/data/examples";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OverviewPanelProps {
  doc: ParsedDocument;
  analytics: DocumentAnalytics;
  onOpenRules: () => void;
  onOpenTable: () => void;
  onFilterType: (type: string | null) => void;
}

export function OverviewPanel({
  doc,
  analytics,
  onOpenRules,
  onOpenTable,
  onFilterType,
}: OverviewPanelProps) {
  const chartData = Object.entries(analytics.typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const meta = TYPE_META[doc.type];
  const score = analytics.healthScore;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="panel">
          <div className="panel-body flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">Overview</p>
              <h2 className="mt-0.5 truncate text-lg font-semibold">
                {doc.baseInfo?.name || meta.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {meta.label}
                {doc.baseInfo?.partNo ? ` · ${doc.baseInfo.partNo}` : ""}
                {doc.baseInfo?.evaluationCriteria
                  ? ` · ${doc.baseInfo.evaluationCriteria}`
                  : ""}
              </p>
            </div>
            <div className="rounded-lg bg-muted px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Health</p>
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  score >= 80
                    ? "text-emerald-700"
                    : score >= 50
                      ? "text-amber-700"
                      : "text-destructive"
                )}
              >
                {score}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Nodes" value={analytics.nodeCount} sub={`${analytics.edgeParentCount} edges`} />
          <Kpi
            label="Feature net"
            value={analytics.featureNetCount}
            sub={`${analytics.failureNetCount} failure links`}
          />
          <Kpi label="Interfaces" value={analytics.interfaceCount} sub="component links" />
          <button
            type="button"
            onClick={onOpenRules}
            className="panel p-3 text-left transition-colors hover:bg-muted/40"
          >
            <p className="section-label">Rules</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
              <span className="text-destructive">{analytics.ruleSummary.error}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-amber-700">{analytics.ruleSummary.warning}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              errors / warnings · {analytics.ruleSummary.total} rules
            </p>
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="panel lg:col-span-3">
            <div className="panel-head">
              <h3 className="flex-1 text-sm font-semibold">Node types</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFilterType(null)}
              >
                Clear filter
              </Button>
            </div>
            <div className="panel-body">
              <div className="h-48 rounded-md border border-border bg-background p-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="type"
                      width={72}
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer">
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill="hsl(222 47% 36%)"
                          onClick={() => onFilterType(entry.type)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Click a bar to filter Outline by type.
              </p>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="panel">
              <div className="panel-head">
                <h3 className="text-sm font-semibold">Risk</h3>
              </div>
              <div className="panel-body space-y-2 text-sm">
                <Row label="Max severity" value={analytics.maxSeverity ?? "—"} />
                <Row label="S ≥ 8" value={analytics.highSeverityCount} />
                <Row label="Avg RPN" value={analytics.avgRpn ?? "—"} />
                <Button type="button" variant="outline" className="mt-2 w-full" onClick={onOpenTable}>
                  Open analysis table
                </Button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <h3 className="text-sm font-semibold">Coverage</h3>
              </div>
              <div className="panel-body space-y-2 text-sm">
                <Cov ok={analytics.featureNetCount > 0} label="Feature net" />
                <Cov ok={analytics.failureNetCount > 0} label="Failure net" />
                <Cov
                  ok={analytics.interfaceCount > 0 || doc.type !== "dfmea"}
                  label={doc.type === "dfmea" ? "Interfaces" : "Interfaces N/A"}
                />
                <Cov
                  ok={
                    (analytics.typeCounts.failure || analytics.typeCounts.mode || 0) > 0
                  }
                  label="Failure / mode nodes"
                />
              </div>
            </div>
          </div>
        </div>

        {analytics.ruleSummary.error > 0 && (
          <div className="panel border-l-4 border-l-destructive">
            <div className="panel-body">
              <p className="text-sm font-semibold text-destructive">
                {analytics.ruleSummary.error} rule error(s)
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open Rules to inspect findings and jump to related nodes.
              </p>
              <Button type="button" variant="link" className="mt-1 h-auto p-0" onClick={onOpenRules}>
                Review rules
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="panel p-3">
      <p className="section-label">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/70 pb-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}

function Cov({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          ok ? "bg-emerald-500" : "bg-muted-foreground/30"
        )}
      />
      <span className={ok ? "font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
