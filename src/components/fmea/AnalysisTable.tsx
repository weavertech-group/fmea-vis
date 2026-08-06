"use client";

import type { AnalysisRow } from "@/lib/fmea-model";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AnalysisTableProps {
  rows: AnalysisRow[];
  selectedId: string | null;
  onSelectFailure: (failureId: string) => void;
}

export function AnalysisTable({ rows, selectedId, onSelectFailure }: AnalysisTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-sm font-medium">No failure / mode chains</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Lists failure (DFMEA) or mode (PFMEA) rows with S / O / D / RPN when present.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border bg-card px-3 py-2">
        <p className="text-sm font-semibold">
          Analysis table · {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {[
                "Structure",
                "Function",
                "Cha",
                "Failure",
                "Action",
                "S",
                "O",
                "D",
                "RPN",
              ].map((h) => (
                <TableHead
                  key={h}
                  className={cn(
                    "h-9 text-xs",
                    ["S", "O", "D", "RPN"].includes(h) && "w-12 text-center"
                  )}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const active =
                selectedId === row.failureId || selectedId === row.actionId;
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer text-sm",
                    active && "bg-primary/10"
                  )}
                  onClick={() => onSelectFailure(row.failureId)}
                >
                  <TableCell className="max-w-[120px] truncate py-2">
                    {row.structurePath}
                  </TableCell>
                  <TableCell className="max-w-[100px] truncate py-2">{row.func}</TableCell>
                  <TableCell className="max-w-[80px] truncate py-2">{row.cha}</TableCell>
                  <TableCell className="max-w-[120px] py-2 font-medium">
                    {row.failure}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate py-2">
                    {row.action}
                  </TableCell>
                  <TableCell className="py-2 text-center font-mono text-xs">
                    <Score value={row.severity} high={8} />
                  </TableCell>
                  <TableCell className="py-2 text-center font-mono text-xs">
                    <Score value={row.occurrence} high={6} />
                  </TableCell>
                  <TableCell className="py-2 text-center font-mono text-xs">
                    <Score value={row.detection} high={7} />
                  </TableCell>
                  <TableCell className="py-2 text-center font-mono text-xs font-semibold">
                    <Score value={row.rpn} high={100} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Score({ value, high }: { value: number | null; high: number }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const hot = value >= high;
  return (
    <span className={cn(hot && "font-semibold text-destructive")}>{value}</span>
  );
}
