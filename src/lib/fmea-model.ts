import type {
  ApiResponseType,
  FmeaApiResponse,
  FmeaNode,
  BaseApiNode,
  DfmeaBaseInfo,
  PfmeaBaseInfo,
  NetworkLink,
  InterfaceLink,
  CustomNodeData,
} from "@/types/fmea";
import type { Node as RFNode, Edge as RFEdge } from "reactflow";
import { Position, MarkerType } from "reactflow";
import Dagre from "@dagrejs/dagre";
import { parseJsonWithBigInt, idKey, stringifyWithBigInt } from "@/lib/bigint-utils";
import { runAllRules, type RuleGroup } from "@/lib/fmea-rules";

export type WorkbenchTab =
  | "overview"
  | "main"
  | "outline"
  | "table"
  | "feature"
  | "failure"
  | "interface"
  | "verification";

export interface ParsedDocument {
  rawJson: string;
  type: ApiResponseType;
  data: FmeaApiResponse;
  nodes: FmeaNode[];
  baseInfo: DfmeaBaseInfo | PfmeaBaseInfo | null;
  featureNet: NetworkLink[];
  failureNet: NetworkLink[];
  interfaces: InterfaceLink[];
}

export interface TreeNode {
  id: string;
  node: FmeaNode;
  children: TreeNode[];
  depth: number;
}

export interface AnalysisRow {
  id: string;
  structurePath: string;
  func: string;
  cha: string;
  failure: string;
  action: string;
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
  rpn: number | null;
  failureId: string;
  actionId: string | null;
}

export interface DocumentAnalytics {
  nodeCount: number;
  edgeParentCount: number;
  typeCounts: Record<string, number>;
  featureNetCount: number;
  failureNetCount: number;
  interfaceCount: number;
  ruleSummary: { error: number; warning: number; success: number; total: number };
  healthScore: number; // 0–100
  maxSeverity: number | null;
  highSeverityCount: number;
  avgRpn: number | null;
  ruleGroups: RuleGroup[];
}

const NODE_W = 256;
const NODE_H = 110;

export function parseDocument(json: string, type: ApiResponseType): ParsedDocument {
  const data = parseJsonWithBigInt(json) as FmeaApiResponse;
  if (!data || !Array.isArray((data as any).nodes)) {
    throw new Error("Invalid FMEA payload: missing nodes array");
  }
  const nodes = (data.nodes || []) as FmeaNode[];
  return {
    rawJson: json,
    type,
    data,
    nodes,
    baseInfo: (data as any).baseInfo ?? null,
    featureNet: ((data as any).featureNet || []).map((l: any) => ({
      ...l,
      from: l.from,
      to: l.to,
    })),
    failureNet: ((data as any).failureNet || []).map((l: any) => ({
      ...l,
      from: l.from,
      to: l.to,
    })),
    interfaces: ((data as any).interface || []) as InterfaceLink[],
  };
}

export function serializeDocument(doc: ParsedDocument): string {
  const payload: any = {
    ...doc.data,
    nodes: doc.nodes,
  };
  if (doc.baseInfo) payload.baseInfo = doc.baseInfo;
  if (doc.featureNet?.length) payload.featureNet = doc.featureNet;
  if (doc.failureNet?.length) payload.failureNet = doc.failureNet;
  if (doc.interfaces?.length) payload.interface = doc.interfaces;
  return stringifyWithBigInt(payload);
}

export function buildTree(nodes: FmeaNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  nodes.forEach((n) => {
    byId.set(idKey(n.uuid), { id: idKey(n.uuid), node: n, children: [], depth: 0 });
  });
  const roots: TreeNode[] = [];
  byId.forEach((tn) => {
    const pid = idKey(tn.node.parentId);
    if (pid === "-1" || !byId.has(pid)) {
      roots.push(tn);
    } else {
      byId.get(pid)!.children.push(tn);
    }
  });
  const assignDepth = (t: TreeNode, d: number) => {
    t.depth = d;
    t.children.forEach((c) => assignDepth(c, d + 1));
  };
  roots.forEach((r) => assignDepth(r, 0));
  // stable sort by description
  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.node.description.localeCompare(b.node.description));
    list.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

function layoutGraph(
  nodes: RFNode<CustomNodeData>[],
  edges: RFEdge[],
  direction: "LR" | "TB" = "LR"
) {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 56, ranksep: 88 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  Dagre.layout(g);
  return {
    nodes: nodes.map((node) => {
      const p = g.node(node.id);
      return {
        ...node,
        targetPosition: direction === "LR" ? Position.Left : Position.Top,
        sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
        position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
      };
    }),
    edges: [...edges],
  };
}

function toRfNodes(nodes: FmeaNode[]): RFNode<CustomNodeData>[] {
  return nodes.map((node) => ({
    id: idKey(node.uuid),
    type: "custom",
    data: {
      label: node.description,
      type: node.nodeType,
      originalApiNode: {
        ...node,
        uuid: idKey(node.uuid) as any,
        parentId: idKey(node.parentId) as any,
      },
    },
    position: { x: 0, y: 0 },
  }));
}

export function buildMainGraph(nodes: FmeaNode[]) {
  const rfNodes = toRfNodes(nodes);
  const edges: RFEdge[] = nodes
    .filter(
      (n) =>
        idKey(n.parentId) !== "-1" &&
        idKey(n.parentId) !== idKey(n.uuid) &&
        nodes.some((x) => idKey(x.uuid) === idKey(n.parentId))
    )
    .map((n) => ({
      id: `e_parent_${idKey(n.parentId)}_${idKey(n.uuid)}`,
      source: idKey(n.parentId),
      target: idKey(n.uuid),
      type: "smoothstep",
      style: { stroke: "#808080", strokeWidth: 1.5 },
    }));
  return layoutGraph(rfNodes, edges);
}

export function buildNetGraph(nodes: FmeaNode[], links: NetworkLink[], kind: "feature" | "failure") {
  const edges: RFEdge[] = links
    .filter(
      (l) =>
        nodes.some((n) => idKey(n.uuid) === idKey(l.from)) &&
        nodes.some((n) => idKey(n.uuid) === idKey(l.to))
    )
    .map((l) => ({
      id: `e_${kind}_${idKey(l.from)}_${idKey(l.to)}_${l.type}`,
      source: idKey(l.from),
      target: idKey(l.to),
      label: kind === "feature" ? `F(${l.type})` : `X(${l.type})`,
      type: "smoothstep",
      style: {
        stroke: kind === "feature" ? "#00aa44" : "#cc0000",
        strokeWidth: 2,
      },
      labelStyle: { fill: "#c0c0c0", fontSize: 10 },
    }));
  const ids = new Set<string>();
  edges.forEach((e) => {
    ids.add(e.source);
    ids.add(e.target);
  });
  const subset = nodes.filter((n) => ids.has(idKey(n.uuid)));
  if (!subset.length) return { nodes: [] as RFNode<CustomNodeData>[], edges: [] as RFEdge[] };
  return layoutGraph(toRfNodes(subset), edges);
}

export function buildInterfaceGraph(nodes: FmeaNode[], links: InterfaceLink[]) {
  const edges: RFEdge[] = links
    .filter(
      (l) =>
        nodes.some((n) => idKey(n.uuid) === idKey(l.startId)) &&
        nodes.some((n) => idKey(n.uuid) === idKey(l.endId))
    )
    .map((l) => {
      const color = l.effect === 0 ? "#4ade80" : "#ef4444";
      return {
        id: `e_interface_${idKey(l.structureId)}_${idKey(l.startId)}_${idKey(l.endId)}_${l.type}_${l.interaction}`,
        source: idKey(l.startId),
        target: idKey(l.endId),
        label: l.description,
        type: "smoothstep",
        style: {
          stroke: color,
          strokeWidth: 2.5,
          strokeDasharray: l.interaction === 1 ? "8,4" : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
        ...(l.interaction === 1 && {
          markerStart: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
        }),
      };
    });
  const ids = new Set<string>();
  edges.forEach((e) => {
    ids.add(e.source);
    ids.add(e.target);
  });
  const subset = nodes.filter((n) => ids.has(idKey(n.uuid)));
  if (!subset.length) return { nodes: [] as RFNode<CustomNodeData>[], edges: [] as RFEdge[] };
  return layoutGraph(toRfNodes(subset), edges);
}

function findPath(nodes: FmeaNode[], id: string): FmeaNode[] {
  const map = new Map(nodes.map((n) => [idKey(n.uuid), n]));
  const path: FmeaNode[] = [];
  let cur = map.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(idKey(cur.uuid))) {
    path.unshift(cur);
    seen.add(idKey(cur.uuid));
    const pid = idKey(cur.parentId);
    if (pid === "-1") break;
    cur = map.get(pid);
  }
  return path;
}

/** Build DFMEA/PFMEA-style analysis rows from failure/mode chains. */
export function buildAnalysisRows(nodes: FmeaNode[], type: ApiResponseType): AnalysisRow[] {
  const map = new Map(nodes.map((n) => [idKey(n.uuid), n]));
  const rows: AnalysisRow[] = [];

  const failureTypes =
    type === "pfmea" ? new Set(["mode"]) : new Set(["failure"]);
  const failures = nodes.filter((n) => failureTypes.has(n.nodeType));

  failures.forEach((fail) => {
    const path = findPath(nodes, idKey(fail.uuid));
    const func = [...path].reverse().find((n) => n.nodeType === "func");
    const cha = [...path].reverse().find((n) => n.nodeType === "cha");
    const structure = path
      .filter((n) =>
        ["system", "subsystem", "component", "item", "step", "step2", "elem", "requirement"].includes(
          n.nodeType
        )
      )
      .map((n) => n.description)
      .join(" / ");

    const actions = nodes.filter(
      (n) => idKey(n.parentId) === idKey(fail.uuid) && n.nodeType === "action"
    );
    const sev =
      typeof (fail.extra as any)?.severity === "number"
        ? (fail.extra as any).severity
        : null;

    // PFMEA: effect/cause under mode
    let occurrence: number | null = null;
    let detection: number | null = null;
    if (type === "pfmea") {
      const causes = nodes.filter(
        (n) => idKey(n.parentId) === idKey(fail.uuid) && n.nodeType === "cause"
      );
      const effects = nodes.filter(
        (n) => idKey(n.parentId) === idKey(fail.uuid) && n.nodeType === "effect"
      );
      if (causes[0] && typeof (causes[0].extra as any)?.occurrence === "number") {
        occurrence = (causes[0].extra as any).occurrence;
      }
      if (effects[0] && typeof (effects[0].extra as any)?.severity === "number") {
        // use effect severity if failure has none
      }
      const effectSev =
        effects[0] && typeof (effects[0].extra as any)?.severity === "number"
          ? (effects[0].extra as any).severity
          : sev;
      const actionsUnderCause = causes.flatMap((c) =>
        nodes.filter((n) => idKey(n.parentId) === idKey(c.uuid) && n.nodeType === "action")
      );
      const actList = actionsUnderCause.length ? actionsUnderCause : actions;
      if (actList.length === 0) {
        rows.push({
          id: idKey(fail.uuid),
          structurePath: structure || "—",
          func: func?.description || "—",
          cha: cha?.description || "—",
          failure: fail.description,
          action: "—",
          severity: effectSev,
          occurrence,
          detection: null,
          rpn: null,
          failureId: idKey(fail.uuid),
          actionId: null,
        });
      } else {
        actList.forEach((a) => {
          const det =
            typeof (a.extra as any)?.detection === "number"
              ? (a.extra as any).detection
              : null;
          const occ =
            occurrence ??
            (typeof (a.extra as any)?.occurrence === "number"
              ? (a.extra as any).occurrence
              : null);
          const s = effectSev;
          const rpn =
            s != null && occ != null && det != null ? s * occ * det : null;
          rows.push({
            id: `${idKey(fail.uuid)}_${idKey(a.uuid)}`,
            structurePath: structure || "—",
            func: func?.description || "—",
            cha: cha?.description || "—",
            failure: fail.description,
            action: a.description,
            severity: s,
            occurrence: occ,
            detection: det,
            rpn,
            failureId: idKey(fail.uuid),
            actionId: idKey(a.uuid),
          });
        });
      }
      return;
    }

    // DFMEA
    if (actions.length === 0) {
      rows.push({
        id: idKey(fail.uuid),
        structurePath: structure || "—",
        func: func?.description || "—",
        cha: cha?.description || "—",
        failure: fail.description,
        action: "—",
        severity: sev,
        occurrence:
          typeof (fail.extra as any)?.occurrence === "number"
            ? (fail.extra as any).occurrence
            : null,
        detection: null,
        rpn: null,
        failureId: idKey(fail.uuid),
        actionId: null,
      });
    } else {
      actions.forEach((a) => {
        const occ =
          typeof (a.extra as any)?.occurrence === "number"
            ? (a.extra as any).occurrence
            : typeof (fail.extra as any)?.occurrence === "number"
              ? (fail.extra as any).occurrence
              : null;
        const det =
          typeof (a.extra as any)?.detection === "number"
            ? (a.extra as any).detection
            : null;
        const rpn = sev != null && occ != null && det != null ? sev * occ * det : null;
        rows.push({
          id: `${idKey(fail.uuid)}_${idKey(a.uuid)}`,
          structurePath: structure || "—",
          func: func?.description || "—",
          cha: cha?.description || "—",
          failure: fail.description,
          action: a.description,
          severity: sev,
          occurrence: occ,
          detection: det,
          rpn,
          failureId: idKey(fail.uuid),
          actionId: idKey(a.uuid),
        });
      });
    }
  });

  rows.sort((a, b) => (b.rpn ?? b.severity ?? 0) - (a.rpn ?? a.severity ?? 0));
  return rows;
}

export function computeAnalytics(doc: ParsedDocument): DocumentAnalytics {
  const typeCounts: Record<string, number> = {};
  doc.nodes.forEach((n) => {
    typeCounts[n.nodeType] = (typeCounts[n.nodeType] || 0) + 1;
  });
  const parentEdges = doc.nodes.filter(
    (n) => idKey(n.parentId) !== "-1" && doc.nodes.some((x) => idKey(x.uuid) === idKey(n.parentId))
  ).length;

  const ruleGroups = runAllRules(doc.data, doc.type);
  const ruleSummary = ruleGroups.reduce(
    (acc, g) => {
      acc.error += g.summary.error || 0;
      acc.warning += g.summary.warning || 0;
      acc.success += g.summary.success || 0;
      acc.total += g.rules.length;
      return acc;
    },
    { error: 0, warning: 0, success: 0, total: 0 }
  );

  // Health: start 100, -8 per error, -3 per warning (floor 0)
  const healthScore = Math.max(
    0,
    Math.min(100, 100 - ruleSummary.error * 8 - ruleSummary.warning * 3)
  );

  const rows = buildAnalysisRows(doc.nodes, doc.type);
  const severities = rows.map((r) => r.severity).filter((s): s is number => s != null);
  const maxSeverity = severities.length ? Math.max(...severities) : null;
  const highSeverityCount = severities.filter((s) => s >= 8).length;
  const rpns = rows.map((r) => r.rpn).filter((r): r is number => r != null);
  const avgRpn = rpns.length ? Math.round(rpns.reduce((a, b) => a + b, 0) / rpns.length) : null;

  return {
    nodeCount: doc.nodes.length,
    edgeParentCount: parentEdges,
    typeCounts,
    featureNetCount: doc.featureNet.length,
    failureNetCount: doc.failureNet.length,
    interfaceCount: doc.interfaces.length,
    ruleSummary,
    healthScore,
    maxSeverity,
    highSeverityCount,
    avgRpn,
    ruleGroups,
  };
}

export function updateNodeInDocument(doc: ParsedDocument, updated: FmeaNode): ParsedDocument {
  const nodes = doc.nodes.map((n) =>
    idKey(n.uuid) === idKey(updated.uuid) ? { ...updated } : n
  );
  const data = { ...doc.data, nodes } as FmeaApiResponse;
  const next = {
    ...doc,
    nodes,
    data,
  };
  next.rawJson = serializeDocument(next);
  return next;
}

export function extractUuidsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/\d{10,}/g) || [];
  return [...new Set(matches)];
}

const RECENTS_KEY = "fmea-workbench-recents";

export interface RecentSession {
  id: string;
  type: ApiResponseType;
  label: string;
  savedAt: number;
  json: string;
}

export function loadRecents(): RecentSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSession[];
  } catch {
    return [];
  }
}

export function pushRecent(session: Omit<RecentSession, "id" | "savedAt">) {
  if (typeof window === "undefined") return;
  const list = loadRecents().filter(
    (r) => !(r.type === session.type && r.label === session.label)
  );
  list.unshift({
    ...session,
    id: `${Date.now()}`,
    savedAt: Date.now(),
  });
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 8)));
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
