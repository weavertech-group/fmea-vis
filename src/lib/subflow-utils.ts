import type { Node as RFNode, Edge as RFEdge } from "reactflow";
import type { CustomNodeData, FmeaNode } from "@/types/fmea";
import { SubFlowNodeData } from "@/components/fmea/SubFlowNode";

export interface SubFlowGroup {
  id: string;
  parentNode: FmeaNode;
  childNodes: FmeaNode[];
  isExpanded: boolean;
  subFlowType: 'system' | 'subsystem' | 'component';
}

export interface ProcessedSubFlowData {
  subFlowNodes: RFNode<SubFlowNodeData>[];
  regularNodes: RFNode<CustomNodeData>[];
  subFlowEdges: RFEdge[];
  expandedStates: Map<string, boolean>;
}

/**
 * Determines if a node should be part of a subflow based on its type and children
 */
export function shouldCreateSubFlow(node: FmeaNode, allNodes: FmeaNode[]): boolean {
  const isInterfaceNode = ['system', 'subsystem', 'component'].includes(node.nodeType);
  if (!isInterfaceNode) return false;
  
  const hasChildren = allNodes.some(n => n.parentId === node.uuid);
  return hasChildren;
}

/**
 * Gets the subflow type based on node type
 */
export function getSubFlowType(nodeType: string): 'system' | 'subsystem' | 'component' {
  if (nodeType === 'system') return 'system';
  if (nodeType === 'subsystem') return 'subsystem';
  if (nodeType === 'component') return 'component';
  return 'system'; // default
}

/**
 * Groups nodes into subflows based on their parent-child relationships
 */
export function groupNodesIntoSubFlows(
  rfNodes: RFNode<CustomNodeData>[], 
  expandedStates: Map<string, boolean> = new Map()
): SubFlowGroup[] {
  const allApiNodes = rfNodes.map(n => n.data.originalApiNode);
  const subFlowGroups: SubFlowGroup[] = [];
  
  for (const rfNode of rfNodes) {
    const apiNode = rfNode.data.originalApiNode;
    
    if (shouldCreateSubFlow(apiNode, allApiNodes)) {
      const childNodes = allApiNodes.filter(n => n.parentId === apiNode.uuid);
      const nodeId = apiNode.uuid.toString();
      const isExpanded = expandedStates.get(nodeId) ?? true; // default expanded
      
      subFlowGroups.push({
        id: nodeId,
        parentNode: apiNode,
        childNodes,
        isExpanded,
        subFlowType: getSubFlowType(apiNode.nodeType)
      });
    }
  }
  
  return subFlowGroups;
}

/**
 * Creates subflow nodes from subflow groups
 */
export function createSubFlowNodes(
  subFlowGroups: SubFlowGroup[],
  originalNodes: RFNode<CustomNodeData>[],
  onToggleExpand: (nodeId: string) => void
): RFNode<SubFlowNodeData>[] {
  return subFlowGroups.map(group => {
    const originalRfNode = originalNodes.find(n => n.id === group.id);
    if (!originalRfNode) {
      throw new Error(`Original node not found for subflow group ${group.id}`);
    }
    
    return {
      ...originalRfNode,
      type: 'subflow',
      data: {
        ...originalRfNode.data,
        isExpanded: group.isExpanded,
        onToggleExpand,
        childCount: group.childNodes.length,
        subFlowType: group.subFlowType
      }
    };
  });
}

/**
 * Filters out nodes that are part of collapsed subflows
 */
export function filterVisibleNodes(
  rfNodes: RFNode<CustomNodeData>[],
  subFlowGroups: SubFlowGroup[]
): RFNode<CustomNodeData>[] {
  const collapsedParentIds = new Set(
    subFlowGroups
      .filter(group => !group.isExpanded)
      .map(group => group.parentNode.uuid.toString())
  );
  
  const hiddenNodeIds = new Set<string>();
  
  // Add all children of collapsed subflows to hidden set
  for (const group of subFlowGroups) {
    if (!group.isExpanded) {
      for (const child of group.childNodes) {
        hiddenNodeIds.add(child.uuid.toString());
        // Also hide their descendants recursively
        addDescendantsToHidden(child.uuid.toString(), rfNodes, hiddenNodeIds);
      }
    }
  }
  
  // Filter out nodes that are part of subflows or hidden
  return rfNodes.filter(node => {
    const nodeId = node.id;
    const apiNode = node.data.originalApiNode;
    
    // Don't show nodes that are subflow parents (they'll be shown as subflow nodes)
    if (subFlowGroups.some(group => group.id === nodeId)) {
      return false;
    }
    
    // Don't show hidden nodes
    if (hiddenNodeIds.has(nodeId)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Recursively adds descendants of a node to the hidden set
 */
function addDescendantsToHidden(
  parentId: string, 
  allNodes: RFNode<CustomNodeData>[], 
  hiddenSet: Set<string>
): void {
  const children = allNodes.filter(n => 
    n.data.originalApiNode.parentId.toString() === parentId
  );
  
  for (const child of children) {
    hiddenSet.add(child.id);
    addDescendantsToHidden(child.id, allNodes, hiddenSet);
  }
}

/**
 * Filters edges to only show visible connections
 */
export function filterVisibleEdges(
  rfEdges: RFEdge[],
  visibleNodeIds: Set<string>,
  subFlowNodeIds: Set<string>
): RFEdge[] {
  const allVisibleIds = new Set([...visibleNodeIds, ...subFlowNodeIds]);
  
  return rfEdges.filter(edge => 
    allVisibleIds.has(edge.source) && allVisibleIds.has(edge.target)
  );
}

/**
 * Main function to process nodes and create subflow structure
 */
export function processNodesForSubFlows(
  rfNodes: RFNode<CustomNodeData>[],
  rfEdges: RFEdge[],
  expandedStates: Map<string, boolean>,
  onToggleExpand: (nodeId: string) => void
): ProcessedSubFlowData {
  // Group nodes into subflows
  const subFlowGroups = groupNodesIntoSubFlows(rfNodes, expandedStates);
  
  // Create subflow nodes
  const subFlowNodes = createSubFlowNodes(subFlowGroups, rfNodes, onToggleExpand);
  
  // Filter visible regular nodes
  const regularNodes = filterVisibleNodes(rfNodes, subFlowGroups);
  
  // Filter visible edges
  const visibleNodeIds = new Set(regularNodes.map(n => n.id));
  const subFlowNodeIds = new Set(subFlowNodes.map(n => n.id));
  const subFlowEdges = filterVisibleEdges(rfEdges, visibleNodeIds, subFlowNodeIds);
  
  return {
    subFlowNodes,
    regularNodes,
    subFlowEdges,
    expandedStates
  };
}