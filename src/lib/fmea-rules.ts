import type { FmeaApiResponse, ApiResponseType, FmeaNode } from '@/types/fmea';

export type RuleItemStatus = 'success' | 'error' | 'warning' | 'info';

export interface RuleItem {
  id: string;
  description: string;
  status: RuleItemStatus;
  details?: string | null;
  remark?: string | null;
}

export interface RuleGroup {
  groupTitle: string;
  overallStatus: RuleItemStatus;
  summary: { [key in RuleItemStatus]?: number };
  rules: RuleItem[];
}

export interface FmeaRule {
  id: string; 
  description: string;
  groupId: 'structure' | 'linking' | 'completeness';
  remark?: string;
  check: (data: FmeaApiResponse, type: ApiResponseType | null) => Pick<RuleItem, 'status' | 'details'>;
}

// Legacy export for compatibility
export type RuleResult = RuleGroup;

const ruleGroupDefs = {
  structure: { title: '结构骨架约束' },
  linking: { title: '元素挂载与层级约束' },
  completeness: { title: '完整性与必填项约束' },
};

const rules: FmeaRule[] = [
  // All/General Rules (00-*)
  {
    id: '00-0-0-01',
    description: '所有 `/analysis/*` 请求都必须包含 `scope` 字段。',
    remark: '此规则确保后端能明确区分是"从零开始生成结构"还是"在用户修改的基础上进行深化分析"。',
    groupId: 'completeness',
    check: (data) => {
      // This is a request validation rule - in the context of response validation, we mark as info
      return { status: 'info', details: '该规则适用于请求验证，响应验证中跳过。' };
    },
  },
  {
    id: '00-0-0-02',
    description: '当 `scope="full_doc"` 时，请求体中必须包含 `modifiedStructure` 对象。',
    groupId: 'completeness',
    check: (data) => {
      // This is a request validation rule
      return { status: 'info', details: '该规则适用于请求验证，响应验证中跳过。' };
    },
  },
  {
    id: '00-0-0-03',
    description: '所有请求都必须包含 `sessionId`。',
    groupId: 'completeness',
    check: (data) => {
      // This is a request validation rule
      return { status: 'info', details: '该规则适用于请求验证，响应验证中跳过。' };
    },
  },
  {
    id: '00-0-1-04',
    description: '当 `scope="structure_only"` 时，`modifiedStructure` 对象应被忽略或不存在。',
    remark: '发送多余的数据是一种不良实践，但后端应能容错处理。',
    groupId: 'completeness',
    check: (data) => {
      // This is a request validation rule
      return { status: 'info', details: '该规则适用于请求验证，响应验证中跳过。' };
    },
  },
  {
    id: '00-0-2-05',
    description: '请求中可选的 `nodes` 字段（一个 `[{ "uuid": ... }]` 列表）用于指定分析焦点。',
    remark: '此功能为未来实现"右键点击节点进行局部增量生成"提供了基础。',
    groupId: 'completeness',
    check: (data) => {
      // This is a request validation rule
      return { status: 'info', details: '该规则适用于请求验证，响应验证中跳过。' };
    },
  },
  {
    id: '00-0-2-06',
    description: '可选的 `documentIds` 列表用于告知 Agent 需要参考的上下文文档。',
    remark: '这是一个可选功能，用于提供更多上下文。',
    groupId: 'completeness',
    check: (data) => {
      // This is a request validation rule
      return { status: 'info', details: '该规则适用于请求验证，响应验证中跳过。' };
    },
  },
  {
    id: '00-1-0-07',
    description: '在 `scope="full_doc"` 的场景下，Agent 返回的 `nodes` 列表绝不能修改或删除任何从 `modifiedStructure` 中接收到的节点的 `uuid` 和 `parentId`。',
    remark: '这是保证用户编辑内容不被 AI 覆盖的核心规则，是系统数据一致性的基石。',
    groupId: 'structure',
    check: (data) => {
      // This requires comparing with modifiedStructure which is not available in current context
      return { status: 'info', details: '该规则需要比较 modifiedStructure，当前上下文中无法验证。' };
    },
  },
  {
    id: '00-1-0-08',
    description: 'Agent 只能在现有结构上添加新节点。',
    groupId: 'structure',
    check: (data) => {
      // This requires comparing with previous structure
      return { status: 'info', details: '该规则需要比较之前的结构，当前上下文中无法验证。' };
    },
  },
  {
    id: '00-1-0-09',
    description: 'Agent 的输出必须是一个结构完整的 JSON 对象。',
    remark: '格式错误将导致整个响应无法被平台解析。',
    groupId: 'completeness',
    check: (data) => {
      if (!data) {
        return { status: 'error', details: '响应数据为空。' };
      }
      if (!data.nodes) {
        return { status: 'error', details: '响应缺少 nodes 字段。' };
      }
      if (!Array.isArray(data.nodes)) {
        return { status: 'error', details: 'nodes 字段必须是数组。' };
      }
      return { status: 'success' };
    },
  },
  {
    id: '00-1-1-10',
    description: '（需求分析特定）响应中 `nodes` 数组的长度上限为 100。',
    remark: '超出限制可能导致前端性能问题或降低可用性，但不一定会使系统崩溃。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'requirements') {
        return { status: 'info', details: '该规则仅适用于需求分析类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      if (data.nodes.length > 100) {
        return { status: 'warning', details: `警告：nodes 数组长度为 ${data.nodes.length}，超过建议上限 100。` };
      }
      return { status: 'success' };
    },
  },

  // Requirements Rules (01-*)
  {
    id: '01-1-0-01',
    description: '需求树必须有且仅有一个根节点 (`parentId: -1`)。',
    remark: '树状结构依赖于唯一的根节点。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'requirements') {
        return { status: 'info', details: '该规则仅适用于需求分析类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const rootNodes = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (rootNodes.length !== 1) {
        return { status: 'error', details: `失败详情：发现 ${rootNodes.length} 个根节点，应为 1 个。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-0-02',
    description: '该根节点的 `nodeType` 必须是 `requirement`。',
    remark: '定义了树的类型和目的。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'requirements') {
        return { status: 'info', details: '该规则仅适用于需求分析类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const rootNodes = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (rootNodes.length !== 1) {
        return { status: 'info', details: '无法确定唯一的根节点。' };
      }
      const rootNode = rootNodes[0];
      if (rootNode.nodeType !== 'requirement') {
        return { status: 'error', details: `失败详情：根节点的 nodeType 为 '${rootNode.nodeType}'，应为 'requirement'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-0-03',
    description: '`cha` 节点不能有任何子节点。',
    remark: '特性是分析的叶子节点，其下不应再有分解。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'requirements') {
        return { status: 'info', details: '该规则仅适用于需求分析类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      const chaNodesWithChildren = chaNodes.filter(chaNode => {
        return data.nodes.some(n => n.parentId === chaNode.uuid);
      });
      
      if (chaNodesWithChildren.length > 0) {
        const details = `失败详情：发现 ${chaNodesWithChildren.length} 个 cha 节点有子节点 (UUIDs: ${chaNodesWithChildren.map(n => n.uuid.toString()).slice(0,3).join(', ')}${chaNodesWithChildren.length > 3 ? '...' : ''})。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-1-04',
    description: '根节点（总需求）下不应直接挂载 `func` 或 `cha` 节点。',
    remark: '违反了需求分解的最佳实践，应先有子需求。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'requirements') {
        return { status: 'info', details: '该规则仅适用于需求分析类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const rootNodes = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (rootNodes.length !== 1) {
        return { status: 'info', details: '无法确定唯一的根节点。' };
      }
      const rootNode = rootNodes[0];
      const directChildren = data.nodes.filter(n => n.parentId === rootNode.uuid);
      const funcOrChaChildren = directChildren.filter(n => n.nodeType === 'func' || n.nodeType === 'cha');
      
      if (funcOrChaChildren.length > 0) {
        const details = `警告详情：根节点下直接挂载了 ${funcOrChaChildren.length} 个 func/cha 节点，建议先有子需求。`;
        return { status: 'warning', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '01-1-1-05',
    description: '`func` 节点下不应再有 `func` 子节点。',
    remark: '`func` 下再挂 `func` 违反了功能分解的逻辑。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'requirements') {
        return { status: 'info', details: '该规则仅适用于需求分析类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const funcNodesWithFuncChildren = funcNodes.filter(funcNode => {
        return data.nodes.some(n => n.parentId === funcNode.uuid && n.nodeType === 'func');
      });
      
      if (funcNodesWithFuncChildren.length > 0) {
        const details = `警告详情：发现 ${funcNodesWithFuncChildren.length} 个 func 节点下有 func 子节点，违反功能分解逻辑。`;
        return { status: 'warning', details };
      }
      return { status: 'success' };
    },
  },

  // DFMEA Rules (02-*) - Updated and new rules
  {
    id: '02-1-0-01',
    description: '必须有且仅有一个 `system` 类型的根节点。',
    remark: '此规则严格对齐 AIAG-VDA FMEA 方法论中的"结构分析"步骤，确保了分析的规范性。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const systemNodes = data.nodes.filter(n => n.nodeType === 'system');
      if (systemNodes.length !== 1) {
        return { status: 'error', details: `失败详情：发现 ${systemNodes.length} 个 system 节点，应为 1 个。` };
      }
      if (systemNodes[0].parentId.toString() !== '-1') {
        return { status: 'error', details: `失败详情：system 节点 (UUID: ${systemNodes[0].uuid}) 不是根节点。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-02',
    description: '`system` 根节点下有且仅有一个 `subsystem` 类型的直接子节点。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const systemNodes = data.nodes.filter(n => n.nodeType === 'system' && n.parentId.toString() === '-1');
      if (systemNodes.length !== 1) {
        return { status: 'info', details: '无法确定唯一的 system 根节点。' };
      }
      const systemNode = systemNodes[0];
      const directSubsystems = data.nodes.filter(n => n.parentId === systemNode.uuid && n.nodeType === 'subsystem');

      if (directSubsystems.length !== 1) {
        return { status: 'error', details: `失败详情：system 节点 (UUID: ${systemNode.uuid}) 下发现 ${directSubsystems.length} 个 subsystem 子节点，应为 1 个。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-03',
    description: '所有在 `subsystem` 节点之下的结构性节点，其类型必须是 `component`。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const subsystemNodes = data.nodes.filter(n => n.nodeType === 'subsystem');
      const structuralNodeTypes = ['system', 'subsystem', 'component'];
      
      let invalidStructuralNodes: any[] = [];
      
      function checkDescendants(parentId: bigint): void {
        const children = data.nodes.filter(n => n.parentId === parentId);
        children.forEach(child => {
          if (structuralNodeTypes.includes(child.nodeType) && child.nodeType !== 'component') {
            invalidStructuralNodes.push(child);
          }
          checkDescendants(child.uuid);
        });
      }
      
      subsystemNodes.forEach(subsystemNode => {
        checkDescendants(subsystemNode.uuid);
      });
      
      if (invalidStructuralNodes.length > 0) {
        const details = `失败详情：subsystem 节点之下发现 ${invalidStructuralNodes.length} 个非 component 的结构性节点。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-04',
    description: '`func` (功能) 节点只能被挂载在 `system`、`subsystem` 或 `component` 节点下。',
    remark: '功能必须依附于一个结构实体。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const allowedParentTypes = ['system', 'subsystem', 'component'];
      
      const invalidFuncNodes = funcNodes.filter(funcNode => {
        const parent = data.nodes.find(n => n.uuid === funcNode.parentId);
        return !parent || !allowedParentTypes.includes(parent.nodeType);
      });
      
      if (invalidFuncNodes.length > 0) {
        const details = `失败详情：发现 ${invalidFuncNodes.length} 个 func 节点的父节点不是 system/subsystem/component。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-05',
    description: '`cha` (特性) 的父节点必须是 `func`。',
    remark: '特性是功能的量化描述，逻辑上不能脱离功能存在。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      
      const invalidChaNodes = chaNodes.filter(chaNode => {
        const parent = data.nodes.find(n => n.uuid === chaNode.parentId);
        return !parent || parent.nodeType !== 'func';
      });
      
      if (invalidChaNodes.length > 0) {
        const details = `失败详情：发现 ${invalidChaNodes.length} 个 cha 节点的父节点不是 func。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-06',
    description: '`failure` (失效) 的父节点必须是 `func` 或 `cha`。',
    remark: '失效必须是"某个功能/特性的失效"。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      
      const invalidFailureNodes = failureNodes.filter(failureNode => {
        const parent = data.nodes.find(n => n.uuid === failureNode.parentId);
        return !parent || !['func', 'cha'].includes(parent.nodeType);
      });
      
      if (invalidFailureNodes.length > 0) {
        const details = `失败详情：发现 ${invalidFailureNodes.length} 个 failure 节点的父节点不是 func 或 cha。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-07',
    description: '`detection` 字段仅在 `category` 为 `2` (日常探测控制) 时才有效且必需。',
    remark: '数据模型的内在逻辑，在其他 category 下此字段无意义。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const actionNodes = data.nodes.filter(n => n.nodeType === 'action');
      
      let violations = 0;
      actionNodes.forEach(actionNode => {
        const extra = actionNode.extra as any;
        if (extra?.category === 2 && typeof extra.detection !== 'number') {
          violations++;
        } else if (extra?.category !== 2 && extra.detection !== undefined) {
          violations++;
        }
      });
      
      if (violations > 0) {
        return { status: 'error', details: `失败详情：发现 ${violations} 个 action 节点的 detection 字段使用不当。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-08',
    description: '`featureNet` 用于连接 `func` 类型的节点；`failureNet` 用于连接 `failure` 类型的节点。',
    remark: '连接错误的节点类型会使网络失去其业务含义。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      const dfmeaData = data as any;
      let violations = 0;
      
      // Check featureNet
      if (dfmeaData.featureNet && Array.isArray(dfmeaData.featureNet)) {
        dfmeaData.featureNet.forEach((link: any) => {
          const fromNode = data.nodes?.find(n => n.uuid === link.from);
          const toNode = data.nodes?.find(n => n.uuid === link.to);
          if ((fromNode && fromNode.nodeType !== 'func') || (toNode && toNode.nodeType !== 'func')) {
            violations++;
          }
        });
      }
      
      // Check failureNet
      if (dfmeaData.failureNet && Array.isArray(dfmeaData.failureNet)) {
        dfmeaData.failureNet.forEach((link: any) => {
          const fromNode = data.nodes?.find(n => n.uuid === link.from);
          const toNode = data.nodes?.find(n => n.uuid === link.to);
          if ((fromNode && fromNode.nodeType !== 'failure') || (toNode && toNode.nodeType !== 'failure')) {
            violations++;
          }
        });
      }
      
      if (violations > 0) {
        return { status: 'error', details: `失败详情：发现 ${violations} 个网络连接类型错误。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-09',
    description: '`interface` 只能在 `component` 类型的节点之间建立。',
    remark: '接口的定义是组件间的交互。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      const dfmeaData = data as any;
      
      if (!dfmeaData.interface || !Array.isArray(dfmeaData.interface)) {
        return { status: 'info', details: '无 interface 数据可供检查。' };
      }
      
      let violations = 0;
      dfmeaData.interface.forEach((interfaceLink: any) => {
        const startNode = data.nodes?.find(n => n.uuid === interfaceLink.startId);
        const endNode = data.nodes?.find(n => n.uuid === interfaceLink.endId);
        if ((startNode && startNode.nodeType !== 'component') || (endNode && endNode.nodeType !== 'component')) {
          violations++;
        }
      });
      
      if (violations > 0) {
        return { status: 'error', details: `失败详情：发现 ${violations} 个 interface 连接的节点不是 component 类型。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-0-10',
    description: '`interface` 的 `structureId` 必须是 `startId` 和 `endId` 的共同父节点的 `uuid`。',
    remark: '这是定位和渲染接口的必要信息。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      const dfmeaData = data as any;
      
      if (!dfmeaData.interface || !Array.isArray(dfmeaData.interface)) {
        return { status: 'info', details: '无 interface 数据可供检查。' };
      }
      
      let violations = 0;
      dfmeaData.interface.forEach((interfaceLink: any) => {
        const startNode = data.nodes?.find(n => n.uuid === interfaceLink.startId);
        const endNode = data.nodes?.find(n => n.uuid === interfaceLink.endId);
        
        if (startNode && endNode) {
          const commonParent = data.nodes?.find(n => 
            n.uuid === startNode.parentId && n.uuid === endNode.parentId
          );
          
          if (!commonParent || commonParent.uuid !== interfaceLink.structureId) {
            violations++;
          }
        }
      });
      
      if (violations > 0) {
        return { status: 'error', details: `失败详情：发现 ${violations} 个 interface 的 structureId 不是 startId 和 endId 的共同父节点。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-01',
    description: '每个 `failure` 节点应至少有一个 `action` 子节点。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA/PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      
      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      if (failureNodes.length === 0) {
        return { status: 'info', details: '未发现 failure 节点。' };
      }
      
      const failuresWithoutActions = failureNodes.filter(failureNode => {
        const childActions = data.nodes.filter(n => n.parentId === failureNode.uuid && n.nodeType === 'action');
        return childActions.length === 0;
      });

      if (failuresWithoutActions.length > 0) {
        const details = `警告详情：发现 ${failuresWithoutActions.length} 个 failure 节点缺少 action 子节点 (UUIDs: ${failuresWithoutActions.map(n => n.uuid.toString()).slice(0,3).join(', ')}${failuresWithoutActions.length > 3 ? '...' : ''})。`;
        return { status: 'warning', details };
      }
      
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-11',
    description: '一个 `func` 节点不应同时直接拥有 `cha` 子节点和 `failure` 子节点。',
    remark: '这是一个重要的逻辑规则，确保分析链条的清晰性。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      
      const violatingFuncNodes = funcNodes.filter(funcNode => {
        const chaChildren = data.nodes.filter(n => n.parentId === funcNode.uuid && n.nodeType === 'cha');
        const failureChildren = data.nodes.filter(n => n.parentId === funcNode.uuid && n.nodeType === 'failure');
        return chaChildren.length > 0 && failureChildren.length > 0;
      });
      
      if (violatingFuncNodes.length > 0) {
        const details = `警告详情：发现 ${violatingFuncNodes.length} 个 func 节点同时拥有 cha 和 failure 子节点。`;
        return { status: 'warning', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-12',
    description: '如果响应中存在 `failureNet`，那么 `featureNet` 也应一并返回，反之亦然。',
    remark: '缺少一个会导致分析不完整，但系统仍可处理单个网络。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      const dfmeaData = data as any;
      const hasFeatureNet = dfmeaData.featureNet && Array.isArray(dfmeaData.featureNet) && dfmeaData.featureNet.length > 0;
      const hasFailureNet = dfmeaData.failureNet && Array.isArray(dfmeaData.failureNet) && dfmeaData.failureNet.length > 0;
      
      if (hasFeatureNet !== hasFailureNet) {
        const missing = hasFeatureNet ? 'failureNet' : 'featureNet';
        return { status: 'warning', details: `警告详情：存在网络数据但缺少 ${missing}，分析可能不完整。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-1-13',
    description: '网络中不应在两个拥有相同父节点的同级节点之间建立连接。',
    remark: '违反了 FMEA 中功能/失效链的跨层级传递原则。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'dfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA类型。' };
      }
      const dfmeaData = data as any;
      let violations = 0;
      
      // Check both featureNet and failureNet
      const nets = [dfmeaData.featureNet, dfmeaData.failureNet].filter(net => 
        net && Array.isArray(net)
      );
      
      nets.forEach(net => {
        net.forEach((link: any) => {
          const fromNode = data.nodes?.find(n => n.uuid === link.from);
          const toNode = data.nodes?.find(n => n.uuid === link.to);
          
          if (fromNode && toNode && fromNode.parentId === toNode.parentId) {
            violations++;
          }
        });
      });
      
      if (violations > 0) {
        return { status: 'warning', details: `警告详情：发现 ${violations} 个同级节点间的网络连接。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '02-1-2-01',
    description: 'DFMEA/PFMEA 中的 `failure` 节点应有 `severity` 评级。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'dfmea' && type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于DFMEA/PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }

      const failureNodes = data.nodes.filter(n => n.nodeType === 'failure');
      if (failureNodes.length === 0) {
        return { status: 'info', details: '未发现 failure 节点。' };
      }
      
      const failuresWithoutSeverity = failureNodes.filter(node => 
        !node.extra || typeof (node.extra as any).severity !== 'number'
      );

      if (failuresWithoutSeverity.length > 0) {
        const details = `警告详情：发现 ${failuresWithoutSeverity.length} 个 failure 节点缺少 severity 评级 (UUIDs: ${failuresWithoutSeverity.map(n => n.uuid.toString()).slice(0,3).join(', ')}${failuresWithoutSeverity.length > 3 ? '...' : ''})。`;
        return { status: 'warning', details };
      }
      
      return { status: 'success' };
    },
  },

  // PFMEA Rules (03-*)
  {
    id: '03-1-0-01',
    description: 'PFMEA 树必须有且仅有一个根节点，且其 `nodeType` 必须是 `item`。',
    remark: '定义了 PFMEA 树的结构和起点。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const rootNodes = data.nodes.filter(n => n.parentId.toString() === '-1');
      if (rootNodes.length !== 1) {
        return { status: 'error', details: `失败详情：发现 ${rootNodes.length} 个根节点，应为 1 个。` };
      }
      if (rootNodes[0].nodeType !== 'item') {
        return { status: 'error', details: `失败详情：根节点的 nodeType 为 '${rootNodes[0].nodeType}'，应为 'item'。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-02',
    description: '若 `cha` 的父节点是 `item`，则 `cha.extra.type` 必须是 `product`。',
    remark: '这是 PFMEA 的核心逻辑，确保了产品/过程特性的正确归属。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      
      const violations = chaNodes.filter(chaNode => {
        const parent = data.nodes.find(n => n.uuid === chaNode.parentId);
        if (parent && parent.nodeType === 'item') {
          const extra = chaNode.extra as any;
          return !extra || extra.type !== 'product';
        }
        return false;
      });
      
      if (violations.length > 0) {
        const details = `失败详情：发现 ${violations.length} 个 cha 节点的父节点是 item 但 type 不是 product。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-03',
    description: '若 `cha` 的父节点是 `elem`，则 `cha.extra.type` 必须是 `process`。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      
      const violations = chaNodes.filter(chaNode => {
        const parent = data.nodes.find(n => n.uuid === chaNode.parentId);
        if (parent && parent.nodeType === 'elem') {
          const extra = chaNode.extra as any;
          return !extra || extra.type !== 'process';
        }
        return false;
      });
      
      if (violations.length > 0) {
        const details = `失败详情：发现 ${violations.length} 个 cha 节点的父节点是 elem 但 type 不是 process。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-04',
    description: '`func` 节点只能被挂载在 `item`, `step`, `step2`, 或 `elem` 节点下。',
    remark: '功能必须依附于一个过程结构实体。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const funcNodes = data.nodes.filter(n => n.nodeType === 'func');
      const allowedParentTypes = ['item', 'step', 'step2', 'elem'];
      
      const violations = funcNodes.filter(funcNode => {
        const parent = data.nodes.find(n => n.uuid === funcNode.parentId);
        return !parent || !allowedParentTypes.includes(parent.nodeType);
      });
      
      if (violations.length > 0) {
        const details = `失败详情：发现 ${violations.length} 个 func 节点的父节点不是 item/step/step2/elem。`;
        return { status: 'error', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-05',
    description: '`detection` 字段仅在 `category` 为 `2` (日常探测控制) 时才有效且必需。',
    remark: '数据模型的内在逻辑。',
    groupId: 'completeness',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const actionNodes = data.nodes.filter(n => n.nodeType === 'action');
      
      let violations = 0;
      actionNodes.forEach(actionNode => {
        const extra = actionNode.extra as any;
        if (extra?.category === 2 && typeof extra.detection !== 'number') {
          violations++;
        } else if (extra?.category !== 2 && extra.detection !== undefined) {
          violations++;
        }
      });
      
      if (violations > 0) {
        return { status: 'error', details: `失败详情：发现 ${violations} 个 action 节点的 detection 字段使用不当。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-0-06',
    description: '`featureNet` 用于连接结构性节点；`failureNet` 用于连接 `mode` 类型的节点。',
    remark: '连接错误的节点类型会使网络失去其业务含义。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      const pfmeaData = data as any;
      let violations = 0;
      const structuralTypes = ['item', 'step', 'step2', 'elem'];
      
      // Check featureNet - should connect structural nodes
      if (pfmeaData.featureNet && Array.isArray(pfmeaData.featureNet)) {
        pfmeaData.featureNet.forEach((link: any) => {
          const fromNode = data.nodes?.find(n => n.uuid === link.from);
          const toNode = data.nodes?.find(n => n.uuid === link.to);
          if ((fromNode && !structuralTypes.includes(fromNode.nodeType)) || 
              (toNode && !structuralTypes.includes(toNode.nodeType))) {
            violations++;
          }
        });
      }
      
      // Check failureNet - should connect mode nodes
      if (pfmeaData.failureNet && Array.isArray(pfmeaData.failureNet)) {
        pfmeaData.failureNet.forEach((link: any) => {
          const fromNode = data.nodes?.find(n => n.uuid === link.from);
          const toNode = data.nodes?.find(n => n.uuid === link.to);
          if ((fromNode && fromNode.nodeType !== 'mode') || (toNode && toNode.nodeType !== 'mode')) {
            violations++;
          }
        });
      }
      
      if (violations > 0) {
        return { status: 'error', details: `失败详情：发现 ${violations} 个网络连接类型错误。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-1-07',
    description: '`cha` 的父节点应优先为 `func`，而非直接挂在结构节点下。',
    remark: '鼓励遵循 `结构 → 功能 → 特性` 的完整逻辑链。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      const chaNodes = data.nodes.filter(n => n.nodeType === 'cha');
      const structuralTypes = ['item', 'step', 'step2', 'elem'];
      
      const chaNodesOnStructure = chaNodes.filter(chaNode => {
        const parent = data.nodes.find(n => n.uuid === chaNode.parentId);
        return parent && structuralTypes.includes(parent.nodeType);
      });
      
      if (chaNodesOnStructure.length > 0) {
        const details = `警告详情：发现 ${chaNodesOnStructure.length} 个 cha 节点直接挂在结构节点下，建议挂在 func 下。`;
        return { status: 'warning', details };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-1-08',
    description: '如果响应中存在 `failureNet`，那么 `featureNet` 也应一并返回，反之亦然。',
    remark: '缺少一个会导致分析不完整。',
    groupId: 'linking',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      const pfmeaData = data as any;
      const hasFeatureNet = pfmeaData.featureNet && Array.isArray(pfmeaData.featureNet) && pfmeaData.featureNet.length > 0;
      const hasFailureNet = pfmeaData.failureNet && Array.isArray(pfmeaData.failureNet) && pfmeaData.failureNet.length > 0;
      
      if (hasFeatureNet !== hasFailureNet) {
        const missing = hasFeatureNet ? 'failureNet' : 'featureNet';
        return { status: 'warning', details: `警告详情：存在网络数据但缺少 ${missing}，分析可能不完整。` };
      }
      return { status: 'success' };
    },
  },
  {
    id: '03-1-2-09',
    description: '推荐的结构层级为 `item` → `step` → `step2` → `elem`。',
    remark: '这是最佳实践，但系统也应能处理简化的层级。',
    groupId: 'structure',
    check: (data, type) => {
      if (type !== 'pfmea') {
        return { status: 'info', details: '该规则仅适用于PFMEA类型。' };
      }
      // This is a suggestion rule about best practices - we'll check if the structure follows the recommended pattern
      if (!data.nodes || data.nodes.length === 0) {
        return { status: 'info', details: '无节点可供检查。' };
      }
      
      // For suggestion level, we just return success as this is about recommended patterns, not violations
      return { status: 'success', details: '建议：推荐使用 item → step → step2 → elem 的完整层级结构。' };
    },
  },
];

export function runAllRules(data: FmeaApiResponse, type: ApiResponseType | null): RuleGroup[] {
  type TempRuleItem = RuleItem & { groupId: string };

  const allRuleItems: TempRuleItem[] = rules.map(rule => {
    const { status, details } = rule.check(data, type);
    return {
      id: rule.id,
      description: rule.description,
      remark: rule.remark || null,
      status,
      details,
      groupId: rule.groupId, // temporary property to help with grouping
    };
  });

  const grouped = allRuleItems.reduce((acc, item) => {
    const { groupId, ...ruleItem } = item;
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(ruleItem);
    return acc;
  }, {} as Record<string, RuleItem[]>);

  const statusPriority: Record<RuleItemStatus, number> = { error: 4, warning: 3, info: 2, success: 1 };

  const result: RuleGroup[] = Object.keys(grouped).map(groupId => {
    const itemsInGroup = grouped[groupId]!;
    
    let overallStatus: RuleItemStatus = 'success';
    const summary = itemsInGroup.reduce((acc, item) => {
      const currentStatus = item.status === 'info' ? 'success' : item.status;
      acc[currentStatus] = (acc[currentStatus] || 0) + 1;
      
      if (statusPriority[item.status] > statusPriority[overallStatus]) {
        overallStatus = item.status;
      }
      return acc;
    }, { success: 0, warning: 0, error: 0 } as Record<'success' | 'warning' | 'error', number>);

    return {
      groupTitle: ruleGroupDefs[groupId as keyof typeof ruleGroupDefs].title,
      overallStatus,
      summary,
      rules: itemsInGroup,
    };
  });

  return result;
}