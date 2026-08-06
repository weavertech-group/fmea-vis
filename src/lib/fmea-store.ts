"use client";

import { create } from "zustand";
import type { ApiResponseType, FmeaNode, InterfaceLink } from "@/types/fmea";
import type { Node as RFNode, Edge as RFEdge } from "reactflow";
import type { CustomNodeData } from "@/types/fmea";
import {
  type ParsedDocument,
  type DocumentAnalytics,
  type WorkbenchTab,
  type AnalysisRow,
  type TreeNode,
  parseDocument,
  computeAnalytics,
  buildMainGraph,
  buildNetGraph,
  buildInterfaceGraph,
  buildTree,
  buildAnalysisRows,
  updateNodeInDocument,
  serializeDocument,
  pushRecent,
} from "@/lib/fmea-model";
import { TYPE_META } from "@/data/examples";
import { idKey } from "@/lib/bigint-utils";

interface Graphs {
  main: { nodes: RFNode<CustomNodeData>[]; edges: RFEdge[] };
  feature: { nodes: RFNode<CustomNodeData>[]; edges: RFEdge[] };
  failure: { nodes: RFNode<CustomNodeData>[]; edges: RFEdge[] };
  interface: { nodes: RFNode<CustomNodeData>[]; edges: RFEdge[] };
}

interface WorkbenchState {
  doc: ParsedDocument | null;
  analytics: DocumentAnalytics | null;
  graphs: Graphs | null;
  tree: TreeNode[];
  tableRows: AnalysisRow[];
  dirty: boolean;
  activeTab: WorkbenchTab;
  selectedNodeId: string | null;
  selectedInterface: InterfaceLink | null;
  focusNodeId: string | null;
  searchQuery: string;
  typeFilter: string | null;
  leftOpen: boolean;
  rightOpen: boolean;
  isLoading: boolean;
  error: string | null;
  fitToken: number;

  loadJson: (json: string, type: ApiResponseType) => void;
  reset: () => void;
  setTab: (tab: WorkbenchTab) => void;
  selectNode: (id: string | null) => void;
  selectInterface: (link: InterfaceLink | null) => void;
  focusNode: (id: string | null) => void;
  setSearch: (q: string) => void;
  setTypeFilter: (t: string | null) => void;
  setLeftOpen: (v: boolean) => void;
  setRightOpen: (v: boolean) => void;
  applyNodeEdit: (node: FmeaNode) => void;
  applyInterfaceEdit: (link: InterfaceLink) => void;
  setGraphNodes: (
    which: keyof Graphs,
    nodes: RFNode<CustomNodeData>[]
  ) => void;
  setGraphEdges: (which: keyof Graphs, edges: RFEdge[]) => void;
  relayoutActive: () => void;
  getSelectedNode: () => FmeaNode | null;
  getExportJson: () => string | null;
}

const emptyGraphs = (): Graphs => ({
  main: { nodes: [], edges: [] },
  feature: { nodes: [], edges: [] },
  failure: { nodes: [], edges: [] },
  interface: { nodes: [], edges: [] },
});

function rebuild(doc: ParsedDocument) {
  return {
    analytics: computeAnalytics(doc),
    graphs: {
      main: buildMainGraph(doc.nodes),
      feature: buildNetGraph(doc.nodes, doc.featureNet, "feature"),
      failure: buildNetGraph(doc.nodes, doc.failureNet, "failure"),
      interface: buildInterfaceGraph(doc.nodes, doc.interfaces),
    } as Graphs,
    tree: buildTree(doc.nodes),
    tableRows: buildAnalysisRows(doc.nodes, doc.type),
  };
}

export const useWorkbench = create<WorkbenchState>((set, get) => ({
  doc: null,
  analytics: null,
  graphs: null,
  tree: [],
  tableRows: [],
  dirty: false,
  activeTab: "main",
  selectedNodeId: null,
  selectedInterface: null,
  focusNodeId: null,
  searchQuery: "",
  typeFilter: null,
  leftOpen: false,
  rightOpen: false,


  isLoading: false,
  error: null,
  fitToken: 0,

  loadJson: (json, type) => {
    set({ isLoading: true, error: null });
    try {
      const doc = parseDocument(json, type);
      const built = rebuild(doc);
      const label =
        doc.baseInfo?.name ||
        `${TYPE_META[type].label} · ${doc.nodes.length} nodes`;
      pushRecent({ type, label, json: doc.rawJson });
      set({
        doc,
        ...built,
        dirty: false,
        isLoading: false,
        activeTab: "overview",
        selectedNodeId: null,
        selectedInterface: null,
        focusNodeId: null,
        leftOpen: false,
        rightOpen: false,

        searchQuery: "",
        typeFilter: null,
        fitToken: Date.now(),
      });
    } catch (e: any) {
      set({
        isLoading: false,
        error: e?.message || "Failed to parse FMEA JSON",
        doc: null,
        analytics: null,
        graphs: null,
      });
      throw e;
    }
  },

  reset: () =>
    set({
      doc: null,
      analytics: null,
      graphs: emptyGraphs(),
      tree: [],
      tableRows: [],
      dirty: false,
      activeTab: "main",
      selectedNodeId: null,
      selectedInterface: null,
      focusNodeId: null,
      searchQuery: "",
      typeFilter: null,
      leftOpen: false,
      rightOpen: false,
      error: null,
      isLoading: false,
    }),

  setTab: (tab) =>
    set({
      activeTab: tab,
      fitToken: Date.now(),
      selectedInterface: tab === "interface" ? get().selectedInterface : null,
    }),

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      selectedInterface: null,
      focusNodeId: id,
      rightOpen: id ? true : get().rightOpen,
    }),

  selectInterface: (link) =>
    set({
      selectedInterface: link,
      selectedNodeId: null,
      rightOpen: link ? true : get().rightOpen,
    }),

  focusNode: (id) =>
    set({
      focusNodeId: id,
      selectedNodeId: id,
      rightOpen: true,
      activeTab:
        get().activeTab === "verification" || get().activeTab === "overview"
          ? "main"
          : get().activeTab,
      fitToken: Date.now(),
    }),

  setSearch: (q) => set({ searchQuery: q }),
  setTypeFilter: (t) => set({ typeFilter: t }),
  setLeftOpen: (v) => set({ leftOpen: v }),
  setRightOpen: (v) => set({ rightOpen: v }),

  applyNodeEdit: (node) => {
    const doc = get().doc;
    if (!doc) return;
    const next = updateNodeInDocument(doc, node);
    const built = rebuild(next);
    set({
      doc: next,
      ...built,
      dirty: true,
      selectedNodeId: idKey(node.uuid),
      fitToken: Date.now(),
    });
  },

  applyInterfaceEdit: (link) => {
    const doc = get().doc;
    if (!doc) return;
    const interfaces = doc.interfaces.map((l) =>
      idKey(l.structureId) === idKey(link.structureId) &&
      idKey(l.startId) === idKey(link.startId) &&
      idKey(l.endId) === idKey(link.endId) &&
      l.type === link.type &&
      l.interaction === link.interaction
        ? link
        : l
    );
    const next: ParsedDocument = {
      ...doc,
      interfaces,
      data: { ...doc.data, interface: interfaces } as any,
    };
    next.rawJson = serializeDocument(next);
    const built = rebuild(next);
    set({
      doc: next,
      ...built,
      dirty: true,
      selectedInterface: link,
      fitToken: Date.now(),
    });
  },

  setGraphNodes: (which, nodes) => {
    const graphs = get().graphs;
    if (!graphs) return;
    set({ graphs: { ...graphs, [which]: { ...graphs[which], nodes } } });
  },

  setGraphEdges: (which, edges) => {
    const graphs = get().graphs;
    if (!graphs) return;
    set({ graphs: { ...graphs, [which]: { ...graphs[which], edges } } });
  },

  relayoutActive: () => {
    const { doc, activeTab } = get();
    if (!doc) return;
    const built = rebuild(doc);
    set({ ...built, fitToken: Date.now() });
    void activeTab;
  },

  getSelectedNode: () => {
    const { doc, selectedNodeId } = get();
    if (!doc || !selectedNodeId) return null;
    return doc.nodes.find((n) => idKey(n.uuid) === selectedNodeId) || null;
  },

  getExportJson: () => {
    const doc = get().doc;
    if (!doc) return null;
    return serializeDocument(doc);
  },
}));
