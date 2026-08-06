"use client";

import type { NodeProps } from "reactflow";
import type { CustomNodeData } from "@/types/fmea";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { formatBigIntForDisplay, isBigInt } from "@/lib/bigint-utils";

const TYPE_COLOR: Record<string, string> = {
  system: "#1e3a5f",
  subsystem: "#334155",
  component: "#475569",
  requirement: "#1e3a5f",
  func: "#166534",
  cha: "#854d0e",
  failure: "#b91c1c",
  mode: "#b91c1c",
  effect: "#9f1239",
  cause: "#a16207",
  action: "#0f766e",
  item: "#1e3a5f",
  step: "#1e40af",
  step2: "#1e40af",
  elem: "#475569",
  default: "#334155",
};

export function CustomGraphNode({
  data,
  selected,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: NodeProps<CustomNodeData>) {
  const { label, type, originalApiNode } = data;
  const accent = TYPE_COLOR[type] || TYPE_COLOR.default;

  const extraEntries =
    originalApiNode.extra && Object.keys(originalApiNode.extra).length > 0
      ? Object.entries(originalApiNode.extra).slice(0, 2)
      : null;

  return (
    <>
      <Handle
        type="target"
        position={targetPosition}
        className="!h-2 !w-2 !border-2 !border-white !bg-slate-400"
      />
      <div
        className={cn(
          "w-56 select-none rounded-lg border bg-white shadow-sm",
          selected
            ? "border-primary ring-2 ring-primary/20"
            : "border-slate-200"
        )}
        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {type}
          </span>
          <span className="ml-auto font-mono text-[9px] text-slate-400">
            {formatBigIntForDisplay(originalApiNode.uuid)}
          </span>
        </div>
        <div className="px-2.5 py-2">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800">
            {label}
          </p>
          {extraEntries && (
            <div className="mt-1.5 space-y-0.5 rounded-md bg-slate-50 px-1.5 py-1">
              {extraEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-2 font-mono text-[10px] text-slate-600"
                >
                  <span className="text-slate-400">{key}</span>
                  <span className="max-w-[55%] truncate font-medium">
                    {isBigInt(value)
                      ? formatBigIntForDisplay(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={sourcePosition}
        className="!h-2 !w-2 !border-2 !border-white !bg-slate-600"
      />
    </>
  );
}
