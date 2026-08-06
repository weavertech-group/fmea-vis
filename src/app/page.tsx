"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  OnNodesChange,
  OnEdgesChange,
  Node as RFNode,
  Edge as RFEdge,
} from "reactflow";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import type {
  ApiResponseType,
  CustomNodeData,
  FmeaNode,
  InterfaceLink,
} from "@/types/fmea";
import { DataInputPanel, TypeLaunchCards } from "@/components/fmea/DataInputPanel";
import { GraphViewerWrapper } from "@/components/fmea/GraphViewer";
import { UnifiedPropertiesEditor } from "@/components/fmea/UnifiedPropertiesEditor";
import { InterfaceViewer } from "@/components/fmea/InterfaceViewer";
import { RuleVerificationPanel } from "@/components/fmea/RuleVerificationPanel";
import { OverviewPanel } from "@/components/fmea/OverviewPanel";
import { OutlineTree } from "@/components/fmea/OutlineTree";
import { AnalysisTable } from "@/components/fmea/AnalysisTable";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Network,
  AlertTriangle,
  ListTree,
  Share2,
  ShieldCheck,
  GitBranch,
  LayoutDashboard,
  Table2,
  Search,
  History,
  PanelLeft,
  PanelRight,
  Copy,
  Download,
  Layout,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE_META } from "@/data/examples";
import { useWorkbench } from "@/lib/fmea-store";
import {
  downloadText,
  loadRecents,
  type RecentSession,
  type WorkbenchTab,
} from "@/lib/fmea-model";
import { idKey } from "@/lib/bigint-utils";

const INSPECTOR_TABS = new Set([
  "main",
  "outline",
  "table",
  "feature",
  "failure",
  "interface",
]);

export default function FmeaWorkbenchPage() {
  const { toast } = useToast();
  const wb = useWorkbench();
  const [recents, setRecents] = useState<RecentSession[]>([]);
  const [draftNode, setDraftNode] = useState<FmeaNode | null>(null);
  const [draftInterface, setDraftInterface] = useState<InterfaceLink | null>(null);

  useEffect(() => {
    setRecents(loadRecents());
  }, [wb.doc]);

  useEffect(() => {
    setDraftNode(wb.getSelectedNode());
    setDraftInterface(wb.selectedInterface);
  }, [wb.selectedNodeId, wb.selectedInterface, wb.doc, wb]);

  const handleLoad = useCallback(
    (json: string, type: ApiResponseType) => {
      try {
        wb.loadJson(json, type);
        setRecents(loadRecents());
        toast({
          title: "Document loaded",
          description: `${TYPE_META[type].label} ready.`,
        });
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Parse failed",
          description: e?.message || "Invalid JSON",
        });
      }
    },
    [wb, toast]
  );

  const handleExport = () => {
    const json = wb.getExportJson();
    if (!json || !wb.doc) return;
    const name = `fmea-${wb.doc.type}-${Date.now()}.json`;
    downloadText(name, json);
    toast({ title: "Exported", description: name });
  };

  const handleCopy = async () => {
    const json = wb.getExportJson();
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      toast({ title: "Copied", description: "JSON on clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (!wb.graphs) return;
      const map: Record<string, keyof NonNullable<typeof wb.graphs>> = {
        main: "main",
        feature: "feature",
        failure: "failure",
        interface: "interface",
      };
      const key = map[wb.activeTab];
      if (!key) return;
      wb.setGraphNodes(key, applyNodeChanges(changes, wb.graphs[key].nodes));
    },
    [wb]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (!wb.graphs) return;
      const map: Record<string, keyof NonNullable<typeof wb.graphs>> = {
        main: "main",
        feature: "feature",
        failure: "failure",
        interface: "interface",
      };
      const key = map[wb.activeTab];
      if (!key) return;
      wb.setGraphEdges(key, applyEdgeChanges(changes, wb.graphs[key].edges));
    },
    [wb]
  );

  const handleNodeClick = useCallback(
    (_e: React.MouseEvent, node: RFNode<CustomNodeData>) => {
      wb.selectNode(node.id);
      wb.setRightOpen(true);
    },
    [wb]
  );

  const handleEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: RFEdge) => {
      if (wb.activeTab !== "interface" || !edge.id.includes("interface_") || !wb.doc)
        return;
      const parts = edge.id.split("_");
      if (parts.length < 7) return;
      const structureId = parts[2];
      const startId = parts[3];
      const endId = parts[4];
      const type = parseInt(parts[5], 10);
      const interaction = parseInt(parts[6], 10);
      const link = wb.doc.interfaces.find(
        (l) =>
          idKey(l.structureId) === structureId &&
          idKey(l.startId) === startId &&
          idKey(l.endId) === endId &&
          l.type === type &&
          l.interaction === interaction
      );
      if (link) {
        wb.selectInterface(link);
        wb.setRightOpen(true);
      }
    },
    [wb]
  );

  const graphNodes = useMemo(() => {
    if (!wb.graphs) return [];
    const g =
      wb.activeTab === "feature"
        ? wb.graphs.feature
        : wb.activeTab === "failure"
          ? wb.graphs.failure
          : wb.activeTab === "interface"
            ? wb.graphs.interface
            : wb.graphs.main;
    let nodes = g.nodes;
    if (wb.typeFilter) {
      nodes = nodes.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: n.data.type === wb.typeFilter ? 1 : 0.28,
        },
      }));
    }
    if (wb.focusNodeId) {
      nodes = nodes.map((n) => ({
        ...n,
        selected: n.id === wb.focusNodeId,
      }));
    }
    if (wb.searchQuery.trim()) {
      const q = wb.searchQuery.trim().toLowerCase();
      nodes = nodes.map((n) => {
        const hit =
          n.data.label.toLowerCase().includes(q) ||
          n.data.type.toLowerCase().includes(q) ||
          n.id.includes(q);
        return { ...n, style: { ...n.style, opacity: hit ? 1 : 0.22 } };
      });
    }
    return nodes;
  }, [wb.graphs, wb.activeTab, wb.typeFilter, wb.focusNodeId, wb.searchQuery]);

  const graphEdges = useMemo(() => {
    if (!wb.graphs) return [];
    if (wb.activeTab === "feature") return wb.graphs.feature.edges;
    if (wb.activeTab === "failure") return wb.graphs.failure.edges;
    if (wb.activeTab === "interface") return wb.graphs.interface.edges;
    return wb.graphs.main.edges;
  }, [wb.graphs, wb.activeTab]);

  if (!wb.doc) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12 sm:px-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">FMEA Workbench</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Review FMEA Agent structure output for Requirements, DFMEA, and PFMEA.
              Inspect graphs, run methodology rules, edit nodes, and export a patched
              structure for the next agent pass.
            </p>
          </header>

          <section className="panel">
            <div className="panel-head">
              <h2 className="text-sm font-semibold">Load sample</h2>
            </div>
            <div className="panel-body">
              <TypeLaunchCards onLaunch={handleLoad} disabled={wb.isLoading} />
            </div>
          </section>

          {recents.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Recent</h2>
              </div>
              <div className="panel-body flex flex-wrap gap-2">
                {recents.slice(0, 6).map((r) => (
                  <Button
                    key={r.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoad(r.json, r.type)}
                    className="max-w-full"
                  >
                    <Badge variant="secondary" className="mr-1 font-mono text-[10px]">
                      {TYPE_META[r.type].short}
                    </Badge>
                    <span className="max-w-[12rem] truncate">{r.label}</span>
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <h2 className="text-sm font-semibold">Paste or fetch JSON</h2>
            </div>
            <div className="panel-body">
              <DataInputPanel
                onJsonSubmit={handleLoad}
                disabled={wb.isLoading}
                hideHeader
              />
            </div>
          </section>
        </main>
      </div>
    );
  }

  const doc = wb.doc;
  const analytics = wb.analytics!;
  const hasSelection = !!(wb.selectedNodeId || wb.selectedInterface);
  const showInspector =
    wb.rightOpen && INSPECTOR_TABS.has(wb.activeTab) && hasSelection;
  const title = doc.baseInfo?.name || TYPE_META[doc.type].label;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
            <Badge variant="secondary">{TYPE_META[doc.type].short}</Badge>
            {wb.dirty && (
              <span className="text-xs font-medium text-amber-700">Edited</span>
            )}
          </div>
          {doc.baseInfo && (
            <p className="hidden truncate text-xs text-muted-foreground md:block">
              {[doc.baseInfo.partNo, doc.baseInfo.partName, doc.baseInfo.evaluationCriteria]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
          <span>
            Health <strong className="text-foreground">{analytics.healthScore}</strong>
          </span>
          <span>
            Nodes <strong className="text-foreground">{analytics.nodeCount}</strong>
          </span>
          <span>
            Rules{" "}
            <strong
              className={
                analytics.ruleSummary.error > 0 ? "text-destructive" : "text-foreground"
              }
            >
              {analytics.ruleSummary.error}e / {analytics.ruleSummary.warning}w
            </strong>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative mr-1 hidden md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={wb.searchQuery}
              onChange={(e) => wb.setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 w-40 pl-8 lg:w-48"
              aria-label="Search nodes"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => wb.setLeftOpen(!wb.leftOpen)}
          >
            <PanelLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!INSPECTOR_TABS.has(wb.activeTab)}
            onClick={() => wb.setRightOpen(!wb.rightOpen)}
          >
            <PanelRight className="h-4 w-4" />
            <span className="hidden sm:inline">Inspect</span>
          </Button>
          <Button type="button" variant="outline" size="icon" title="Copy JSON" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" title="Export" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Re-layout"
            onClick={() => {
              wb.relayoutActive();
              toast({ title: "Layout refreshed" });
            }}
          >
            <Layout className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => wb.reset()}>
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </Button>
        </div>
      </header>

      <div className="app-main">
        {wb.leftOpen && (
          <button
            type="button"
            aria-label="Close data panel"
            className="absolute inset-0 z-20 bg-black/20 md:hidden"
            onClick={() => wb.setLeftOpen(false)}
          />
        )}

        <aside
          className={cn(
            "z-30 flex h-full flex-col bg-card",
            "absolute inset-y-0 left-0 w-[min(100%,18rem)] md:static",
            wb.leftOpen
              ? "app-rail translate-x-0"
              : "-translate-x-full md:hidden md:w-0 md:border-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Data source</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => wb.setLeftOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <DataInputPanel onJsonSubmit={handleLoad} disabled={wb.isLoading} hideHeader />
          </div>
        </aside>

        <section className="app-content">
          <Tabs
            value={wb.activeTab}
            onValueChange={(v) => wb.setTab(v as WorkbenchTab)}
            className="flex h-full min-h-0 flex-col"
          >
            <TabsList className="app-tabs h-auto w-full justify-start rounded-none p-0">
              <Tab value="overview" icon={LayoutDashboard} label="Overview" />
              <Tab value="main" icon={ListTree} label="Structure" />
              <Tab value="outline" icon={GitBranch} label="Outline" />
              <Tab value="table" icon={Table2} label="Table" />
              <Tab
                value="feature"
                icon={Network}
                label="Feature"
                disabled={
                  !wb.graphs?.feature.nodes.length && !wb.graphs?.feature.edges.length
                }
              />
              <Tab
                value="failure"
                icon={AlertTriangle}
                label="Failure"
                disabled={
                  !wb.graphs?.failure.nodes.length && !wb.graphs?.failure.edges.length
                }
              />
              <Tab
                value="interface"
                icon={Share2}
                label="Interface"
                disabled={
                  !wb.graphs?.interface.nodes.length &&
                  !wb.graphs?.interface.edges.length
                }
              />
              <Tab value="verification" icon={ShieldCheck} label="Rules" />
            </TabsList>

            <div className="app-canvas relative">
              <TabsContent value="overview" className="m-0 h-full">
                <OverviewPanel
                  doc={doc}
                  analytics={analytics}
                  onOpenRules={() => wb.setTab("verification")}
                  onOpenTable={() => wb.setTab("table")}
                  onFilterType={(t) => {
                    wb.setTypeFilter(t);
                    wb.setTab("outline");
                  }}
                />
              </TabsContent>

              <TabsContent value="main" className="m-0 h-full">
                {wb.graphs && wb.graphs.main.nodes.length > 0 ? (
                  <GraphViewerWrapper
                    nodes={graphNodes}
                    edges={graphEdges}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitToken={wb.fitToken}
                  />
                ) : (
                  <Empty label="No structure nodes" />
                )}
              </TabsContent>

              <TabsContent value="outline" className="m-0 h-full">
                <OutlineTree
                  tree={wb.tree}
                  selectedId={wb.selectedNodeId}
                  searchQuery={wb.searchQuery}
                  typeFilter={wb.typeFilter}
                  onSelect={(id) => {
                    wb.selectNode(id);
                    wb.setRightOpen(true);
                  }}
                  onSearchChange={(q) => wb.setSearch(q)}
                  onClearTypeFilter={() => wb.setTypeFilter(null)}
                />
              </TabsContent>

              <TabsContent value="table" className="m-0 h-full">
                <AnalysisTable
                  rows={wb.tableRows}
                  selectedId={wb.selectedNodeId}
                  onSelectFailure={(id) => {
                    wb.selectNode(id);
                    wb.setRightOpen(true);
                    wb.setTab("main");
                  }}
                />
              </TabsContent>

              <TabsContent value="feature" className="m-0 h-full">
                {wb.graphs && wb.graphs.feature.nodes.length > 0 ? (
                  <GraphViewerWrapper
                    nodes={graphNodes}
                    edges={graphEdges}
                    onNodeClick={handleNodeClick}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitToken={wb.fitToken}
                  />
                ) : (
                  <Empty label="No feature net" />
                )}
              </TabsContent>

              <TabsContent value="failure" className="m-0 h-full">
                {wb.graphs && wb.graphs.failure.nodes.length > 0 ? (
                  <GraphViewerWrapper
                    nodes={graphNodes}
                    edges={graphEdges}
                    onNodeClick={handleNodeClick}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitToken={wb.fitToken}
                  />
                ) : (
                  <Empty label="No failure net" />
                )}
              </TabsContent>

              <TabsContent value="interface" className="m-0 h-full">
                {wb.graphs && wb.graphs.interface.nodes.length > 0 ? (
                  <InterfaceViewer
                    nodes={graphNodes}
                    edges={graphEdges}
                    interfaceLinks={doc.interfaces}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView={wb.fitToken > 0}
                  />
                ) : (
                  <Empty label="No interface data" />
                )}
              </TabsContent>

              <TabsContent value="verification" className="m-0 h-full overflow-y-auto">
                <div className="mx-auto max-w-3xl p-4">
                  <RuleVerificationPanel
                    fmeaJson={doc.rawJson}
                    fmeaType={doc.type}
                    precomputed={analytics.ruleGroups}
                    onFocusUuid={(uuid) => {
                      const node = doc.nodes.find(
                        (n) =>
                          idKey(n.uuid) === uuid || idKey(n.uuid).endsWith(uuid)
                      );
                      if (node) {
                        wb.focusNode(idKey(node.uuid));
                        wb.setRightOpen(true);
                        toast({
                          title: "Focused",
                          description: node.description.slice(0, 80),
                        });
                      } else {
                        toast({
                          variant: "destructive",
                          title: "UUID not found",
                          description: uuid,
                        });
                      }
                    }}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </section>

        <aside
          className={cn(
            "hidden h-full lg:flex",
            showInspector ? "app-inspector" : "w-0 overflow-hidden border-0"
          )}
        >
          {showInspector && (
            <div className="flex h-full w-[var(--aside-right)] flex-col">
              <div className="border-b border-border px-3 py-2 text-sm font-medium">
                Inspector
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <UnifiedPropertiesEditor
                  nodeData={draftNode}
                  interfaceLinkData={draftInterface}
                  apiResponseType={doc.type}
                  onPropertyChange={(n) => setDraftNode(n)}
                  onInterfaceLinkPropertyChange={(l) => setDraftInterface(l)}
                  onUpdateNode={() => {
                    if (!draftNode) return;
                    wb.applyNodeEdit(draftNode);
                    toast({ title: "Node applied" });
                  }}
                  onUpdateInterfaceLink={() => {
                    if (!draftInterface) return;
                    wb.applyInterfaceEdit(draftInterface);
                    toast({ title: "Interface applied" });
                  }}
                  disabled={wb.isLoading}
                />
              </div>
            </div>
          )}
        </aside>

        {showInspector && (
          <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[42%] overflow-hidden border-t border-border bg-card shadow-lg lg:hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-medium">Inspector</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => wb.setRightOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[36vh] overflow-y-auto">
              <UnifiedPropertiesEditor
                nodeData={draftNode}
                interfaceLinkData={draftInterface}
                apiResponseType={doc.type}
                onPropertyChange={(n) => setDraftNode(n)}
                onInterfaceLinkPropertyChange={(l) => setDraftInterface(l)}
                onUpdateNode={() => {
                  if (!draftNode) return;
                  wb.applyNodeEdit(draftNode);
                  toast({ title: "Node applied" });
                }}
                onUpdateInterfaceLink={() => {
                  if (!draftInterface) return;
                  wb.applyInterfaceEdit(draftInterface);
                  toast({ title: "Interface applied" });
                }}
                disabled={wb.isLoading}
              />
            </div>
          </div>
        )}
      </div>

      <footer className="app-statusbar">
        <span className="font-medium capitalize text-foreground/80">{wb.activeTab}</span>
        <span className="min-w-0 flex-1 truncate">
          {doc.baseInfo
            ? [doc.baseInfo.partNo, doc.baseInfo.partName].filter(Boolean).join(" · ")
            : TYPE_META[doc.type].label}
        </span>
        <span
          className={cn(
            "font-medium",
            analytics.ruleSummary.error > 0 ? "text-destructive" : "text-emerald-700"
          )}
        >
          {analytics.ruleSummary.error > 0
            ? `${analytics.ruleSummary.error} errors`
            : "No errors"}
        </span>
      </footer>
    </div>
  );
}

function Tab({
  value,
  icon: Icon,
  label,
  disabled,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <TabsTrigger value={value} disabled={disabled} className="app-tab">
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <p className="rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
