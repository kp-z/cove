# Project 插件系统设计（Project Plugin System）

> **版本**: v4.0  
> **日期**: 2026-05-08  
> **关键词**: `插件系统`, `DevTools`, `React组件`, `Agent API`, `实时更新`, `Schema图`, `领域模型`, `Runtime流程`, `Git树`, `文件树`

**本文档包含**:
- Project 插件系统架构设计
- 官方插件设计（Web 主页、DevTools、OKR+Plan+Progress）
- DevTools 功能详细设计（5 种可视化）
- Agent 操作接口 API 规范
- 插件注册和生命周期管理
- 实时数据更新机制

**适用场景**:
- 实现 Project 插件系统
- 开发官方插件
- 设计 Agent 操作接口
- 实现 DevTools 可视化功能

**相关文档**:
- [Frontend Layer](./frontend-layer.md) - 前端架构设计
- [Feature Domain Organization](./05-feature-domain-organization.md) - 功能域组织规范

---

## 1. 功能概述

Project 插件系统允许在 Project 页面中嵌入不同类型的功能插件，提供可扩展的项目管理能力。

**核心特性**：
- **插件化架构**：Project 支持多种页面嵌入
- **官方插件**：Web 主页、DevTools、OKR+Plan+Progress（默认启用）
- **React 组件模式**：官方插件使用 React 组件，深度集成
- **Agent 操作接口**：所有插件支持 Agent 读写操作
- **实时数据更新**：通过 WebSocket 实时同步数据变化
- **权限控制**：细粒度的读写权限管理

---

## 2. 架构设计

### 2.1 插件系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      ProjectPage                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              PluginContainer                      │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │         PluginRenderer                     │  │   │
│  │  │  ┌──────────────────────────────────────┐ │  │   │
│  │  │  │  WebHomePlugin                       │ │  │   │
│  │  │  │  or DevToolsPlugin                   │ │  │   │
│  │  │  │  or OKRPlanProgressPlugin            │ │  │   │
│  │  │  └──────────────────────────────────────┘ │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           PluginAgentAPIProvider                  │   │
│  │  (提供 Agent 操作接口)                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Plugin State Management                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Zustand      │  │ React Query  │  │ WebSocket    │  │
│  │ (插件状态)    │  │ (服务端数据)  │  │ (实时更新)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 插件类型定义

```typescript
// features/project/types/plugin.ts

export type PluginType = 'official' | 'custom';
export type PluginRenderMode = 'component' | 'iframe';

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  type: PluginType;
  renderMode: PluginRenderMode;
  icon: string;
  
  // React 组件模式
  component?: React.ComponentType<PluginProps>;
  
  // iframe 模式（未来自定义插件）
  iframeUrl?: string;
  
  // Agent 操作接口
  agentAPI: {
    read: string[];   // 可读的 API 端点
    write: string[];  // 可写的 API 端点
  };
  
  // 权限要求
  permissions: Permission[];
  
  // 默认启用
  defaultEnabled: boolean;
}

export interface PluginProps {
  projectId: string;
  agentAPI: AgentAPIClient;
  onDataChange?: (data: any) => void;
}

export type Permission = 
  | 'project:read' 
  | 'project:write' 
  | 'git:read' 
  | 'git:write'
  | 'schema:read'
  | 'schema:write';
```

---

## 3. 官方插件定义

### 3.1 插件注册表

```typescript
// features/project/plugins/registry.ts
import { WebHomePlugin } from './web-home/WebHomePlugin';
import { DevToolsPlugin } from './devtools/DevToolsPlugin';
import { OKRPlanProgressPlugin } from './okr-plan-progress/OKRPlanProgressPlugin';

export const OFFICIAL_PLUGINS: PluginDefinition[] = [
  {
    id: 'web-home',
    name: 'Web 主页',
    description: '项目的 Web 主页展示',
    type: 'official',
    renderMode: 'component',
    icon: '🏠',
    component: WebHomePlugin,
    agentAPI: {
      read: ['/api/projects/:projectId/home'],
      write: ['/api/projects/:projectId/home/update'],
    },
    permissions: ['project:read', 'project:write'],
    defaultEnabled: true,
  },
  {
    id: 'devtools',
    name: 'DevTools',
    description: '开发工具：Schema 图、领域模型、Runtime 流程、Git 树、文件树',
    type: 'official',
    renderMode: 'component',
    icon: '🛠️',
    component: DevToolsPlugin,
    agentAPI: {
      read: [
        '/api/projects/:projectId/schema',
        '/api/projects/:projectId/domain-model',
        '/api/projects/:projectId/runtime-flow',
        '/api/projects/:projectId/git-tree',
        '/api/projects/:projectId/file-tree',
      ],
      write: [
        '/api/projects/:projectId/schema/update',
        '/api/projects/:projectId/git/commit',
        '/api/projects/:projectId/files/update',
      ],
    },
    permissions: [
      'project:read',
      'project:write',
      'git:read',
      'git:write',
      'schema:read',
      'schema:write',
    ],
    defaultEnabled: true,
  },
  {
    id: 'okr-plan-progress',
    name: 'OKR + Plan + Progress',
    description: 'OKR 目标、计划和进度跟踪',
    type: 'official',
    renderMode: 'component',
    icon: '🎯',
    component: OKRPlanProgressPlugin,
    agentAPI: {
      read: [
        '/api/projects/:projectId/okr',
        '/api/projects/:projectId/plan',
        '/api/projects/:projectId/progress',
      ],
      write: [
        '/api/projects/:projectId/okr/update',
        '/api/projects/:projectId/plan/update',
        '/api/projects/:projectId/progress/update',
      ],
    },
    permissions: ['project:read', 'project:write'],
    defaultEnabled: true,
  },
];
```

---

## 4. DevTools 插件详细设计

DevTools 是最复杂的官方插件，包含 5 种可视化功能。

### 4.1 DevTools 整体架构

```typescript
// features/project/plugins/devtools/DevToolsPlugin.tsx

export const DevToolsPlugin: React.FC<PluginProps> = ({ projectId, agentAPI }) => {
  const [activeTab, setActiveTab] = useState<DevToolsTab>('schema');

  return (
    <div className="flex h-full">
      {/* 左侧导航 */}
      <DevToolsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* 右侧内容区 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'schema' && <SchemaVisualization projectId={projectId} agentAPI={agentAPI} />}
        {activeTab === 'domain-model' && <DomainModelVisualization projectId={projectId} agentAPI={agentAPI} />}
        {activeTab === 'runtime-flow' && <RuntimeFlowVisualization projectId={projectId} agentAPI={agentAPI} />}
        {activeTab === 'git-tree' && <GitTreeVisualization projectId={projectId} agentAPI={agentAPI} />}
        {activeTab === 'file-tree' && <FileTreeVisualization projectId={projectId} agentAPI={agentAPI} />}
      </div>
    </div>
  );
};

type DevToolsTab = 'schema' | 'domain-model' | 'runtime-flow' | 'git-tree' | 'file-tree';
```

### 4.2 Schema 可视化（数据库 Schema 图）

**功能**：
- 显示数据库表结构
- 表之间的关系（外键、一对多、多对多）
- 支持缩放、拖拽、搜索
- Agent 可以查询 Schema、修改表结构

**技术方案**：
- 使用 **ReactFlow** 或 **Cytoscape.js** 渲染图表
- 节点：数据库表
- 边：表关系（外键）

**数据结构**：
```typescript
interface SchemaNode {
  id: string;
  tableName: string;
  columns: Column[];
  position: { x: number; y: number };
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

interface SchemaEdge {
  id: string;
  source: string;  // 表名
  target: string;  // 表名
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}
```

**组件实现**：
```typescript
// features/project/plugins/devtools/schema/SchemaVisualization.tsx
import ReactFlow, { Node, Edge } from 'reactflow';

export const SchemaVisualization: React.FC<{ projectId: string; agentAPI: AgentAPIClient }> = ({
  projectId,
  agentAPI,
}) => {
  const { data: schema, isLoading } = useQuery({
    queryKey: ['project-schema', projectId],
    queryFn: () => agentAPI.read(`/api/projects/${projectId}/schema`),
  });

  const nodes: Node[] = schema?.tables.map((table) => ({
    id: table.tableName,
    type: 'schemaTable',
    data: { table },
    position: table.position,
  })) ?? [];

  const edges: Edge[] = schema?.relationships.map((rel) => ({
    id: `${rel.source}-${rel.target}`,
    source: rel.source,
    target: rel.target,
    label: rel.type,
  })) ?? [];

  return (
    <div className="h-full">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        {/* 自定义节点渲染 */}
      </ReactFlow>
    </div>
  );
};
```

### 4.3 领域模型可视化

**功能**：
- 显示领域实体（Entity）和值对象（Value Object）
- 实体之间的关系（聚合、关联）
- 支持 DDD 分层架构展示
- Agent 可以查询模型、修改实体定义

**技术方案**：
- 使用 **ReactFlow** 渲染
- 节点：领域实体
- 边：实体关系

**数据结构**：
```typescript
interface DomainEntity {
  id: string;
  name: string;
  type: 'entity' | 'value-object' | 'aggregate-root';
  properties: Property[];
  methods: Method[];
  position: { x: number; y: number };
}

interface Property {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
}

interface DomainRelationship {
  id: string;
  source: string;
  target: string;
  type: 'association' | 'aggregation' | 'composition' | 'inheritance';
}
```

### 4.4 Runtime 流程可视化

**功能**：
- 显示 Agent 执行流程
- 显示 API 调用链路
- 显示异步任务流程
- 支持实时更新（Agent 执行时动态显示）
- Agent 可以查询流程、触发执行

**技术方案**：
- 使用 **ReactFlow** 渲染流程图
- 节点：执行步骤
- 边：执行顺序
- WebSocket 实时更新执行状态

**数据结构**：
```typescript
interface RuntimeFlowNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'end';
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  position: { x: number; y: number };
}

interface RuntimeFlowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}
```

**实时更新**：
```typescript
// WebSocket 监听 Runtime 状态变化
useEffect(() => {
  const unsubscribe = websocket.subscribe(
    `project:${projectId}:runtime-flow`,
    (update: RuntimeFlowUpdate) => {
      queryClient.setQueryData(['runtime-flow', projectId], (old) => ({
        ...old,
        nodes: old.nodes.map((node) =>
          node.id === update.nodeId ? { ...node, status: update.status } : node
        ),
      }));
    }
  );
  return unsubscribe;
}, [projectId]);
```

### 4.5 Git 树可视化

**功能**：
- 显示 Git 提交历史（树状结构）
- 显示分支、标签
- 支持查看 Commit 详情、Diff
- Agent 可以查询 Git 历史、创建 Commit

**技术方案**：
- 使用 **react-git-graph** 或自定义 SVG 渲染
- 节点：Commit
- 边：父子关系

**数据结构**：
```typescript
interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
  branches: string[];
  tags: string[];
}

interface GitBranch {
  name: string;
  head: string;  // commit SHA
  upstream?: string;
}
```

### 4.6 文件树可视化

**功能**：
- 显示项目文件树
- 支持展开/折叠目录
- 支持搜索文件
- 支持查看文件内容、编辑文件
- Agent 可以查询文件树、读写文件

**技术方案**：
- 使用 **react-arborist** 或 **rc-tree** 渲染树形结构
- 虚拟滚动（处理大型项目）

**数据结构**：
```typescript
interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileTreeNode[];
}
```

**组件实现**：
```typescript
// features/project/plugins/devtools/file-tree/FileTreeVisualization.tsx
import { Tree } from 'react-arborist';

export const FileTreeVisualization: React.FC<{ projectId: string; agentAPI: AgentAPIClient }> = ({
  projectId,
  agentAPI,
}) => {
  const { data: fileTree } = useQuery({
    queryKey: ['file-tree', projectId],
    queryFn: () => agentAPI.read(`/api/projects/${projectId}/file-tree`),
  });

  const handleFileClick = async (node: FileTreeNode) => {
    if (node.type === 'file') {
      const content = await agentAPI.read(`/api/projects/${projectId}/files/${node.path}`);
      // 显示文件内容
    }
  };

  return (
    <div className="h-full">
      <Tree
        data={fileTree}
        onSelect={handleFileClick}
        renderNode={({ node }) => (
          <div className="flex items-center gap-2">
            {node.type === 'directory' ? '📁' : '📄'}
            <span>{node.name}</span>
          </div>
        )}
      />
    </div>
  );
};
```

---

## 5. Agent 操作接口设计

### 5.1 AgentAPIClient

```typescript
// features/project/plugins/agent-api/AgentAPIClient.ts

export class AgentAPIClient {
  constructor(
    private projectId: string,
    private permissions: Permission[]
  ) {}

  // 读取数据
  async read<T>(endpoint: string): Promise<T> {
    this.checkPermission(endpoint, 'read');
    const response = await apiClient.get<T>(endpoint);
    return response.data;
  }

  // 写入数据
  async write<T>(endpoint: string, data: any): Promise<T> {
    this.checkPermission(endpoint, 'write');
    const response = await apiClient.post<T>(endpoint, data);
    return response.data;
  }

  // 权限检查
  private checkPermission(endpoint: string, operation: 'read' | 'write') {
    const plugin = OFFICIAL_PLUGINS.find((p) =>
      p.agentAPI[operation].some((pattern) => this.matchEndpoint(endpoint, pattern))
    );

    if (!plugin) {
      throw new Error(`No plugin found for endpoint: ${endpoint}`);
    }

    const requiredPermissions = plugin.permissions;
    const hasPermission = requiredPermissions.every((perm) =>
      this.permissions.includes(perm)
    );

    if (!hasPermission) {
      throw new Error(`Missing permissions: ${requiredPermissions.join(', ')}`);
    }
  }

  private matchEndpoint(endpoint: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$'
    );
    return regex.test(endpoint);
  }
}
```

### 5.2 Agent API 端点定义

#### Schema API
```typescript
// 读取 Schema
GET /api/projects/:projectId/schema
Response: {
  tables: SchemaNode[];
  relationships: SchemaEdge[];
}

// 更新 Schema
POST /api/projects/:projectId/schema/update
Request: {
  tableName: string;
  columns: Column[];
}
```

#### 领域模型 API
```typescript
// 读取领域模型
GET /api/projects/:projectId/domain-model
Response: {
  entities: DomainEntity[];
  relationships: DomainRelationship[];
}

// 更新实体
POST /api/projects/:projectId/domain-model/update
Request: {
  entityName: string;
  properties: Property[];
}
```

#### Runtime 流程 API
```typescript
// 读取 Runtime 流程
GET /api/projects/:projectId/runtime-flow
Response: {
  nodes: RuntimeFlowNode[];
  edges: RuntimeFlowEdge[];
}

// 触发执行
POST /api/projects/:projectId/runtime-flow/execute
Request: {
  flowId: string;
  params: Record<string, any>;
}
```

#### Git API
```typescript
// 读取 Git 树
GET /api/projects/:projectId/git-tree
Response: {
  commits: GitCommit[];
  branches: GitBranch[];
}

// 创建 Commit
POST /api/projects/:projectId/git/commit
Request: {
  message: string;
  files: string[];
}
```

#### 文件树 API
```typescript
// 读取文件树
GET /api/projects/:projectId/file-tree
Response: FileTreeNode

// 读取文件内容
GET /api/projects/:projectId/files/:path
Response: {
  content: string;
  encoding: string;
}

// 更新文件
POST /api/projects/:projectId/files/update
Request: {
  path: string;
  content: string;
}
```

---

## 6. 插件容器和渲染器

### 6.1 PluginContainer

```typescript
// features/project/components/PluginContainer.tsx

export const PluginContainer: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [activePluginId, setActivePluginId] = useState('devtools');
  const { permissions } = useUserPermissions();

  const activePlugin = OFFICIAL_PLUGINS.find((p) => p.id === activePluginId);

  return (
    <div className="flex h-full">
      {/* 插件选择器 */}
      <PluginSelector
        plugins={OFFICIAL_PLUGINS}
        activePluginId={activePluginId}
        onSelect={setActivePluginId}
      />

      {/* 插件渲染器 */}
      <div className="flex-1">
        {activePlugin && (
          <PluginRenderer
            plugin={activePlugin}
            projectId={projectId}
            permissions={permissions}
          />
        )}
      </div>
    </div>
  );
};
```

### 6.2 PluginRenderer

```typescript
// features/project/components/PluginRenderer.tsx

export const PluginRenderer: React.FC<{
  plugin: PluginDefinition;
  projectId: string;
  permissions: Permission[];
}> = ({ plugin, projectId, permissions }) => {
  const agentAPI = useMemo(
    () => new AgentAPIClient(projectId, permissions),
    [projectId, permissions]
  );

  if (plugin.renderMode === 'component' && plugin.component) {
    const PluginComponent = plugin.component;
    return <PluginComponent projectId={projectId} agentAPI={agentAPI} />;
  }

  if (plugin.renderMode === 'iframe' && plugin.iframeUrl) {
    return (
      <iframe
        src={plugin.iframeUrl}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }

  return <div>Invalid plugin configuration</div>;
};
```

---

## 7. 实时数据更新

### 7.1 WebSocket 订阅

```typescript
// features/project/hooks/usePluginRealtimeData.ts

export const usePluginRealtimeData = (projectId: string, dataType: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = websocket.subscribe(
      `project:${projectId}:${dataType}`,
      (update: any) => {
        queryClient.setQueryData([dataType, projectId], update);
      }
    );

    return unsubscribe;
  }, [projectId, dataType]);
};
```

### 7.2 乐观更新

```typescript
// Agent 修改数据时，前端立即更新 UI，然后等待服务器确认
const mutation = useMutation({
  mutationFn: (data) => agentAPI.write('/api/projects/:projectId/schema/update', data),
  onMutate: async (newData) => {
    // 取消正在进行的查询
    await queryClient.cancelQueries(['project-schema', projectId]);

    // 保存旧数据
    const previousData = queryClient.getQueryData(['project-schema', projectId]);

    // 乐观更新
    queryClient.setQueryData(['project-schema', projectId], (old) => ({
      ...old,
      ...newData,
    }));

    return { previousData };
  },
  onError: (err, newData, context) => {
    // 回滚
    queryClient.setQueryData(['project-schema', projectId], context.previousData);
  },
  onSettled: () => {
    // 重新获取数据
    queryClient.invalidateQueries(['project-schema', projectId]);
  },
});
```

---

## 8. 实施计划

### Phase 1: 插件系统基础（3-4 天）
- [ ] 定义插件类型和接口
- [ ] 实现 PluginContainer 和 PluginRenderer
- [ ] 实现 AgentAPIClient
- [ ] 实现插件注册表
- [ ] 集成到 ProjectPage

### Phase 2: DevTools - Schema 和领域模型（4-5 天）
- [ ] 实现 Schema 可视化（ReactFlow）
- [ ] 实现领域模型可视化
- [ ] 实现 Schema API 集成
- [ ] 实现实时更新

### Phase 3: DevTools - Runtime 和 Git（4-5 天）
- [ ] 实现 Runtime 流程可视化
- [ ] 实现 Git 树可视化
- [ ] 实现 WebSocket 实时更新
- [ ] 实现 Git API 集成

### Phase 4: DevTools - 文件树（2-3 天）
- [ ] 实现文件树可视化
- [ ] 实现文件内容查看
- [ ] 实现文件编辑功能

### Phase 5: 其他官方插件（3-4 天）
- [ ] 实现 Web 主页插件
- [ ] 实现 OKR+Plan+Progress 插件

**总工作量**：16-21 天

---

## 9. 后端 API 需求

### 9.1 Schema API
```
GET  /api/projects/:projectId/schema
POST /api/projects/:projectId/schema/update
```

### 9.2 领域模型 API
```
GET  /api/projects/:projectId/domain-model
POST /api/projects/:projectId/domain-model/update
```

### 9.3 Runtime 流程 API
```
GET  /api/projects/:projectId/runtime-flow
POST /api/projects/:projectId/runtime-flow/execute
WebSocket: project:${projectId}:runtime-flow
```

### 9.4 Git API
```
GET  /api/projects/:projectId/git-tree
POST /api/projects/:projectId/git/commit
```

### 9.5 文件树 API
```
GET  /api/projects/:projectId/file-tree
GET  /api/projects/:projectId/files/:path
POST /api/projects/:projectId/files/update
```

### 9.6 权限 API
```
GET /api/users/:userId/permissions
```

---

## 10. 技术栈

- **图表渲染**：ReactFlow（流程图、Schema 图、领域模型）
- **树形结构**：react-arborist（文件树）
- **Git 可视化**：react-git-graph 或自定义 SVG
- **状态管理**：Zustand + React Query
- **实时通信**：WebSocket
- **权限控制**：自定义 AgentAPIClient
