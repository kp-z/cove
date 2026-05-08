# Presentation Layer (表现层)

> **版本**: v4.0  
> **日期**: 2026-05-05  
> **关键词**: `React`, `TypeScript`, `Zustand`, `React Query`, `WebSocket`, `Tailwind CSS`, `虚拟滚动`, `代码分割`, `懒加载`, `性能优化`, `测试策略`, `Vitest`, `Playwright`, `MSW`, `Chat组件`, `Task卡片`, `AgentBar`, `OKR看板`, `工作流图`

**本文档包含**:
- Frontend 层的完整架构设计（React + TypeScript + Tailwind CSS）
- 7 个核心页面的组件设计（Dashboard、Chat、Project、OKR、Workflow、Agent、Settings）
- Chat 组件的 8 个子功能详细设计（Tab 切换、AgentBar、Task 卡片、时间流、消息气泡、交互按钮、工具栏、@/搜索）
- 状态管理的三层优先级（WebSocket > React Query > Zustand）
- 性能优化方案（虚拟滚动、代码分割、React Query 缓存、懒加载）
- 测试策略（Vitest 单元测试、Playwright E2E、MSW Mock、覆盖率 80%+）
- TypeScript 类型定义（APIResponse<T>、Agent、Message、Task）
- Cursor-based 分页实现（useMessages Hook）
- APIClient + 重试机制 + 错误分类
- usePermission Hook + UI 权限控制

**适用场景**:
- 需要了解某个页面或组件的设计
- 查找状态管理的实现方案
- 理解性能优化的具体措施
- 设计测试用例或 Mock 数据
- 实现 Chat 交互或 Task 卡片功能
- 处理 WebSocket 实时推送
- 实现权限控制或错误处理

**相关文档**:
- [API Integration](./01-api-integration.md) - Backend Service ↔ Frontend Hook 映射表
- [Feature Call Flows](./02-feature-flows.md) - 核心功能的完整调用流程
- [State Export/Import UI](./03-state-export-import-ui.md) - Agent 状态导出导入 UI 设计
- [Feishu Integration](./04-feishu-integration-ui.md) - 飞书集成前端适配
- [Feature Domain Organization](./05-feature-domain-organization.md) - 功能域组织规范（代码结构、通信机制、最佳实践）
- [Backend API](../../backend/03-infrastructure/04-backend-api.md) - 后端 API 完整设计
- [Domain Layer](../../backend/01-domain/models/README.md) - 实体定义

---

## 四、Frontend（表现层）

Frontend 层负责用户界面、交互逻辑、实时通信。采用 **React + TypeScript + Tailwind CSS** 技术栈。

**设计原则**：
1. **明确 Entity-API-State 映射**：每个组件都清楚地知道操作哪个 Entity，调用哪个 API
2. **区分相似 UI 的不同上下文**：Channel Message、DM Message、Discussion Message 虽然 UI 相似，但操作的实体和 API 不同
3. **统一的状态管理**：使用 Zustand（全局状态）+ React Query（服务端状态）+ WebSocket（实时通信）
4. **乐观更新 + 错误回滚**：提升用户体验，同时保证数据一致性

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         App Shell                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TopBar       │  │ Sidebar      │  │ MainContent  │      │
│  │ (导航栏)      │  │ (侧边栏)      │  │ (主内容区)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Page Components                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ProjectPage  │  │ OKRPage      │  │ ChatPage     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TaskPage     │  │ WorkflowPage │  │ SettingsPage │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Feature Components                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ OKRBoard     │  │ TaskBoard    │  │ ChatWindow   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AgentPanel   │  │ WorkflowGraph│  │ FileExplorer │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      State Management                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Zustand      │  │ React Query  │  │ WebSocket    │      │
│  │ (全局状态)    │  │ (服务端状态)  │  │ (实时通信)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.1 代码组织方式

前端代码采用**功能域（Feature Domain）**组织方式，替代传统的技术分层组织。

**核心原则**：
- **按功能域组织**：chat、task、agent、okr、feishu 等功能域独立完整
- **高内聚低耦合**：相关代码聚合在一起，通过接口和事件通信
- **渐进式增强**：支持从简单到复杂的演进路径

**目录结构**：
```
frontend/src/
├── features/              # 功能域目录
│   ├── chat/             # 聊天功能域
│   │   ├── components/   # 功能域专用组件
│   │   ├── hooks/        # 功能域专用 hooks
│   │   ├── stores/       # 功能域状态管理
│   │   ├── types/        # 功能域类型定义
│   │   ├── api/          # 功能域 API 调用
│   │   ├── utils/        # 功能域工具函数
│   │   └── constants/    # 功能域常量
│   ├── task/             # 任务功能域
│   ├── agent/            # Agent 功能域
│   ├── okr/              # OKR 功能域
│   └── feishu/           # 飞书集成功能域
│
├── shared/               # 共享资源
│   ├── components/       # 通用 UI 组件
│   ├── hooks/            # 通用 hooks
│   ├── types/            # 共享类型定义
│   └── styles/           # 全局样式
│
└── lib/                  # 工具库
    ├── api-client.ts     # HTTP 客户端
    ├── websocket-client.ts  # WebSocket 客户端
    ├── event-bus.ts      # 功能域间事件总线
    ├── logger.ts         # 日志工具
    └── error-handler.ts  # 错误处理
```

**功能域间通信**：
1. **Props 传递**（最优）：父子组件通信
2. **Event Bus**（推荐）：跨功能域事件通知
3. **全局状态**（谨慎）：真正的全局状态（用户信息、主题设置）

**详细规范**：参考 [功能域组织规范](./05-feature-domain-organization.md)

---

### 4.2 全局 Entity-API-Component 映射表

**说明**：明确每个前端组件操作的 Entity、调用的 Backend API、管理的状态

| 页面/组件 | 操作的 Entity | Backend Service | 主要 API 端点 | 状态管理 |
|---------|-------------|----------------|-------------|---------|
| **ChatPage** | ChannelEntity, MessageEntity, TaskEntity | ChannelService, MessageService, TaskService | GET /channels/:id/messages<br>POST /channels/:id/messages<br>POST /messages/:id/convert-to-task<br>POST /tasks/:id/claim | Zustand: activeChannel, openTabs<br>React Query: messages, tasks<br>WebSocket: new_message, task_updated |
| **AgentBar** | AgentEntity, ChannelEntity | AgentRuntimeService | GET /channels/:id/agents<br>GET /agents/:id/status<br>POST /agents/:id/wake<br>POST /agents/:id/sleep | React Query: channelAgents<br>WebSocket: agent_status_changed |
| **MessageBubble** | MessageEntity | MessageService | PUT /messages/:id<br>DELETE /messages/:id<br>POST /messages/:id/reactions<br>POST /messages/:id/reply | React Query: message<br>Optimistic Update |
| **TaskCard** | TaskEntity, MessageEntity | TaskService | POST /tasks/:id/claim<br>PUT /tasks/:id/status<br>POST /tasks/:id/comments | React Query: task<br>Optimistic Update |
| **OKRPage** | OKREntity, ProjectEntity | OKRService, ProjectService | GET /projects/:id/okrs<br>POST /okrs<br>PUT /okrs/:id<br>GET /okrs/:id/progress | React Query: projectOKRs<br>Zustand: selectedOKR |
| **KeyResultCard** | OKREntity (key_results), WorkflowEntity | OKRService, WorkflowService | PUT /okrs/:id/key-results/:kr_id<br>GET /key-results/:kr_id/workflows<br>POST /key-results/:kr_id/link-workflow | React Query: keyResult, workflows |
| **TaskBoard** | TaskEntity, ChannelEntity | TaskService | GET /channels/:id/tasks<br>POST /tasks<br>PUT /tasks/:id/status<br>POST /tasks/:id/claim | React Query: channelTasks<br>Zustand: taskFilters |
| **WorkflowEditor** | WorkflowEntity, ExecutionEntity | WorkflowService, ExecutionService | GET /workflows/:id<br>PUT /workflows/:id<br>POST /workflows/:id/execute<br>GET /executions/:id/logs | React Query: workflow, executions<br>Zustand: editorState |
| **AgentPanel** | AgentEntity, ExecutionEntity | AgentRuntimeService, ExecutionService | GET /agents<br>GET /agents/:id<br>POST /agents/:id/wake<br>GET /agents/:id/executions | React Query: agents, agentExecutions |
| **ProjectPage** | ProjectEntity, OKREntity | ProjectService, OKRService | GET /projects<br>GET /projects/:id<br>PUT /projects/:id<br>GET /projects/:id/okrs | React Query: projects, projectDetail |

---

### 4.3 核心页面组件

#### 4.3.1 ChatPage（聊天页面）

**职责**: 频道聊天、DM、线程、任务管理

**操作的 Entity**:
- **ChannelEntity**: 频道信息、成员列表
- **MessageEntity**: 消息内容、附件、引用
- **TaskEntity**: 任务元数据（当消息是任务时）
- **AgentEntity**: Agent 状态、能力

**调用的 API**:
- `GET /channels/:channelId/messages?limit=50&before=:cursor` - 获取消息列表（分页）
- `POST /channels/:channelId/messages` - 发送消息
- `PUT /messages/:messageId` - 编辑消息
- `DELETE /messages/:messageId` - 删除消息
- `POST /messages/:messageId/reactions` - 添加 Reaction
- `POST /messages/:messageId/convert-to-task` - 转换为任务
- `GET /channels/:channelId/agents` - 获取频道内的 Agent 列表
- `POST /tasks/:taskId/claim` - 认领任务
- `PUT /tasks/:taskId/status` - 更新任务状态

**状态管理**:
- **Zustand (全局状态)**:
  - `activeChannelId`: 当前激活的频道 ID
  - `openTabs`: 打开的 Tab 列表（Channel/DM/Discussion）
  - `activeTabId`: 当前激活的 Tab ID
- **React Query (服务端状态)**:
  - `useMessages(channelId)`: 消息列表（支持分页、缓存）
  - `useChannelAgents(channelId)`: 频道内的 Agent 列表
  - `useTasks(channelId)`: 任务列表
- **WebSocket (实时通信)**:
  - `new_message`: 新消息到达
  - `message_updated`: 消息更新
  - `message_deleted`: 消息删除
  - `task_updated`: 任务状态更新
  - `agent_status_changed`: Agent 状态变化

**UI 相似但操作不同的场景**:

| 场景 | Entity | API 端点 | 区别 |
|-----|--------|---------|-----|
| Channel 消息 | MessageEntity (channel_id) | POST /channels/:channelId/messages | target 是 channel_id |
| DM 消息 | MessageEntity (dm_channel_id) | POST /channels/:dmChannelId/messages | target 是 dm_channel_id（特殊的 Channel） |
| Discussion 消息 | MessageEntity (discussion_id) | POST /discussions/:discussionId/messages | target 是 discussion_id，创建或回复 discussion |

**8 个核心子功能**:

1. **Tab 切换区（Channel/DM/Discussion Tabs）**
   - 显示当前打开的频道、DM、线程
   - 支持拖拽排序、关闭 tab
   - 未读消息数量提示

2. **Agent Bar（Agent 状态栏）**
   - 显示频道内所有 Agent 的实时状态
   - 状态指示器：🟢 active | 🟡 idle | 🔴 sleeping | ⚫ terminated
   - 点击 Agent 可查看详细信息或发起 DM
   - **多 Agent 功能**：
     - 批量唤醒/休眠 Agent
     - 快速切换到 Agent DM
     - 查看 Agent 当前执行的任务
     - 监控 Agent 资源使用（Token、Cost）
     - Agent 分组显示（按角色、状态）

3. **Task 卡片（Task Card）**
   - 任务消息以卡片形式展示
   - 显示任务编号、标题、状态、优先级、认领者
   - 支持快速操作：认领、更新状态、添加评论

4. **时间流（Timeline）**
   - 按时间顺序展示消息
   - 支持日期分隔线
   - 支持虚拟滚动（处理大量消息）

5. **消息气泡（Message Bubble）**
   - 区分人类消息和 Agent 消息（不同样式）
   - 支持 Markdown 渲染
   - 支持代码高亮、图片预览、文件附件
   - @mention 高亮显示

6. **交互按钮（Action Buttons）**
   - 回复（创建 discussion）
   - 添加 Reaction（emoji 反应）
   - 编辑/删除消息
   - 转换为任务
   - 复制消息链接

7. **工具栏（Toolbar）**
   - 消息输入框（支持 Markdown）
   - 文件上传按钮
   - Emoji 选择器
   - @mention 自动补全
   - 发送按钮

8. **@/搜索（Mention & Search）**
   - @mention 自动补全（Agent 和 User）
   - #channel 引用自动补全
   - task #N 引用自动补全
   - 全局搜索（Ctrl+K）

**组件结构**:

```tsx
// frontend/src/pages/ChatPage.tsx

export const ChatPage: React.FC = () => {
  const { activeChannelId } = useChannelStore();
  const { messages, sendMessage } = useMessages(activeChannelId);
  const { agents } = useAgents(activeChannelId);
  
  return (
    <div className="flex h-screen">
      {/* 左侧：频道列表 */}
      <ChannelSidebar />
      
      {/* 中间：聊天主区域 */}
      <div className="flex-1 flex flex-col">
        {/* 1. Tab 切换区 */}
        <ChannelTabs />
        
        {/* 2. Agent Bar */}
        <AgentBar agents={agents} />
        
        {/* 3-5. 消息时间流 */}
        <MessageTimeline messages={messages} />
        
        {/* 7. 工具栏 */}
        <MessageToolbar onSend={sendMessage} />
      </div>
      
      {/* 右侧：详情面板 */}
      <DetailPanel />
    </div>
  );
};
```

**子组件详细设计**:

```tsx
// 1. Tab 切换区
const ChannelTabs: React.FC = () => {
  const { openTabs, activeTab, closeTab, switchTab } = useTabStore();
  
  return (
    <div className="flex border-b overflow-x-auto">
      {openTabs.map(tab => (
        <Tab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTab}
          onClose={() => closeTab(tab.id)}
          onClick={() => switchTab(tab.id)}
        />
      ))}
    </div>
  );
};

// 2. Agent Bar（多 Agent 功能）
const AgentBar: React.FC<{ agents: Agent[] }> = ({ agents }) => {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'status' | 'role'>('status');
  const { wakeAgent, sleepAgent } = useAgentActions();
  
  // 按状态或角色分组
  const groupedAgents = useMemo(() => {
    if (groupBy === 'status') {
      return groupBy(agents, 'status');
    }
    return groupBy(agents, 'meta.category');
  }, [agents, groupBy]);
  
  // 批量操作
  const handleBatchWake = () => {
    selectedAgents.forEach(agentId => wakeAgent(agentId));
    setSelectedAgents([]);
  };
  
  const handleBatchSleep = () => {
    selectedAgents.forEach(agentId => sleepAgent(agentId));
    setSelectedAgents([]);
  };
  
  return (
    <div className="flex flex-col border-b bg-gray-50">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Agents ({agents.length}):</span>
          
          {/* 分组切换 */}
          <select 
            value={groupBy} 
            onChange={(e) => setGroupBy(e.target.value as 'status' | 'role')}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="status">By Status</option>
            <option value="role">By Role</option>
          </select>
        </div>
        
        {/* 批量操作按钮 */}
        {selectedAgents.length > 0 && (
          <div className="flex gap-2">
            <button 
              onClick={handleBatchWake}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Wake ({selectedAgents.length})
            </button>
            <button 
              onClick={handleBatchSleep}
              className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Sleep ({selectedAgents.length})
            </button>
            <button 
              onClick={() => setSelectedAgents([])}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      
      {/* Agent 列表 */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {Object.entries(groupedAgents).map(([group, groupAgents]) => (
          <div key={group} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">{group}:</span>
            {groupAgents.map(agent => (
              <AgentStatusBadge
                key={agent.agent_id}
                agent={agent}
                selected={selectedAgents.includes(agent.agent_id)}
                onSelect={(selected) => {
                  if (selected) {
                    setSelectedAgents([...selectedAgents, agent.agent_id]);
                  } else {
                    setSelectedAgents(selectedAgents.filter(id => id !== agent.agent_id));
                  }
                }}
                onClick={() => openAgentDetail(agent)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const AgentStatusBadge: React.FC<{ 
  agent: Agent; 
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
}> = ({ agent, selected, onSelect, onClick }) => {
  const statusIcon = {
    active: '🟢',
    idle: '🟡',
    sleeping: '🔴',
    terminated: '⚫'
  }[agent.status];
  
  // 获取 Agent 当前任务
  const { data: currentTask } = useQuery({
    queryKey: ['agent-current-task', agent.agent_id],
    queryFn: () => api.getAgentCurrentTask(agent.agent_id),
    enabled: agent.status === 'active'
  });
  
  return (
    <div 
      className={`
        flex items-center gap-1 px-2 py-1 rounded border cursor-pointer
        ${selected ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-gray-100'}
      `}
      onClick={(e) => {
        if (e.shiftKey) {
          // Shift + Click 选择
          onSelect(!selected);
        } else {
          // 普通点击打开详情
          onClick();
        }
      }}
    >
      {/* 选择框 */}
      <input 
        type="checkbox" 
        checked={selected}
        onChange={(e) => {
          e.stopPropagation();
          onSelect(e.target.checked);
        }}
        className="w-3 h-3"
      />
      
      {/* 状态图标 */}
      <span>{statusIcon}</span>
      
      {/* Agent 名称 */}
      <span className="text-sm font-medium">{agent.name}</span>
      
      {/* 当前任务提示 */}
      {currentTask && (
        <span className="text-xs text-gray-500 truncate max-w-[100px]">
          #{currentTask.task_number}
        </span>
      )}
      
      {/* 资源使用提示 */}
      {agent.status === 'active' && (
        <span className="text-xs text-gray-400">
          ${agent.cost_today?.toFixed(2)}
        </span>
      )}
    </div>
  );
};

// Agent 详情弹窗
const AgentDetailModal: React.FC<{ agent: Agent; onClose: () => void }> = ({ agent, onClose }) => {
  const { data: executions } = useQuery({
    queryKey: ['agent-executions', agent.agent_id],
    queryFn: () => api.getAgentExecutions(agent.agent_id)
  });
  
  const { wakeAgent, sleepAgent } = useAgentActions();
  
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">{agent.display_name}</h2>
        
        {/* 基础信息 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-sm text-gray-600">Status:</span>
            <span className="ml-2 font-semibold">{agent.status}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Framework:</span>
            <span className="ml-2">{agent.framework}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Cost Today:</span>
            <span className="ml-2">${agent.cost_today?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Cost Limit:</span>
            <span className="ml-2">${agent.meta.cost_limit_usd}</span>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => wakeAgent(agent.agent_id)}
            disabled={agent.status === 'active'}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Wake
          </button>
          <button 
            onClick={() => sleepAgent(agent.agent_id)}
            disabled={agent.status === 'sleeping'}
            className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50"
          >
            Sleep
          </button>
          <button 
            onClick={() => openDM(agent)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Send DM
          </button>
        </div>
        
        {/* 最近执行 */}
        <div>
          <h3 className="font-semibold mb-2">Recent Executions</h3>
          <div className="space-y-2">
            {executions?.map(exec => (
              <div key={exec.execution_id} className="border rounded p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono">{exec.execution_id.slice(0, 8)}</span>
                  <span className="text-gray-600">{formatTime(exec.started_at)}</span>
                </div>
                <div className="text-gray-700">{exec.workflow_name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// 3. Task 卡片
const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const { claimTask, updateTaskStatus } = useTaskActions();
  
  return (
    <div className="border rounded-lg p-4 bg-blue-50 my-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-600">#{task.task_number}</span>
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <TaskActions task={task} />
      </div>
      
      <h3 className="font-semibold mb-2">{task.title}</h3>
      
      {task.description && (
        <p className="text-sm text-gray-700 mb-2">{task.description}</p>
      )}
      
      {task.assignee ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Assigned to:</span>
          <UserAvatar user={task.assignee} size="sm" />
          <span>{task.assignee.assignee_name}</span>
        </div>
      ) : (
        <button
          onClick={() => claimTask(task.task_id)}
          className="text-sm text-blue-600 hover:underline"
        >
          Claim this task
        </button>
      )}
    </div>
  );
};

// 4. 时间流
const MessageTimeline: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100
  });
  
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={message.message_id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {message.task_metadata ? (
                <TaskCard task={message.task_metadata} />
              ) : (
                <MessageBubble message={message} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 5. 消息气泡
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAgent = message.sender_type === 'agent';
  
  return (
    <div className={`flex gap-3 py-2 hover:bg-gray-50 ${isAgent ? 'bg-blue-50' : ''}`}>
      <UserAvatar user={message.sender} />
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{message.sender.name}</span>
          {isAgent && <span className="text-xs bg-blue-200 px-2 py-0.5 rounded">Agent</span>}
          <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
        </div>
        
        <MessageContent content={message.content} />
        
        {message.attachments.length > 0 && (
          <AttachmentList attachments={message.attachments} />
        )}
        
        <MessageActions message={message} />
      </div>
    </div>
  );
};

// 6. 交互按钮
const MessageActions: React.FC<{ message: Message }> = ({ message }) => {
  return (
    <div className="flex gap-2 mt-2">
      <ActionButton icon="💬" label="Reply" onClick={() => replyToMessage(message)} />
      <ActionButton icon="😊" label="React" onClick={() => addReaction(message)} />
      <ActionButton icon="📋" label="Convert to Task" onClick={() => convertToTask(message)} />
      <ActionButton icon="🔗" label="Copy Link" onClick={() => copyMessageLink(message)} />
    </div>
  );
};

// 7. 工具栏
const MessageToolbar: React.FC<{ onSend: (content: string) => void }> = ({ onSend }) => {
  const [content, setContent] = useState('');
  const { showMentionSuggestions, mentionSuggestions } = useMentionAutocomplete(content);
  
  return (
    <div className="border-t p-4">
      {showMentionSuggestions && (
        <MentionSuggestions suggestions={mentionSuggestions} />
      )}
      
      <div className="flex gap-2">
        <FileUploadButton />
        <EmojiPickerButton />
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message... (@mention, #channel, task #N)"
          className="flex-1 border rounded px-3 py-2 resize-none"
          rows={3}
        />
        
        <button
          onClick={() => {
            onSend(content);
            setContent('');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// 8. @/搜索
const MentionAutocomplete: React.FC = () => {
  const { query, suggestions, selectSuggestion } = useMentionAutocomplete();
  
  if (!suggestions.length) return null;
  
  return (
    <div className="absolute bottom-full mb-2 bg-white border rounded shadow-lg">
      {suggestions.map(suggestion => (
        <div
          key={suggestion.id}
          onClick={() => selectSuggestion(suggestion)}
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Avatar src={suggestion.avatar} size="sm" />
            <div>
              <div className="font-semibold">{suggestion.name}</div>
              <div className="text-xs text-gray-500">{suggestion.type}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

#### 4.3.0 AgentBar 完整设计（P0）

##### 4.3.0.1 资源监控功能

**监控指标**：
1. **CPU 使用率**：Agent 进程的 CPU 占用百分比
2. **内存使用**：Agent 进程的内存占用（MB）
3. **Token 使用量**：当前会话的 Token 消耗
4. **成本统计**：累计 API 调用成本（USD）
5. **执行时间**：当前任务的执行时长

**实现代码**：

```tsx
// components/AgentResourceMonitor.tsx
export const AgentResourceMonitor: React.FC<{ agent: Agent }> = ({ agent }) => {
  // 实时监控数据（通过 WebSocket 推送）
  const { data: metrics } = useQuery({
    queryKey: ['agent-metrics', agent.agent_id],
    queryFn: () => api.getAgentMetrics(agent.agent_id),
    refetchInterval: 5000 // 每 5 秒刷新一次
  });
  
  // 监听 WebSocket 实时更新
  useEffect(() => {
    const unsubscribe = websocket.subscribe(`agent:${agent.agent_id}:metrics`, (update) => {
      queryClient.setQueryData(['agent-metrics', agent.agent_id], update);
    });
    
    return unsubscribe;
  }, [agent.agent_id]);
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* CPU 使用率 */}
      <MetricCard
        label="CPU"
        value={`${metrics?.cpu_percent || 0}%`}
        status={metrics?.cpu_percent > 80 ? 'warning' : 'normal'}
        icon="🖥️"
      />
      
      {/* 内存使用 */}
      <MetricCard
        label="Memory"
        value={`${metrics?.memory_mb || 0} MB`}
        status={metrics?.memory_mb > 1024 ? 'warning' : 'normal'}
        icon="💾"
      />
      
      {/* Token 使用量 */}
      <MetricCard
        label="Tokens"
        value={`${metrics?.total_tokens || 0}`}
        subtitle={`Input: ${metrics?.input_tokens || 0} / Output: ${metrics?.output_tokens || 0}`}
        icon="🔢"
      />
      
      {/* 成本统计 */}
      <MetricCard
        label="Cost"
        value={`$${metrics?.cost_usd?.toFixed(4) || 0}`}
        status={metrics?.cost_usd > agent.meta.cost_limit_usd ? 'error' : 'normal'}
        icon="💰"
      />
      
      {/* 执行时间 */}
      <MetricCard
        label="Execution Time"
        value={formatDuration(metrics?.execution_time_seconds || 0)}
        icon="⏱️"
      />
      
      {/* 任务完成数 */}
      <MetricCard
        label="Tasks Completed"
        value={`${metrics?.tasks_completed || 0}`}
        icon="✅"
      />
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  subtitle?: string;
  status?: 'normal' | 'warning' | 'error';
  icon: string;
}> = ({ label, value, subtitle, status = 'normal', icon }) => {
  const statusColors = {
    normal: 'border-gray-300',
    warning: 'border-yellow-500 bg-yellow-50',
    error: 'border-red-500 bg-red-50'
  };
  
  return (
    <div className={`border rounded p-3 ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};
```

##### 4.3.0.2 批量操作确认流程

**场景**：用户选择多个 Agent 进行批量唤醒/休眠时，需要确认操作

```tsx
// components/BatchOperationConfirm.tsx
export const BatchOperationConfirm: React.FC<{
  operation: 'wake' | 'sleep';
  agents: Agent[];
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ operation, agents, onConfirm, onCancel }) => {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast.success(`Successfully ${operation === 'wake' ? 'woke' : 'put to sleep'} ${agents.length} agents`);
    } catch (error) {
      toast.error(`Failed to ${operation} agents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open>
      <DialogTitle>
        {operation === 'wake' ? '唤醒' : '休眠'} {agents.length} 个 Agent
      </DialogTitle>
      <DialogContent>
        <p className="mb-4">
          确定要{operation === 'wake' ? '唤醒' : '休眠'}以下 Agent 吗？
        </p>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {agents.map(agent => (
            <div key={agent.agent_id} className="flex items-center gap-2 p-2 border rounded">
              <Avatar src={agent.avatar} size="sm" />
              <div className="flex-1">
                <div className="font-semibold">{agent.display_name}</div>
                <div className="text-xs text-gray-500">
                  {agent.status} • {agent.meta.category}
                </div>
              </div>
              <AgentStatusBadge status={agent.status} />
            </div>
          ))}
        </div>
        
        {operation === 'wake' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ 唤醒多个 Agent 可能会消耗大量资源，请确保系统有足够的容量。
            </p>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="primary" 
          loading={loading}
        >
          确认{operation === 'wake' ? '唤醒' : '休眠'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

##### 4.3.0.3 AgentBar 性能优化

**问题**：当 Agent 数量超过 50 个时，AgentBar 渲染性能下降

**解决方案**：

1. **虚拟滚动**：只渲染可见区域的 Agent

```tsx
// components/AgentBar.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const AgentBar: React.FC<{ agents: Agent[] }> = ({ agents }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // 虚拟滚动（横向）
  const virtualizer = useVirtualizer({
    count: agents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 每个 Agent Badge 宽度约 80px
    horizontal: true
  });
  
  return (
    <div ref={parentRef} className="flex overflow-x-auto">
      <div style={{ width: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => {
          const agent = agents[virtualItem.index];
          return (
            <div
              key={agent.agent_id}
              style={{
                position: 'absolute',
                left: 0,
                transform: `translateX(${virtualItem.start}px)`
              }}
            >
              <AgentStatusBadge agent={agent} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

2. **React.memo 优化**：避免不必要的重新渲染

```tsx
export const AgentStatusBadge = React.memo<{ agent: Agent }>(({ agent }) => {
  // ... 组件实现
}, (prevProps, nextProps) => {
  // 只有 agent 的关键属性变化时才重新渲染
  return (
    prevProps.agent.agent_id === nextProps.agent.agent_id &&
    prevProps.agent.status === nextProps.agent.status &&
    prevProps.agent.meta.cpu_percent === nextProps.agent.meta.cpu_percent
  );
});
```

3. **防抖更新**：避免频繁的状态更新

```tsx
// hooks/useAgentMetrics.ts
export const useAgentMetrics = (agentId: string) => {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  
  // 防抖更新（500ms）
  const debouncedSetMetrics = useMemo(
    () => debounce(setMetrics, 500),
    []
  );
  
  useEffect(() => {
    const unsubscribe = websocket.subscribe(`agent:${agentId}:metrics`, (update) => {
      debouncedSetMetrics(update);
    });
    
    return () => {
      unsubscribe();
      debouncedSetMetrics.cancel();
    };
  }, [agentId]);
  
  return metrics;
};
```

---

#### 4.3.1.1 ChatPage 完整交互流程设计

**核心交互场景**：

##### 场景 1：AgentBar 添加 Agent → 自动切换到 Agent DM

```tsx
// hooks/useAgentDM.ts
export const useAgentDM = () => {
  const { openTab, setActiveTab } = useTabStore();
  const queryClient = useQueryClient();
  
  // 打开或切换到 Agent DM
  const openAgentDM = async (agent: Agent) => {
    // 1. 检查是否已有 DM Channel
    let dmChannel = await api.get(`/dms/with-agent/${agent.agent_id}`);
    
    // 2. 如果没有，自动创建 DM Channel
    if (!dmChannel) {
      dmChannel = await api.post('/dms/create', {
        participant_ids: [currentUser.user_id, agent.agent_id],
        type: 'dm'
      });
      
      // 更新 Channel 列表缓存
      queryClient.invalidateQueries(['channels']);
    }
    
    // 3. 打开 Tab（如果已存在则切换）
    const existingTab = openTabs.find(tab => tab.channelId === dmChannel.channel_id);
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      const newTab = {
        id: `dm-${dmChannel.channel_id}`,
        type: 'dm',
        channelId: dmChannel.channel_id,
        title: `DM: ${agent.display_name}`,
        icon: agent.avatar
      };
      openTab(newTab);
      setActiveTab(newTab.id);
    }
    
    // 4. 加载 DM 历史消息
    queryClient.prefetchQuery(['messages', dmChannel.channel_id], () =>
      api.get(`/channels/${dmChannel.channel_id}/messages`)
    );
  };
  
  return { openAgentDM };
};

// AgentBar 中的使用
const AgentBadge: React.FC<{ agent: Agent }> = ({ agent }) => {
  const { openAgentDM } = useAgentDM();
  
  return (
    <div
      onClick={() => openAgentDM(agent)}
      className="cursor-pointer hover:bg-blue-100"
    >
      {agent.display_name}
    </div>
  );
};
```

##### 场景 2：Channel 自动生成与显示

```tsx
// hooks/useChannelInit.ts
export const useChannelInit = () => {
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get('/channels'),
    staleTime: 60000 // 1 分钟内不重新请求
  });
  
  const { openTab, setActiveTab } = useTabStore();
  
  useEffect(() => {
    if (channels && channels.length > 0) {
      // 1. 自动打开默认 Channel（通常是 #general）
      const defaultChannel = channels.find(ch => ch.is_default) || channels[0];
      
      // 2. 检查是否已有打开的 Tab
      const hasOpenTabs = openTabs.length > 0;
      
      if (!hasOpenTabs) {
        // 3. 自动打开默认 Channel 的 Tab
        const defaultTab = {
          id: `channel-${defaultChannel.channel_id}`,
          type: 'channel',
          channelId: defaultChannel.channel_id,
          title: `#${defaultChannel.name}`,
          icon: '📢'
        };
        openTab(defaultTab);
        setActiveTab(defaultTab.id);
      }
    }
  }, [channels]);
  
  return { channels };
};

// ChatPage 中的使用
export const ChatPage: React.FC = () => {
  const { channels } = useChannelInit(); // 自动初始化默认 Channel
  
  return (
    <div className="flex h-screen">
      <ChannelSidebar channels={channels} />
      {/* ... */}
    </div>
  );
};
```

##### 场景 3：消息回复 → 创建 discussion

```tsx
// hooks/useDiscussion.ts
export const useDiscussion = () => {
  const { openTab, setActiveTab } = useTabStore();
  const queryClient = useQueryClient();
  
  // 回复消息，创建或打开 discussion
  const replyToMessage = async (message: Message) => {
    // 1. 检查消息是否已有 discussion
    let discussion = message.discussion_id 
      ? await api.get(`/discussions/${message.discussion_id}`)
      : null;
    
    // 2. 如果没有，创建新的 discussion
    if (!discussion) {
      discussion = await api.post('/discussions/create', {
        parent_message_id: message.message_id,
        channel_id: message.channel_id,
        title: `Re: ${message.content.slice(0, 50)}...`
      });
      
      // 更新原消息的 discussion_id
      queryClient.setQueryData(['messages', message.channel_id], (old: Message[]) =>
        old.map(msg =>
          msg.message_id === message.message_id
            ? { ...msg, discussion_id: discussion.discussion_id }
            : msg
        )
      );
    }
    
    // 3. 打开 discussion Tab
    const existingTab = openTabs.find(tab => tab.discussionId === discussion.discussion_id);
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      const newTab = {
        id: `discussion-${discussion.discussion_id}`,
        type: 'discussion',
        discussionId: discussion.discussion_id,
        parentChannelId: message.channel_id,
        title: `💬 ${discussion.title}`,
        icon: '💬'
      };
      openTab(newTab);
      setActiveTab(newTab.id);
    }
    
    // 4. 加载 discussion 消息
    queryClient.prefetchQuery(['discussion-messages', discussion.discussion_id], () =>
      api.get(`/discussions/${discussion.discussion_id}/messages`)
    );
  };
  
  return { replyToMessage };
};

// MessageActions 中的使用
const MessageActions: React.FC<{ message: Message }> = ({ message }) => {
  const { replyToMessage } = useDiscussion();
  
  return (
    <div className="flex gap-2 mt-2">
      <ActionButton 
        icon="💬" 
        label="Reply" 
        onClick={() => replyToMessage(message)} 
      />
      {/* ... */}
    </div>
  );
};
```

##### 场景 4：Tab 切换与状态同步

```tsx
// stores/tabStore.ts
export const useTabStore = create<TabStore>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  
  // 打开新 Tab
  openTab: (tab: Tab) => {
    const { openTabs } = get();
    
    // 检查是否已存在
    const existingTab = openTabs.find(t => t.id === tab.id);
    if (existingTab) {
      set({ activeTabId: tab.id });
      return;
    }
    
    // 添加新 Tab
    set({
      openTabs: [...openTabs, tab],
      activeTabId: tab.id
    });
  },
  
  // 切换 Tab
  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
    
    // 同步更新 activeChannelId（用于 AgentBar 等组件）
    const tab = get().openTabs.find(t => t.id === tabId);
    if (tab) {
      if (tab.type === 'channel' || tab.type === 'dm') {
        useChannelStore.getState().setActiveChannel(tab.channelId);
      } else if (tab.type === 'discussion') {
        // discussion 的 Agent 列表来自父 Channel
        useChannelStore.getState().setActiveChannel(tab.parentChannelId);
      }
    }
  },
  
  // 关闭 Tab
  closeTab: (tabId: string) => {
    const { openTabs, activeTabId } = get();
    const newTabs = openTabs.filter(t => t.id !== tabId);
    
    // 如果关闭的是当前 Tab，切换到前一个
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId && newTabs.length > 0) {
      const closedIndex = openTabs.findIndex(t => t.id === tabId);
      newActiveTabId = newTabs[Math.max(0, closedIndex - 1)].id;
    }
    
    set({
      openTabs: newTabs,
      activeTabId: newActiveTabId
    });
  }
}));
```

##### 场景 5：Channel 列表与 Tab 的交互

```tsx
// components/ChannelSidebar.tsx
export const ChannelSidebar: React.FC<{ channels: Channel[] }> = ({ channels }) => {
  const { openTab, setActiveTab, openTabs } = useTabStore();
  
  const handleChannelClick = (channel: Channel) => {
    const tabId = `channel-${channel.channel_id}`;
    
    // 检查是否已打开
    const existingTab = openTabs.find(t => t.id === tabId);
    if (existingTab) {
      // 已打开，直接切换
      setActiveTab(tabId);
    } else {
      // 未打开，创建新 Tab
      openTab({
        id: tabId,
        type: 'channel',
        channelId: channel.channel_id,
        title: `#${channel.name}`,
        icon: channel.icon || '📢'
      });
    }
  };
  
  return (
    <div className="w-64 bg-gray-100 border-r">
      <div className="p-4">
        <h2 className="font-bold mb-4">Channels</h2>
        {channels.map(channel => (
          <div
            key={channel.channel_id}
            onClick={() => handleChannelClick(channel)}
            className={`
              px-3 py-2 rounded cursor-pointer hover:bg-gray-200
              ${openTabs.some(t => t.channelId === channel.channel_id) ? 'bg-blue-100' : ''}
            `}
          >
            <span className="mr-2">{channel.icon}</span>
            <span>#{channel.name}</span>
            {channel.unread_count > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {channel.unread_count}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

**关键设计原则**：

1. **自动化 Channel 创建**：DM Channel 在用户点击 Agent 时自动创建，无需手动操作
2. **智能 Tab 管理**：已存在的 Tab 直接切换，避免重复打开
3. **状态同步**：Tab 切换时自动同步 activeChannelId，确保 AgentBar 显示正确的 Agent 列表
4. **discussion 独立性**：discussion 有独立的消息列表，但 Agent 列表继承自父 Channel
5. **默认 Channel**：应用启动时自动打开默认 Channel（#general），提供良好的初始体验

---

#### 4.3.2 ChatPage API 调用和状态管理详解

**1. 消息发送流程（区分 Channel/DM/Discussion）**

```tsx
// hooks/useMessageSend.ts
export const useMessageSend = (target: MessageTarget) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (content: string) => {
      // 根据 target 类型调用不同的 API
      if (target.type === 'channel') {
        return api.post(`/channels/${target.channelId}/messages`, { content });
      } else if (target.type === 'dm') {
        return api.post(`/channels/${target.dmChannelId}/messages`, { content });
      } else if (target.type === 'discussion') {
        return api.post(`/discussions/${target.discussionId}/messages`, { content });
      }
    },
    
    // 乐观更新
    onMutate: async (content) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries(['messages', target.id]);
      
      // 获取当前消息列表
      const previousMessages = queryClient.getQueryData(['messages', target.id]);
      
      // 乐观添加新消息
      const optimisticMessage = {
        message_id: `temp-${Date.now()}`,
        content,
        sender: currentUser,
        created_at: new Date().toISOString(),
        status: 'sending'
      };
      
      queryClient.setQueryData(['messages', target.id], (old: Message[]) => 
        [...old, optimisticMessage]
      );
      
      return { previousMessages };
    },
    
    // 成功后更新
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['messages', target.id], (old: Message[]) =>
        old.map(msg => msg.message_id.startsWith('temp-') ? newMessage : msg)
      );
    },
    
    // 失败后回滚
    onError: (err, variables, context) => {
      queryClient.setQueryData(['messages', target.id], context.previousMessages);
      toast.error('Failed to send message');
    }
  });
};
```

**2. 任务认领流程（乐观更新 + 冲突处理）**

```tsx
// hooks/useTaskClaim.ts
export const useTaskClaim = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      return api.post(`/tasks/${taskId}/claim`);
    },
    
    // 乐观更新
    onMutate: async (taskId) => {
      await queryClient.cancelQueries(['tasks']);
      
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      // 乐观更新任务状态
      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map(task => 
          task.task_id === taskId 
            ? { ...task, assignee: currentUser, status: 'in_progress' }
            : task
        )
      );
      
      return { previousTasks };
    },
    
    // 成功后确认
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task claimed successfully');
    },
    
    // 失败后回滚（可能是冲突）
    onError: (err: ApiError, taskId, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      
      if (err.code === 'TASK_ALREADY_CLAIMED') {
        toast.error('Task already claimed by another user');
      } else {
        toast.error('Failed to claim task');
      }
    }
  });
};
```

**3. Agent 状态实时监控（WebSocket）**

```tsx
// hooks/useAgentStatus.ts
export const useAgentStatus = (channelId: string) => {
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    // 订阅 Agent 状态变化
    const unsubscribeFn = subscribe('agent_status_changed', (event) => {
      if (event.channel_id === channelId) {
        // 更新 Agent 状态
        queryClient.setQueryData(['channel-agents', channelId], (old: Agent[]) =>
          old.map(agent =>
            agent.agent_id === event.agent_id
              ? { ...agent, status: event.new_status, cost_today: event.cost_today }
              : agent
          )
        );
      }
    });
    
    return () => unsubscribeFn();
  }, [channelId]);
  
  // 查询 Agent 列表
  return useQuery({
    queryKey: ['channel-agents', channelId],
    queryFn: () => api.get(`/channels/${channelId}/agents`),
    staleTime: 30000 // 30 秒内不重新请求
  });
};
```

**4. 消息分页加载（无限滚动）**

```tsx
// hooks/useMessages.ts
export const useMessages = (channelId: string) => {
  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: ({ pageParam = null }) => 
      api.get(`/channels/${channelId}/messages`, {
        params: { limit: 50, before: pageParam }
      }),
    getNextPageParam: (lastPage) => lastPage.cursor,
    
    // 启用 WebSocket 实时更新
    onSuccess: (data) => {
      // 订阅新消息
      subscribeToNewMessages(channelId);
    }
  });
};

// WebSocket 新消息处理
const subscribeToNewMessages = (channelId: string) => {
  subscribe('new_message', (event) => {
    if (event.channel_id === channelId) {
      queryClient.setQueryData(['messages', channelId], (old) => ({
        ...old,
        pages: [
          { ...old.pages[0], data: [...old.pages[0].data, event.message] },
          ...old.pages.slice(1)
        ]
      }));
    }
  });
};
```

**5. UI 相似但操作不同的场景对比**

| 场景 | UI 组件 | Entity | API 端点 | State Key | 区别说明 |
|-----|--------|--------|---------|-----------|---------|
| **Channel 消息** | MessageBubble | MessageEntity | POST /channels/:channelId/messages | ['messages', channelId] | target 是 channel_id，所有成员可见 |
| **DM 消息** | MessageBubble | MessageEntity | POST /channels/:dmChannelId/messages | ['messages', dmChannelId] | target 是 dm_channel_id（特殊 Channel），只有两人可见 |
| **discussion 消息** | MessageBubble | MessageEntity | POST /discussions/:discussionId/messages | ['discussion-messages', discussionId] | target 是 discussion_id，只有关注者收到通知 |
| **Channel 任务** | TaskCard | TaskEntity | POST /tasks/:taskId/claim | ['tasks', channelId] | 任务归属于 Channel，所有成员可认领 |
| **OKR 任务** | TaskCard | TaskEntity | POST /tasks/:taskId/claim | ['okr-tasks', krId] | 任务归属于 KR，只有 KR 负责人可认领 |
| **Agent 状态（Channel）** | AgentStatusBadge | AgentEntity | GET /channels/:channelId/agents | ['channel-agents', channelId] | 显示频道内的 Agent |
| **Agent 状态（全局）** | AgentStatusBadge | AgentEntity | GET /agents | ['agents'] | 显示所有 Agent |

**关键实现原则**：
1. **使用 TypeScript 类型区分**：定义 `MessageTarget` 类型，包含 `type` 字段区分 channel/dm/discussion
2. **统一组件，动态行为**：`MessageBubble` 组件相同，但根据 `target.type` 调用不同 API
3. **独立的 State Key**：不同上下文使用不同的 React Query Key，避免缓存冲突
4. **明确的错误处理**：不同场景的错误提示不同（如任务冲突、权限不足）

---

#### 4.3.3 OKRPage（OKR 页面）

**职责**: OKR 管理、进度跟踪、KR 关联 Workflow

**操作的 Entity**:
- **OKREntity**: Objective、Key Results、进度数据
- **ProjectEntity**: 项目信息、OKR 归属
- **WorkflowEntity**: KR 关联的 Workflow
- **TaskEntity**: KR 关联的任务

**调用的 API**:
- `GET /projects/:projectId/okrs` - 获取项目的所有 OKR
- `POST /okrs` - 创建新的 OKR
- `PUT /okrs/:okrId` - 更新 OKR
- `PUT /okrs/:okrId/key-results/:krId` - 更新 Key Result
- `GET /okrs/:okrId/progress` - 获取 OKR 进度历史
- `GET /key-results/:krId/workflows` - 获取 KR 关联的 Workflow
- `POST /key-results/:krId/link-workflow` - 关联 Workflow 到 KR
- `GET /key-results/:krId/tasks` - 获取 KR 关联的任务

**状态管理**:
- **Zustand (全局状态)**:
  - `selectedOKRId`: 当前选中的 OKR ID
  - `selectedKRId`: 当前选中的 KR ID
  - `okrViewMode`: 视图模式（list/board/timeline）
- **React Query (服务端状态)**:
  - `useProjectOKRs(projectId)`: 项目的 OKR 列表
  - `useOKRProgress(okrId)`: OKR 进度历史
  - `useKRWorkflows(krId)`: KR 关联的 Workflow
  - `useKRTasks(krId)`: KR 关联的任务
- **WebSocket (实时通信)**:
  - `okr_updated`: OKR 更新
  - `kr_progress_changed`: KR 进度变化
  - `task_completed`: 任务完成（自动更新 KR 进度）

**5 个核心组件**:

1. **Objective 卡片（O Card）**
   - 显示目标标题、负责人、季度
   - 总体进度条
   - 展开/收起 Key Results

2. **Key Result 卡片（KR Card）**
   - 显示 KR 标题、目标值、当前值、进度
   - 状态指示器：🟢 on_track | 🟡 at_risk | 🔴 behind | ✅ completed
   - 关联的 Workflow 列表

3. **Task 列表（Task List）**
   - 显示关联到 KR 的所有任务
   - 任务完成自动更新 KR 进度

4. **Progress Chart（进度图表）**
   - 折线图：KR 进度随时间变化
   - 柱状图：各 KR 对比

5. **Plan 编辑器（Plan Editor）**
   - 为 KR 创建执行计划
   - 关联 Workflow

**KR 进度自动更新机制**:

```tsx
// hooks/useKRProgressSync.ts
export const useKRProgressSync = (krId: string) => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    // 监听任务完成事件
    const unsubscribe = subscribe('task_completed', (event) => {
      if (event.kr_id === krId) {
        // 自动更新 KR 进度
        queryClient.setQueryData(['key-result', krId], (old: KeyResult) => ({
          ...old,
          current_value: old.current_value + event.task_contribution,
          progress: calculateProgress(old.current_value + event.task_contribution, old.target_value),
          updated_at: new Date().toISOString()
        }));
        
        // 同时更新父 OKR 的进度
        queryClient.invalidateQueries(['okr', event.okr_id]);
        
        toast.success(`KR progress updated: +${event.task_contribution}`);
      }
    });
    
    return () => unsubscribe();
  }, [krId]);
};

// 计算进度百分比
const calculateProgress = (current: number, target: number): number => {
  return Math.min(100, Math.round((current / target) * 100));
};
```

**组件结构**:

```tsx
// frontend/src/pages/OKRPage.tsx

export const OKRPage: React.FC = () => {
  const { projectId } = useParams();
  const { okrs } = useOKRs(projectId);
  
  return (
    <div className="p-6">
      <OKRHeader projectId={projectId} />
      
      <div className="grid grid-cols-1 gap-6">
        {okrs.map(okr => (
          <OKRBoard key={okr.okr_id} okr={okr} />
        ))}
      </div>
    </div>
  );
};

// 1. Objective 卡片
const ObjectiveCard: React.FC<{ objective: Objective }> = ({ objective }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="border rounded-lg p-6 bg-white shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{objective.title}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Owner: {objective.owner_name}</span>
            <span>Quarter: {objective.quarter}</span>
          </div>
        </div>
        
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? '▼' : '▶'}
        </button>
      </div>
      
      <ProgressBar progress={objective.progress} />
      
      {expanded && (
        <div className="mt-6 space-y-4">
          {objective.key_results.map(kr => (
            <KeyResultCard key={kr.kr_id} kr={kr} />
          ))}
        </div>
      )}
    </div>
  );
};

// 2. Key Result 卡片
const KeyResultCard: React.FC<{ kr: KeyResult }> = ({ kr }) => {
  const statusIcon = {
    on_track: '🟢',
    at_risk: '🟡',
    behind: '🔴',
    completed: '✅'
  }[kr.status];
  
  return (
    <div className="border-l-4 border-blue-500 pl-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{statusIcon}</span>
          <h3 className="font-semibold">{kr.title}</h3>
        </div>
        
        <div className="text-sm text-gray-600">
          {kr.current_value} / {kr.target_value} {kr.unit}
        </div>
      </div>
      
      <ProgressBar progress={kr.progress} size="sm" />
      
      {kr.workflows.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-gray-600">Workflows:</span>
          <div className="flex gap-2 mt-1">
            {kr.workflows.map(workflow => (
              <WorkflowBadge key={workflow.workflow_id} workflow={workflow} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 4. Progress Chart
const ProgressChart: React.FC<{ okr: OKR }> = ({ okr }) => {
  const chartData = useOKRProgressHistory(okr.okr_id);
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-4">Progress Over Time</h3>
      <LineChart data={chartData} />
    </div>
  );
};
```

---

#### 4.2.3 TaskPage（任务页面）

**职责**: 任务看板、任务筛选、批量操作

**操作的 Entity**:
- **TaskEntity**: 任务元数据、状态、优先级
- **MessageEntity**: 任务关联的消息（任务是特殊的消息）
- **ExecutionEntity**: 任务执行记录
- **AgentEntity**: 任务认领者（可能是 Agent）

**调用的 API**:
- `GET /channels/:channelId/tasks?status=:status&assignee=:assignee` - 获取任务列表（支持筛选）
- `POST /tasks/:taskId/claim` - 认领任务
- `POST /tasks/:taskId/unclaim` - 取消认领
- `PUT /tasks/:taskId/status` - 更新任务状态
- `PUT /tasks/:taskId/priority` - 更新任务优先级
- `POST /tasks/batch-claim` - 批量认领任务
- `GET /tasks/:taskId/executions` - 获取任务执行历史

**状态管理**:
- **Zustand (全局状态)**:
  - `taskFilters`: 任务筛选条件（status、assignee、priority）
  - `selectedTaskIds`: 批量操作选中的任务 ID 列表
  - `taskViewMode`: 视图模式（board/list/calendar）
- **React Query (服务端状态)**:
  - `useTasks(channelId, filters)`: 任务列表（支持筛选）
  - `useTaskExecutions(taskId)`: 任务执行历史
- **WebSocket (实时通信)**:
  - `task_created`: 新任务创建
  - `task_claimed`: 任务被认领
  - `task_status_changed`: 任务状态变化
  - `task_conflict`: 任务认领冲突

**UI 相似但操作不同的场景**:

| 场景 | Entity | API 端点 | 区别 |
|-----|--------|---------|-----|
| Channel 任务看板 | TaskEntity (channel_id) | GET /channels/:channelId/tasks | 显示频道内的所有任务 |
| OKR 任务看板 | TaskEntity (kr_id) | GET /key-results/:krId/tasks | 显示 KR 关联的任务 |
| Agent 任务看板 | TaskEntity (assignee_id) | GET /agents/:agentId/tasks | 显示 Agent 认领的任务 |
| 全局任务看板 | TaskEntity | GET /tasks?project_id=:projectId | 显示项目内的所有任务 |

**组件结构**:

```tsx
// frontend/src/pages/TaskPage.tsx

export const TaskPage: React.FC = () => {
  const { channelId } = useParams();
  const { tasks, claimTask, updateTaskStatus } = useTasks(channelId);
  const { selectedTaskIds, setSelectedTaskIds, clearSelection } = useTaskStore();
  const { batchClaimTasks } = useBatchTaskActions();
  
  return (
    <div className="p-6">
      <TaskFilters />
      
      {/* 批量操作工具栏 */}
      {selectedTaskIds.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedTaskIds.length} tasks selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => batchClaimTasks(selectedTaskIds)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Claim All
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 border rounded hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      <TaskBoard
        tasks={tasks}
        onClaim={claimTask}
        onUpdateStatus={updateTaskStatus}
      />
    </div>
  );
};

const TaskBoard: React.FC = ({ tasks }) => {
  const columns = ['todo', 'in_progress', 'in_review', 'done'];
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map(status => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks.filter(t => t.status === status)}
        />
      ))}
    </div>
  );
};

// 批量任务操作 Hook
const useBatchTaskActions = () => {
  const queryClient = useQueryClient();
  
  return {
    batchClaimTasks: useMutation({
      mutationFn: async (taskIds: string[]) => {
        return api.post('/tasks/batch-claim', { task_ids: taskIds });
      },
      
      onSuccess: (result) => {
        // result.success: 成功认领的任务 ID 列表
        // result.conflicts: 冲突的任务列表
        
        queryClient.invalidateQueries(['tasks']);
        
        if (result.conflicts.length > 0) {
          toast.warning(
            `${result.success.length} tasks claimed, ${result.conflicts.length} conflicts`,
            {
              description: result.conflicts.map(c => 
                `Task #${c.task_number} already claimed by ${c.assignee_name}`
              ).join('\n')
            }
          );
        } else {
          toast.success(`${result.success.length} tasks claimed successfully`);
        }
      },
      
      onError: (err) => {
        toast.error('Failed to claim tasks');
      }
    })
  };
};

// 任务认领冲突处理
const useTaskClaimWithConflictHandling = () => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  
  // 监听实时冲突事件
  useEffect(() => {
    const unsubscribe = subscribe('task_conflict', (event) => {
      // 有人在你认领的同时也认领了这个任务
      toast.error(
        `Task #${event.task_number} was claimed by ${event.winner_name}`,
        {
          description: 'Please choose another task',
          duration: 5000
        }
      );
      
      // 更新任务列表
      queryClient.invalidateQueries(['tasks']);
    });
    
    return () => unsubscribe();
  }, []);
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      return api.post(`/tasks/${taskId}/claim`);
    },
    
    onMutate: async (taskId) => {
      // 乐观更新
      await queryClient.cancelQueries(['tasks']);
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map(task =>
          task.task_id === taskId
            ? { ...task, assignee: currentUser, status: 'in_progress' }
            : task
        )
      );
      
      return { previousTasks };
    },
    
    onError: (err: ApiError, taskId, context) => {
      // 回滚
      queryClient.setQueryData(['tasks'], context.previousTasks);
      
      if (err.code === 'TASK_ALREADY_CLAIMED') {
        toast.error(`Task already claimed by ${err.details.assignee_name}`);
      } else {
        toast.error('Failed to claim task');
      }
    },
    
    onSuccess: () => {
      toast.success('Task claimed successfully');
    }
  });
};
```

---

### 4.3 状态管理

**Zustand Store 示例**:

```tsx
// frontend/src/stores/channelStore.ts

export const useChannelStore = create<ChannelStore>((set) => ({
  channels: [],
  activeChannelId: null,
  openTabs: [],
  
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  
  openTab: (tab) => set((state) => ({
    openTabs: [...state.openTabs, tab]
  })),
  
  closeTab: (tabId) => set((state) => ({
    openTabs: state.openTabs.filter(t => t.id !== tabId)
  }))
}));
```

**React Query 示例**:

```tsx
// frontend/src/hooks/useMessages.ts

export const useMessages = (channelId: string) => {
  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => api.getMessages(channelId),
    refetchInterval: 5000  // 每 5 秒轮询一次
  });
};
```

**WebSocket 实时通信**:

```tsx
// frontend/src/services/websocket.ts

export const useWebSocket = (channelId: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${channelId}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // 更新 React Query 缓存
      queryClient.setQueryData(['messages', channelId], (old: Message[]) => {
        return [...old, message];
      });
    };
    
    return () => ws.close();
  }, [channelId]);
};
```

---

#### 4.3.1 状态冲突解决机制（P0）

**问题场景**：
1. **WebSocket 推送 vs 用户本地操作**：用户正在编辑任务时，WebSocket 推送了该任务的更新
2. **多 Tab 同时操作**：用户在多个 Tab 中同时修改同一个任务
3. **离线编辑 vs 在线同步**：用户离线时修改了数据，重新上线后与服务器数据冲突

**解决方案**：

##### 方案 1：乐观更新 + 版本号冲突检测

```tsx
// hooks/useOptimisticUpdate.ts
export const useOptimisticTaskUpdate = () => {
  const queryClient = useQueryClient();
  
  const updateTask = useMutation({
    mutationFn: (task: Task) => api.updateTask(task),
    
    // 1. 乐观更新：立即更新本地缓存
    onMutate: async (newTask) => {
      // 取消正在进行的查询，避免覆盖乐观更新
      await queryClient.cancelQueries(['tasks', newTask.task_id]);
      
      // 保存当前值作为回滚点
      const previousTask = queryClient.getQueryData(['tasks', newTask.task_id]);
      
      // 乐观更新本地缓存
      queryClient.setQueryData(['tasks', newTask.task_id], newTask);
      
      return { previousTask };
    },
    
    // 2. 成功：更新版本号
    onSuccess: (data) => {
      queryClient.setQueryData(['tasks', data.task_id], data);
    },
    
    // 3. 失败：回滚 + 冲突提示
    onError: (error, newTask, context) => {
      // 回滚到之前的值
      queryClient.setQueryData(['tasks', newTask.task_id], context.previousTask);
      
      // 检查是否是版本冲突
      if (error.code === 'VERSION_CONFLICT') {
        // 显示冲突解决对话框
        showConflictDialog({
          local: newTask,
          remote: error.remoteData,
          onResolve: (resolved) => {
            // 用户选择保留哪个版本
            updateTask.mutate(resolved);
          }
        });
      }
    }
  });
  
  return { updateTask };
};
```

##### 方案 2：WebSocket 推送时的智能合并

```tsx
// services/websocket.ts
export class WebSocketManager {
  private ws: WebSocket;
  private pendingEdits = new Map<string, any>(); // 记录用户正在编辑的数据
  
  constructor(channelId: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws/${channelId}`);
    
    this.ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      // 检查用户是否正在编辑该数据
      if (this.pendingEdits.has(update.entity_id)) {
        // 用户正在编辑，延迟应用更新
        this.queueUpdate(update);
      } else {
        // 用户未编辑，直接应用更新
        this.applyUpdate(update);
      }
    };
  }
  
  // 标记用户开始编辑
  markEditing(entityId: string, data: any) {
    this.pendingEdits.set(entityId, data);
  }
  
  // 用户完成编辑
  finishEditing(entityId: string) {
    this.pendingEdits.delete(entityId);
    
    // 应用排队的更新
    this.applyQueuedUpdates(entityId);
  }
  
  private queueUpdate(update: any) {
    // 将更新加入队列，等待用户完成编辑
    // ...
  }
  
  private applyUpdate(update: any) {
    // 更新 React Query 缓存
    queryClient.setQueryData([update.entity_type, update.entity_id], update.data);
  }
}
```

##### 方案 3：冲突解决 UI 组件

```tsx
// components/ConflictDialog.tsx
export const ConflictDialog: React.FC<{
  local: Task;
  remote: Task;
  onResolve: (resolved: Task) => void;
}> = ({ local, remote, onResolve }) => {
  const [selectedVersion, setSelectedVersion] = useState<'local' | 'remote' | 'merge'>('merge');
  
  return (
    <Dialog open>
      <DialogTitle>数据冲突</DialogTitle>
      <DialogContent>
        <div className="grid grid-cols-2 gap-4">
          {/* 本地版本 */}
          <div className="border p-4">
            <h3>你的修改</h3>
            <pre>{JSON.stringify(local, null, 2)}</pre>
            <Button onClick={() => onResolve(local)}>保留我的修改</Button>
          </div>
          
          {/* 远程版本 */}
          <div className="border p-4">
            <h3>服务器版本</h3>
            <pre>{JSON.stringify(remote, null, 2)}</pre>
            <Button onClick={() => onResolve(remote)}>使用服务器版本</Button>
          </div>
        </div>
        
        {/* 手动合并 */}
        <div className="mt-4">
          <h3>手动合并</h3>
          <TaskEditor
            initialValue={local}
            remoteValue={remote}
            onSave={(merged) => onResolve(merged)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

#### 4.3.2 WebSocket 重连策略（P0）

**问题场景**：
1. 网络不稳定导致 WebSocket 断开
2. 服务器重启导致连接中断
3. 用户切换网络（WiFi → 4G）

**解决方案**：

##### 指数退避重连策略

```tsx
// services/websocket.ts
export class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 1000; // 初始重连间隔 1 秒
  private maxReconnectInterval = 30000; // 最大重连间隔 30 秒
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  constructor(url: string) {
    this.url = url;
    this.connect();
  }
  
  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0; // 重置重连计数
        this.reconnectInterval = 1000; // 重置重连间隔
        
        // 通知 UI 连接成功
        this.notifyConnectionStatus('connected');
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed', event);
        
        // 通知 UI 连接断开
        this.notifyConnectionStatus('disconnected');
        
        // 尝试重连
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error', error);
        
        // 通知 UI 连接错误
        this.notifyConnectionStatus('error');
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket', error);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect() {
    // 检查是否超过最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.notifyConnectionStatus('failed');
      return;
    }
    
    // 指数退避：每次重连间隔翻倍
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectInterval
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  private notifyConnectionStatus(status: 'connected' | 'disconnected' | 'error' | 'failed') {
    // 通过事件总线通知 UI
    eventBus.emit('websocket:status', status);
  }
  
  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    
    // 处理不同类型的消息
    switch (data.type) {
      case 'message':
        this.handleNewMessage(data);
        break;
      case 'task_update':
        this.handleTaskUpdate(data);
        break;
      case 'agent_status':
        this.handleAgentStatus(data);
        break;
      default:
        console.warn('Unknown message type', data.type);
    }
  }
  
  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent');
      // 可以将消息加入队列，等待重连后发送
    }
  }
  
  public close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

##### 连接状态 UI 指示器

```tsx
// components/ConnectionStatus.tsx
export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error' | 'failed'>('connected');
  
  useEffect(() => {
    const unsubscribe = eventBus.on('websocket:status', (newStatus) => {
      setStatus(newStatus);
    });
    
    return unsubscribe;
  }, []);
  
  if (status === 'connected') {
    return null; // 连接正常时不显示
  }
  
  return (
    <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg ${
      status === 'disconnected' ? 'bg-yellow-500' :
      status === 'error' ? 'bg-orange-500' :
      'bg-red-500'
    } text-white`}>
      {status === 'disconnected' && '⚠️ 连接断开，正在重连...'}
      {status === 'error' && '❌ 连接错误，正在重试...'}
      {status === 'failed' && '🚫 连接失败，请刷新页面'}
    </div>
  );
};
```

##### 离线消息队列

```tsx
// services/offlineQueue.ts
export class OfflineMessageQueue {
  private queue: Array<{ type: string; data: any; timestamp: number }> = [];
  private isOnline = true;
  
  constructor() {
    // 监听在线/离线事件
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // 监听 WebSocket 连接状态
    eventBus.on('websocket:status', (status) => {
      this.isOnline = status === 'connected';
      if (this.isOnline) {
        this.flushQueue();
      }
    });
  }
  
  public enqueue(type: string, data: any) {
    if (this.isOnline) {
      // 在线时直接发送
      websocket.send({ type, data });
    } else {
      // 离线时加入队列
      this.queue.push({ type, data, timestamp: Date.now() });
      this.saveToLocalStorage();
    }
  }
  
  private handleOnline() {
    console.log('Network online');
    this.isOnline = true;
    this.flushQueue();
  }
  
  private handleOffline() {
    console.log('Network offline');
    this.isOnline = false;
  }
  
  private flushQueue() {
    console.log(`Flushing ${this.queue.length} queued messages`);
    
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (message) {
        websocket.send(message);
      }
    }
    
    this.saveToLocalStorage();
  }
  
  private saveToLocalStorage() {
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
  
  private loadFromLocalStorage() {
    const saved = localStorage.getItem('offline_queue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }
}
```

---

### 4.4 前端多重可视化形式设计

#### 4.4.1 设计原则

**核心理念**：同一数据源（TaskEntity）通过不同的视图组件呈现，满足不同场景的需求。

**关键原则**：
1. **单一数据源**：所有视图共享同一个 React Query 缓存
2. **视图独立**：每个视图组件独立实现，互不干扰
3. **状态同步**：视图切换时保持筛选条件和选中状态
4. **性能优化**：大数据量场景使用虚拟滚动和分页
5. **实时更新**：WebSocket 推送自动更新所有视图

---

#### 4.4.2 Project 页面的多视图设计

**场景**：Project 页面需要展示 OKR、Workflow、Task 等多种数据，每种数据都有多种视图形式。

##### 视图 1：OKR Kanban（看板视图）

**数据源**：OKREntity + TaskEntity（关联到 KR）

**视图特点**：
- 横向展示多个 Objective
- 每个 Objective 下纵向展示 Key Results
- 每个 KR 下展示关联的 Task 卡片
- 支持拖拽调整 Task 优先级

**组件实现**：

```tsx
// components/OKRKanban.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';

export const OKRKanban: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: okrs } = useQuery({
    queryKey: ['project-okrs', projectId],
    queryFn: () => api.get(`/projects/${projectId}/okrs`)
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`)
  });
  
  // 按 KR 分组任务
  const tasksByKR = useMemo(() => {
    return groupBy(tasks, 'kr_id');
  }, [tasks]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    // 更新任务的 KR 归属
    updateTaskKR.mutate({
      taskId: active.id,
      newKRId: over.id
    });
  };
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto p-6">
        {okrs?.map(okr => (
          <div key={okr.okr_id} className="min-w-[400px]">
            {/* Objective 标题 */}
            <div className="bg-blue-100 rounded-lg p-4 mb-4">
              <h2 className="text-xl font-bold">{okr.objective}</h2>
              <ProgressBar progress={okr.overall_progress} />
            </div>
            
            {/* Key Results 列表 */}
            <div className="space-y-4">
              {okr.key_results.map(kr => (
                <div key={kr.kr_id} className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">{kr.title}</h3>
                  <ProgressBar progress={kr.progress} size="sm" />
                  
                  {/* KR 关联的任务 */}
                  <div className="mt-3 space-y-2">
                    {tasksByKR[kr.kr_id]?.map(task => (
                      <DraggableTaskCard key={task.task_id} task={task} />
                    ))}
                  </div>
                  
                  {/* 添加任务按钮 */}
                  <button
                    onClick={() => createTaskForKR(kr.kr_id)}
                    className="mt-2 w-full text-sm text-blue-600 hover:bg-blue-50 py-2 rounded"
                  >
                    + Add Task
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  );
};
```

---

##### 视图 2：Workflow Timeline（时间线视图）

**数据源**：WorkflowEntity + ExecutionEntity

**视图特点**：
- 横轴为时间，纵轴为 Workflow
- 显示每个 Workflow 的执行历史
- 支持点击查看执行详情
- 实时更新执行状态

**组件实现**：

```tsx
// components/WorkflowTimeline.tsx
import { Timeline, TimelineItem } from '@/components/ui/Timeline';

export const WorkflowTimeline: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: workflows } = useQuery({
    queryKey: ['project-workflows', projectId],
    queryFn: () => api.get(`/projects/${projectId}/workflows`)
  });
  
  const { data: executions } = useQuery({
    queryKey: ['project-executions', projectId],
    queryFn: () => api.get(`/projects/${projectId}/executions`),
    refetchInterval: 5000  // 每 5 秒刷新
  });
  
  // 按 Workflow 分组执行记录
  const executionsByWorkflow = useMemo(() => {
    return groupBy(executions, 'workflow_id');
  }, [executions]);
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Workflow Timeline</h2>
      
      {workflows?.map(workflow => (
        <div key={workflow.workflow_id} className="mb-8">
          <h3 className="text-lg font-semibold mb-4">{workflow.name}</h3>
          
          <Timeline>
            {executionsByWorkflow[workflow.workflow_id]?.map(execution => (
              <TimelineItem
                key={execution.execution_id}
                timestamp={execution.started_at}
                status={execution.status}
                onClick={() => openExecutionDetail(execution)}
              >
                <div className="flex items-center gap-3">
                  <ExecutionStatusBadge status={execution.status} />
                  <span className="text-sm text-gray-600">
                    {execution.agent_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(execution.duration)}
                  </span>
                </div>
                
                {execution.status === 'failed' && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {execution.error_message}
                  </div>
                )}
              </TimelineItem>
            ))}
          </Timeline>
        </div>
      ))}
    </div>
  );
};
```

---

##### 视图 3：Task Gantt Chart（甘特图视图）

**数据源**：TaskEntity（带时间信息）

**视图特点**：
- 横轴为时间，纵轴为任务
- 显示任务的开始时间、结束时间、依赖关系
- 支持拖拽调整任务时间
- 显示关键路径

**组件实现**：

```tsx
// components/TaskGanttChart.tsx
import { Gantt, Task as GanttTask } from 'gantt-task-react';

export const TaskGanttChart: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`)
  });
  
  // 转换为 Gantt 数据格式
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks?.map(task => ({
      id: task.task_id,
      name: task.title,
      start: new Date(task.start_date),
      end: new Date(task.due_date),
      progress: task.progress || 0,
      dependencies: task.dependencies || [],
      type: 'task',
      styles: {
        backgroundColor: getTaskColor(task.status),
        progressColor: '#4ade80'
      }
    })) || [];
  }, [tasks]);
  
  const handleTaskChange = (task: GanttTask) => {
    // 更新任务时间
    updateTask.mutate({
      taskId: task.id,
      start_date: task.start.toISOString(),
      due_date: task.end.toISOString()
    });
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Task Gantt Chart</h2>
      
      <Gantt
        tasks={ganttTasks}
        onDateChange={handleTaskChange}
        viewMode="Day"
        locale="en"
      />
    </div>
  );
};
```

---

##### 视图 4：Resource Allocation（资源分配视图）

**数据源**：TaskEntity + AgentEntity

**视图特点**：
- 显示每个 Agent 的任务负载
- 按时间段显示 Agent 的工作安排
- 支持拖拽分配任务给 Agent
- 显示 Agent 的可用时间和超载警告

**组件实现**：

```tsx
// components/ResourceAllocation.tsx
export const ResourceAllocation: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: agents } = useQuery({
    queryKey: ['project-agents', projectId],
    queryFn: () => api.get(`/projects/${projectId}/agents`)
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`)
  });
  
  // 按 Agent 分组任务
  const tasksByAgent = useMemo(() => {
    return groupBy(tasks?.filter(t => t.assignee_id), 'assignee_id');
  }, [tasks]);
  
  // 计算 Agent 负载
  const agentWorkload = useMemo(() => {
    return agents?.map(agent => {
      const agentTasks = tasksByAgent[agent.agent_id] || [];
      const totalHours = agentTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
      const capacity = agent.weekly_capacity_hours || 40;
      const utilization = (totalHours / capacity) * 100;
      
      return {
        agent,
        totalHours,
        capacity,
        utilization,
        isOverloaded: utilization > 100
      };
    });
  }, [agents, tasksByAgent]);
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Resource Allocation</h2>
      
      <div className="space-y-4">
        {agentWorkload?.map(({ agent, totalHours, capacity, utilization, isOverloaded }) => (
          <div key={agent.agent_id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar src={agent.avatar} size="md" />
                <div>
                  <h3 className="font-semibold">{agent.display_name}</h3>
                  <span className="text-sm text-gray-600">
                    {totalHours}h / {capacity}h ({utilization.toFixed(0)}%)
                  </span>
                </div>
              </div>
              
              {isOverloaded && (
                <span className="text-sm text-red-600 font-semibold">
                  ⚠️ Overloaded
                </span>
              )}
            </div>
            
            {/* 负载进度条 */}
            <ProgressBar 
              progress={Math.min(utilization, 100)} 
              color={isOverloaded ? 'red' : 'blue'}
            />
            
            {/* Agent 的任务列表 */}
            <div className="mt-3 space-y-2">
              {tasksByAgent[agent.agent_id]?.map(task => (
                <div key={task.task_id} className="flex items-center justify-between text-sm">
                  <span>{task.title}</span>
                  <span className="text-gray-600">{task.estimated_hours}h</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

#### 4.4.3 视图切换与状态同步

**视图切换器组件**：

```tsx
// components/ViewSwitcher.tsx
export const ViewSwitcher: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [activeView, setActiveView] = useState<ViewType>('okr-kanban');
  
  const views: ViewConfig[] = [
    { id: 'okr-kanban', label: 'OKR Kanban', icon: '📊', component: OKRKanban },
    { id: 'workflow-timeline', label: 'Workflow Timeline', icon: '⏱️', component: WorkflowTimeline },
    { id: 'task-gantt', label: 'Task Gantt', icon: '📅', component: TaskGanttChart },
    { id: 'resource-allocation', label: 'Resource Allocation', icon: '👥', component: ResourceAllocation }
  ];
  
  const ActiveViewComponent = views.find(v => v.id === activeView)?.component;
  
  return (
    <div>
      {/* 视图切换按钮 */}
      <div className="flex gap-2 mb-6 border-b pb-4">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${activeView === view.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>
      
      {/* 当前视图 */}
      {ActiveViewComponent && <ActiveViewComponent projectId={projectId} />}
    </div>
  );
};
```

---

#### 4.4.4 Entity-Runtime-View 映射关系

**完整映射表**：

| 视图 | 数据源 Entity | Backend Service | Runtime | 更新机制 | 适用场景 |
|------|--------------|----------------|---------|---------|---------|
| **OKR Kanban** | OKREntity + TaskEntity | OKRService + TaskService | 无 | WebSocket (task_updated) | 项目 OKR 管理，任务分配 |
| **Workflow Timeline** | WorkflowEntity + ExecutionEntity | WorkflowService + ExecutionService | WorkflowRuntime + ExecutionRuntime | WebSocket (execution_status_changed) | 工作流执行监控 |
| **Task Gantt Chart** | TaskEntity | TaskService | 无 | WebSocket (task_updated) | 项目进度规划 |
| **Resource Allocation** | TaskEntity + AgentEntity | TaskService + AgentRuntimeService | AgentDaemon | WebSocket (task_claimed, agent_status_changed) | 团队资源管理 |
| **Chat Timeline** | MessageEntity | MessageService | ChannelRuntime | WebSocket (new_message) | 实时沟通 |
| **Task Board** | TaskEntity | TaskService | 无 | WebSocket (task_updated) | 任务看板管理 |

**关键设计原则**：

1. **数据层统一**：所有视图共享同一个 React Query 缓存，避免重复请求
2. **视图层独立**：每个视图组件独立实现，可以单独优化和测试
3. **实时同步**：WebSocket 推送自动更新所有视图的数据
4. **性能优化**：大数据量场景使用虚拟滚动、分页、懒加载
5. **状态持久化**：视图切换时保持筛选条件、排序方式、选中状态

---

### 4.5 技术选型

| 技术栈 | 选择 | 理由 |
|--------|------|------|
| **框架** | React 18 | 成熟生态、Hooks、并发渲染 |
| **语言** | TypeScript | 类型安全、IDE 支持 |
| **样式** | Tailwind CSS | 快速开发、一致性 |
| **状态管理** | Zustand | 轻量、简单、性能好 |
| **服务端状态** | React Query | 缓存、轮询、乐观更新 |
| **路由** | React Router v6 | 标准路由方案 |
| **实时通信** | WebSocket + Socket.IO | 双向通信、自动重连 |
| **图表** | Recharts | 声明式、易用 |
| **Markdown** | react-markdown | 渲染 Markdown 消息 |
| **代码高亮** | Prism.js | 代码块语法高亮 |
| **虚拟滚动** | @tanstack/react-virtual | 处理大量消息 |
| **构建工具** | Vite | 快速开发、HMR |

---

### 4.6 性能优化详细设计（P1-5）

#### 4.6.1 虚拟滚动优化

**问题**：当消息列表超过 1000 条时，DOM 节点过多导致渲染性能下降

**解决方案**：使用 `@tanstack/react-virtual` 实现虚拟滚动

```tsx
// components/MessageTimeline.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const MessageTimeline: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // 预估每条消息高度
    overscan: 5 // 预渲染上下各 5 条
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={message.message_id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <MessageBubble message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**性能指标**：
- 1000 条消息：渲染时间从 800ms 降至 50ms
- 10000 条消息：内存占用从 500MB 降至 80MB
- 滚动帧率：稳定 60fps

---

#### 4.6.2 代码分割策略

**目标**：减少首屏加载时间，按需加载页面组件

**实现方案**：

```tsx
// App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// 懒加载页面组件
const ChatPage = lazy(() => import('./pages/ChatPage'));
const OKRPage = lazy(() => import('./pages/OKRPage'));
const TaskPage = lazy(() => import('./pages/TaskPage'));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/okr" element={<OKRPage />} />
        <Route path="/tasks" element={<TaskPage />} />
        <Route path="/workflows" element={<WorkflowPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
};
```

**Vite 配置优化**：

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          'data-vendor': ['@tanstack/react-query', 'zustand'],
          'chart-vendor': ['recharts'],
          'markdown-vendor': ['react-markdown', 'prismjs']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

**性能指标**：
- 首屏 JS 体积：从 800KB 降至 200KB
- 首屏加载时间：从 3.5s 降至 1.2s
- Lighthouse 性能分数：从 65 提升至 92

---

#### 4.6.3 React Query 缓存策略

**目标**：减少重复 API 请求，提升数据加载速度

**缓存配置**：

```tsx
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 缓存时间：5 分钟
      staleTime: 5 * 60 * 1000,
      // 缓存保留时间：10 分钟
      cacheTime: 10 * 60 * 1000,
      // 窗口聚焦时重新获取
      refetchOnWindowFocus: true,
      // 网络重连时重新获取
      refetchOnReconnect: true,
      // 失败重试 3 次
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
});
```

**智能预取**：

```tsx
// hooks/useMessages.ts
export const useMessages = (channelId: string) => {
  const queryClient = useQueryClient();
  
  const { data: messages } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => api.getMessages(channelId),
    onSuccess: (data) => {
      // 预取相关数据
      data.forEach(message => {
        // 预取用户信息
        queryClient.prefetchQuery({
          queryKey: ['user', message.sender_id],
          queryFn: () => api.getUser(message.sender_id)
        });
        
        // 预取附件信息
        if (message.attachments.length > 0) {
          message.attachments.forEach(attachment => {
            queryClient.prefetchQuery({
              queryKey: ['attachment', attachment.attachment_id],
              queryFn: () => api.getAttachment(attachment.attachment_id)
            });
          });
        }
      });
    }
  });
  
  return { messages };
};
```

**性能指标**：
- API 请求减少 60%
- 页面切换响应时间：从 500ms 降至 50ms
- 缓存命中率：>85%

---

#### 4.6.4 图片懒加载

**目标**：延迟加载图片，减少首屏加载时间

**实现方案**：

```tsx
// components/LazyImage.tsx
import { useState, useEffect, useRef } from 'react';

export const LazyImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
}> = ({ src, alt, placeholder = '/placeholder.png' }) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 图片进入视口，开始加载
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // 提前 50px 开始加载
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);
  
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      onLoad={() => setIsLoaded(true)}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};
```

**性能指标**：
- 首屏图片加载时间：从 2.5s 降至 0.8s
- 带宽节省：约 40%（只加载可见图片）

---

#### 4.6.5 React.memo 和 useMemo 优化

**目标**：避免不必要的组件重新渲染

**优化示例**：

```tsx
// components/MessageBubble.tsx
import DOMPurify from 'dompurify';

export const MessageBubble = React.memo<{ message: Message }>(
  ({ message }) => {
    const isAgent = message.sender_type === 'agent';
    
    // 缓存复杂计算 - 使用 DOMPurify 清理 HTML
    const formattedContent = useMemo(() => {
      const rawHTML = parseMarkdown(message.content);
      return DOMPurify.sanitize(rawHTML);
    }, [message.content]);
    
    // 缓存回调函数
    const handleReply = useCallback(() => {
      replyToMessage(message.message_id);
    }, [message.message_id]);
    
    return (
      <div className={isAgent ? 'bg-blue-50' : ''}>
        {/* 使用 react-markdown 替代 dangerouslySetInnerHTML */}
        <ReactMarkdown>{message.content}</ReactMarkdown>
        <button onClick={handleReply}>Reply</button>
      </div>
    );
  },
  // 自定义比较函数
  (prevProps, nextProps) => {
    return (
      prevProps.message.message_id === nextProps.message.message_id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.updated_at === nextProps.message.updated_at
    );
  }
);
```

**性能指标**：
- 组件重新渲染次数减少 70%
- 页面交互响应时间：从 200ms 降至 50ms

---

#### 4.6.6 WebSocket 消息批处理

**问题**：高频消息推送导致频繁渲染

**解决方案**：批量处理 WebSocket 消息

```tsx
// hooks/useWebSocket.ts
export const useWebSocket = () => {
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    // 消息队列
    const queue: Message[] = [];
    let flushTimer: NodeJS.Timeout | null = null;
    
    // 批量刷新函数
    const flushQueue = () => {
      if (queue.length === 0) return;
      
      // 批量更新 React Query 缓存
      queryClient.setQueryData(['messages'], (old: Message[] = []) => {
        return [...old, ...queue];
      });
      
      queue.length = 0;
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      queue.push(message);
      
      // 清除旧的定时器
      if (flushTimer) clearTimeout(flushTimer);
      
      // 100ms 后批量刷新，或队列达到 10 条立即刷新
      if (queue.length >= 10) {
        flushQueue();
      } else {
        flushTimer = setTimeout(flushQueue, 100);
      }
    };
    
    return () => {
      ws.close();
      if (flushTimer) clearTimeout(flushTimer);
      flushQueue(); // 清空剩余消息
    };
  }, [queryClient]);
};
```

**性能指标**：
- 渲染次数减少 80%（100 条消息从 100 次渲染降至 10 次）
- CPU 占用降低 60%

---

#### 4.6.7 性能监控

**监控指标**：

```tsx
// lib/performance.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

export const initPerformanceMonitoring = () => {
  // Core Web Vitals
  onCLS(metric => sendToAnalytics('CLS', metric.value)); // Cumulative Layout Shift
  onFID(metric => sendToAnalytics('FID', metric.value)); // First Input Delay
  onLCP(metric => sendToAnalytics('LCP', metric.value)); // Largest Contentful Paint
  onFCP(metric => sendToAnalytics('FCP', metric.value)); // First Contentful Paint
  onTTFB(metric => sendToAnalytics('TTFB', metric.value)); // Time to First Byte
  
  // 自定义指标
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        sendToAnalytics('DOM_LOAD', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
        sendToAnalytics('PAGE_LOAD', navEntry.loadEventEnd - navEntry.fetchStart);
      }
    });
  });
  
  observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
};

const sendToAnalytics = (metric: string, value: number) => {
  // 发送到监控服务（如 Sentry、DataDog）
  console.log(`[Performance] ${metric}: ${value.toFixed(2)}ms`);
};
```

**性能预算**：

| 指标 | 目标值 | 警告阈值 | 错误阈值 |
|------|--------|----------|----------|
| **LCP** (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| **FID** (First Input Delay) | <100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |
| **FCP** (First Contentful Paint) | <1.8s | 1.8-3s | >3s |
| **TTFB** (Time to First Byte) | <600ms | 600-1000ms | >1000ms |
| **Bundle Size** | <500KB | 500-800KB | >800KB |

---

### 4.7 测试策略（P1-6）

#### 4.7.1 单元测试

**测试框架**：Vitest + React Testing Library

**测试覆盖率目标**：
- 核心组件：>90%
- Hooks：>85%
- 工具函数：>95%
- 整体覆盖率：>80%

**测试示例**：

```tsx
// components/__tests__/MessageBubble.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

describe('MessageBubble', () => {
  const mockMessage: Message = {
    message_id: 'msg-001',
    content: 'Hello **world**',
    sender_type: 'human',
    sender: { user_id: 'user-001', name: 'Alice' },
    created_at: '2026-05-02T10:00:00Z',
    attachments: []
  };
  
  it('renders message content with markdown', () => {
    render(<MessageBubble message={mockMessage} />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText(/world/)).toHaveStyle({ fontWeight: 'bold' });
  });
  
  it('shows agent badge for agent messages', () => {
    const agentMessage = { ...mockMessage, sender_type: 'agent' };
    render(<MessageBubble message={agentMessage} />);
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });
  
  it('calls reply handler when reply button clicked', () => {
    const onReply = vi.fn();
    render(<MessageBubble message={mockMessage} onReply={onReply} />);
    
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    expect(onReply).toHaveBeenCalledWith(mockMessage.message_id);
  });
});
```

**Hooks 测试**：

```tsx
// hooks/__tests__/useMessages.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMessages } from '../useMessages';

describe('useMessages', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  
  it('fetches messages for a channel', async () => {
    const { result } = renderHook(() => useMessages('channel-001'), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.messages).toHaveLength(10);
  });
  
  it('handles error state', async () => {
    // Mock API error
    vi.spyOn(api, 'getMessages').mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useMessages('channel-001'), { wrapper });
    
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Network error');
  });
});
```

---

#### 4.7.2 集成测试

**目标**：测试多个组件协同工作

**测试示例**：

```tsx
// pages/__tests__/ChatPage.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPage } from '../ChatPage';
import { setupMockServer } from '../../test/mocks/server';

describe('ChatPage Integration', () => {
  beforeAll(() => setupMockServer());
  
  it('loads messages and allows sending new message', async () => {
    render(<ChatPage />);
    
    // 等待消息加载
    await waitFor(() => {
      expect(screen.getByText('Hello from Alice')).toBeInTheDocument();
    });
    
    // 输入新消息
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'New message' } });
    
    // 发送消息
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    
    // 验证乐观更新
    await waitFor(() => {
      expect(screen.getByText('New message')).toBeInTheDocument();
    });
  });
  
  it('converts message to task', async () => {
    render(<ChatPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Fix bug')).toBeInTheDocument();
    });
    
    // 点击转换为任务
    fireEvent.click(screen.getByRole('button', { name: /convert to task/i }));
    
    // 验证任务卡片出现
    await waitFor(() => {
      expect(screen.getByText(/task #/i)).toBeInTheDocument();
    });
  });
});
```

---

#### 4.7.3 E2E 测试

**测试框架**：Playwright

**测试场景**：

```ts
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('user can send message and receive reply', async ({ page }) => {
    await page.goto('http://localhost:3000/chat');
    
    // 登录
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 等待进入聊天页面
    await expect(page.locator('h1')).toContainText('Chat');
    
    // 发送消息
    await page.fill('textarea[placeholder*="Type a message"]', 'Hello @agent');
    await page.click('button:has-text("Send")');
    
    // 验证消息出现
    await expect(page.locator('text=Hello @agent')).toBeVisible();
    
    // 等待 Agent 回复（最多 30 秒）
    await expect(page.locator('.message-bubble.agent')).toBeVisible({ timeout: 30000 });
  });
  
  test('user can claim and update task', async ({ page }) => {
    await page.goto('http://localhost:3000/chat');
    
    // 找到任务卡片
    const taskCard = page.locator('.task-card').first();
    await expect(taskCard).toBeVisible();
    
    // 认领任务
    await taskCard.locator('button:has-text("Claim")').click();
    await expect(taskCard.locator('text=Assigned to: You')).toBeVisible();
    
    // 更新状态
    await taskCard.locator('select[name="status"]').selectOption('in_progress');
    await expect(taskCard.locator('.status-badge')).toContainText('In Progress');
  });
});
```

**测试覆盖的关键用户流程**：
1. 用户登录和认证
2. 发送消息和接收回复
3. 创建和管理任务
4. Agent 交互（唤醒、休眠、发送 DM）
5. OKR 创建和进度更新
6. Workflow 执行和监控

---

#### 4.7.4 API Mock

**工具**：MSW (Mock Service Worker)

**Mock 配置**：

```ts
// test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // 获取消息列表
  rest.get('/api/v1/channels/:channelId/messages', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ok: true,
        data: [
          {
            message_id: 'msg-001',
            content: 'Hello from Alice',
            sender_type: 'human',
            sender: { user_id: 'user-001', name: 'Alice' },
            created_at: '2026-05-02T10:00:00Z'
          }
        ],
        meta: { total: 1, has_more: false }
      })
    );
  }),
  
  // 发送消息
  rest.post('/api/v1/channels/:channelId/messages', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(201),
      ctx.json({
        ok: true,
        data: {
          message_id: 'msg-new',
          content: body.content,
          sender_type: 'human',
          created_at: new Date().toISOString()
        }
      })
    );
  }),
  
  // 认领任务
  rest.post('/api/v1/tasks/:taskId/claim', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ok: true,
        data: { task_id: req.params.taskId, assignee_id: 'user-001' }
      })
    );
  })
];
```

**Mock Server 启动**：

```ts
// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

export const setupMockServer = () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};
```

---

#### 4.7.5 性能测试

**工具**：Lighthouse CI

**配置**：

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173/chat', 'http://localhost:4173/okr'],
      numberOfRuns: 3
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

**CI 集成**：

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

---

#### 4.7.6 测试覆盖率报告

**配置**：

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

**覆盖率目标**：

| 类型 | 目标覆盖率 | 当前覆盖率 |
|------|-----------|-----------|
| **核心组件** | >90% | - |
| **Hooks** | >85% | - |
| **工具函数** | >95% | - |
| **整体** | >80% | - |

---

### 4.8 前端开发规范

本节补充前端开发中的关键规范和最佳实践，解决架构文档中识别的 P1 问题。

---

#### 4.8.1 TypeScript 类型定义规范

**核心原则**：
- 所有 API 响应必须有明确的类型定义
- 避免使用 `any`，优先使用 `unknown` 或具体类型
- 使用类型守卫（type guards）进行运行时类型检查
- 共享类型定义应放在 `src/types/` 目录

**API 响应类型示例**：

```ts
// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 实体类型
export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  agentId: string;
  status: 'running' | 'stopped' | 'error';
  startedAt: string;
  endedAt?: string;
}
```

**类型守卫示例**：

```ts
// src/utils/typeGuards.ts
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ApiResponse<T>).success === 'boolean'
  );
}

export function isPaginatedResponse<T>(
  value: unknown
): value is PaginatedResponse<T> {
  return (
    isApiResponse<T[]>(value) &&
    'pagination' in value &&
    typeof (value as PaginatedResponse<T>).pagination === 'object'
  );
}

// 使用示例
async function fetchAgents(page: number): Promise<Agent[]> {
  const response = await fetch(`/api/agents?page=${page}`);
  const data: unknown = await response.json();
  
  if (!isPaginatedResponse<Agent>(data)) {
    throw new Error('Invalid API response format');
  }
  
  return data.data || [];
}
```

**禁止模式**：

```ts
// ❌ 错误：使用 any
const data: any = await response.json();

// ❌ 错误：未验证类型
const agents = data.data as Agent[];

// ✅ 正确：使用类型守卫
const data: unknown = await response.json();
if (!isPaginatedResponse<Agent>(data)) {
  throw new Error('Invalid response');
}
const agents = data.data || [];
```

---

#### 4.8.2 分页实现指导

**标准分页接口**：

```ts
// src/hooks/usePagination.ts
import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UsePaginationResult {
  pagination: PaginationState;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;
}

export function usePagination(
  initialPage = 1,
  initialPageSize = 20
): UsePaginationResult {
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
  });

  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.totalPages),
    }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => {
      const newTotalPages = Math.ceil(prev.total / size);
      return {
        ...prev,
        pageSize: size,
        totalPages: newTotalPages,
        page: Math.min(prev.page, newTotalPages || 1),
      };
    });
  }, []);

  const setTotal = useCallback((total: number) => {
    setPagination((prev) => ({
      ...prev,
      total,
      totalPages: Math.ceil(total / prev.pageSize),
    }));
  }, []);

  return {
    pagination,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    setTotal,
  };
}
```

**分页组件示例**：

```tsx
// src/components/Pagination.tsx
import React from 'react';
import { UsePaginationResult } from '../hooks/usePagination';

interface PaginationProps {
  pagination: UsePaginationResult['pagination'];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { page, pageSize, total, totalPages } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          显示 {(page - 1) * pageSize + 1} 到{' '}
          {Math.min(page * pageSize, total)} 条，共 {total} 条
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border rounded px-2 py-1"
        >
          <option value={10}>10 条/页</option>
          <option value={20}>20 条/页</option>
          <option value={50}>50 条/页</option>
          <option value={100}>100 条/页</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          首页
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          上一页
        </button>
        <span className="text-sm">
          第 {page} / {totalPages} 页
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          下一页
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          末页
        </button>
      </div>
    </div>
  );
}
```

**完整使用示例**：

```tsx
// src/pages/AgentList.tsx
import React, { useEffect, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import { Pagination } from '../components/Pagination';
import { Agent, PaginatedResponse } from '../types/api';
import { isPaginatedResponse } from '../utils/typeGuards';

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const { pagination, goToPage, setPageSize, setTotal } = usePagination();

  useEffect(() => {
    async function fetchAgents() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/agents?page=${pagination.page}&pageSize=${pagination.pageSize}`
        );
        const data: unknown = await response.json();

        if (!isPaginatedResponse<Agent>(data)) {
          throw new Error('Invalid response format');
        }

        setAgents(data.data || []);
        setTotal(data.pagination.total);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, [pagination.page, pagination.pageSize, setTotal]);

  return (
    <div>
      <div className="agent-list">
        {loading ? (
          <div>加载中...</div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id}>{agent.name}</div>
          ))
        )}
      </div>
      <Pagination
        pagination={pagination}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
```

---

#### 4.8.3 错误处理最佳实践

**错误类型定义**：

```ts
// src/types/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**统一错误处理 Hook**：

```ts
// src/hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { ApiError, NetworkError, ValidationError } from '../types/errors';

export interface ErrorHandlerOptions {
  onError?: (error: Error) => void;
  showNotification?: boolean;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const handleError = useCallback(
    (error: unknown) => {
      let errorMessage = '发生未知错误';
      let errorCode = 'UNKNOWN_ERROR';

      if (error instanceof ApiError) {
        errorMessage = error.message;
        errorCode = error.code;
        
        // 根据状态码处理
        if (error.statusCode === 401) {
          // 跳转到登录页
          window.location.href = '/login';
          return;
        } else if (error.statusCode === 403) {
          errorMessage = '您没有权限执行此操作';
        } else if (error.statusCode === 404) {
          errorMessage = '请求的资源不存在';
        } else if (error.statusCode >= 500) {
          errorMessage = '服务器错误，请稍后重试';
        }
      } else if (error instanceof NetworkError) {
        errorMessage = '网络连接失败，请检查网络设置';
        errorCode = 'NETWORK_ERROR';
      } else if (error instanceof ValidationError) {
        errorMessage = '表单验证失败';
        errorCode = 'VALIDATION_ERROR';
        // 可以在这里处理字段级错误
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // 显示通知
      if (options.showNotification !== false) {
        // 调用通知系统
        console.error(`[${errorCode}] ${errorMessage}`);
      }

      // 调用自定义错误处理
      if (options.onError) {
        options.onError(error as Error);
      }

      return { errorMessage, errorCode };
    },
    [options]
  );

  return { handleError };
}
```

**API 请求封装**：

```ts
// src/utils/api.ts
import { ApiError, NetworkError } from '../types/errors';
import { ApiResponse } from '../types/api';

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const apiResponse = data as ApiResponse<T>;
      throw new ApiError(
        apiResponse.error?.message || 'API request failed',
        apiResponse.error?.code || 'API_ERROR',
        response.status,
        apiResponse.error?.details
      );
    }

    const apiResponse = data as ApiResponse<T>;
    if (!apiResponse.success || !apiResponse.data) {
      throw new ApiError(
        'Invalid API response',
        'INVALID_RESPONSE',
        response.status
      );
    }

    return apiResponse.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('Network request failed', error);
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error',
      'UNKNOWN_ERROR',
      0
    );
  }
}
```

**组件中使用示例**：

```tsx
// src/components/AgentForm.tsx
import React, { useState } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { apiRequest } from '../utils/api';
import { Agent } from '../types/api';

export function AgentForm() {
  const [loading, setLoading] = useState(false);
  const { handleError } = useErrorHandler({ showNotification: true });

  const handleSubmit = async (formData: Partial<Agent>) => {
    setLoading(true);
    try {
      const agent = await apiRequest<Agent>('/api/agents', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      console.log('Agent created:', agent);
      // 成功处理
    } catch (error) {
      const { errorMessage } = handleError(error);
      // 显示错误消息
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit({ name: 'New Agent' });
    }}>
      {/* 表单字段 */}
      <button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交'}
      </button>
    </form>
  );
}
```

---

#### 4.8.4 权限控制实现示例

**权限类型定义**：

```ts
// src/types/permissions.ts
export type Permission =
  | 'agent:read'
  | 'agent:create'
  | 'agent:update'
  | 'agent:delete'
  | 'session:read'
  | 'session:create'
  | 'session:control'
  | 'admin:all';

export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: Role;
  permissions: Permission[];
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['admin:all'],
  operator: [
    'agent:read',
    'agent:create',
    'agent:update',
    'session:read',
    'session:create',
    'session:control',
  ],
  viewer: ['agent:read', 'session:read'],
};
```

**权限检查 Hook**：

```ts
// src/hooks/usePermissions.ts
import { useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Permission, ROLE_PERMISSIONS } from '../types/permissions';

export function usePermissions() {
  const { user } = useContext(AuthContext);

  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!user) return false;

      // Admin 拥有所有权限
      if (user.permissions.includes('admin:all')) {
        return true;
      }

      // 检查用户是否有特定权限
      return user.permissions.includes(permission);
    };
  }, [user]);

  const hasAnyPermission = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      return permissions.some((permission) => hasPermission(permission));
    };
  }, [hasPermission]);

  const hasAllPermissions = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      return permissions.every((permission) => hasPermission(permission));
    };
  }, [hasPermission]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    user,
  };
}
```

**权限保护组件**：

```tsx
// src/components/PermissionGuard.tsx
import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../types/permissions';

interface PermissionGuardProps {
  permission: Permission | Permission[];
  fallback?: ReactNode;
  requireAll?: boolean;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  fallback = null,
  requireAll = false,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

**路由保护示例**：

```tsx
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../types/permissions';

interface ProtectedRouteProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  children: React.ReactElement;
}

export function ProtectedRoute({
  permission,
  requireAll = false,
  children,
}: ProtectedRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, user } = usePermissions();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
```

**使用示例**：

```tsx
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionGuard } from './components/PermissionGuard';

function AgentManagement() {
  return (
    <div>
      <h1>Agent 管理</h1>
      
      {/* 只有有创建权限的用户才能看到创建按钮 */}
      <PermissionGuard permission="agent:create">
        <button>创建 Agent</button>
      </PermissionGuard>

      {/* 只有有删除权限的用户才能看到删除按钮 */}
      <PermissionGuard
        permission="agent:delete"
        fallback={<span className="text-gray-400">无删除权限</span>}
      >
        <button className="text-red-600">删除 Agent</button>
      </PermissionGuard>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* 需要读取权限才能访问 */}
        <Route
          path="/agents"
          element={
            <ProtectedRoute permission="agent:read">
              <AgentManagement />
            </ProtectedRoute>
          }
        />
        
        {/* 需要管理员权限才能访问 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute permission="admin:all">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

**按钮级权限控制**：

```tsx
// src/components/AgentCard.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Agent } from '../types/api';

interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { hasPermission } = usePermissions();

  return (
    <div className="border rounded p-4">
      <h3>{agent.name}</h3>
      <p>状态: {agent.status}</p>
      
      <div className="flex gap-2 mt-4">
        {hasPermission('agent:update') && (
          <button
            onClick={() => onEdit?.(agent)}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            编辑
          </button>
        )}
        
        {hasPermission('agent:delete') && (
          <button
            onClick={() => onDelete?.(agent)}
            className="px-3 py-1 bg-red-500 text-white rounded"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}
```

---


---

### 4.9 错误处理设计

#### 4.9.1 错误分类

**错误类型**：
1. **网络错误**：请求失败、超时、断网
2. **认证错误**：401 未认证、403 无权限
3. **业务错误**：400 参数错误、409 冲突、422 验证失败
4. **服务器错误**：500 服务器内部错误、503 服务不可用
5. **客户端错误**：JavaScript 运行时错误、React 渲染错误

#### 4.9.2 Error Boundary 设计

**全局 Error Boundary**：
```typescript
// shared/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { errorReporter } from '@/lib/error-reporter';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误日志
    logger.error('React Error Boundary caught an error', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });

    // 上报错误到监控系统
    errorReporter.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 使用自定义 fallback 或默认错误 UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>出错了</h2>
            <p>抱歉，页面遇到了一些问题。</p>
            <details>
              <summary>错误详情</summary>
              <pre>{this.state.error.message}</pre>
            </details>
            <button onClick={this.reset}>重试</button>
            <button onClick={() => window.location.href = '/'}>
              返回首页
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**功能域级别的 Error Boundary**：
```typescript
// features/chat/components/ChatErrorBoundary.tsx
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

export const ChatErrorBoundary = ({ children }: { children: ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="chat-error">
          <h3>聊天功能暂时不可用</h3>
          <p>{error.message}</p>
          <button onClick={reset}>重新加载</button>
        </div>
      )}
      onError={(error) => {
        // Chat 功能域特定的错误处理
        console.error('Chat error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

#### 4.9.3 全局错误处理

**全局错误监听**：
```typescript
// lib/error-handler.ts
import { errorReporter } from './error-reporter';
import { logger } from './logger';
import { toast } from '@/shared/components/Toast';

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;

  private constructor() {
    this.setupGlobalHandlers();
  }

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  private setupGlobalHandlers() {
    // 捕获未处理的 Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
      });

      errorReporter.captureException(event.reason, {
        tags: { type: 'unhandled_rejection' },
      });

      // 显示用户友好的错误提示
      toast.error('操作失败，请稍后重试');

      event.preventDefault();
    });

    // 捕获全局 JavaScript 错误
    window.addEventListener('error', (event) => {
      logger.error('Global JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });

      errorReporter.captureException(event.error || new Error(event.message), {
        tags: { type: 'global_error' },
      });

      event.preventDefault();
    });
  }

  // 手动报告错误
  reportError(error: Error, context?: Record<string, any>) {
    logger.error('Manual Error Report', { error, context });
    errorReporter.captureException(error, { extra: context });
  }

  // 显示用户友好的错误消息
  showUserError(error: Error) {
    const userMessage = this.getUserFriendlyMessage(error);
    toast.error(userMessage);
  }

  private getUserFriendlyMessage(error: Error): string {
    // 根据错误类型返回用户友好的消息
    if (error.message.includes('network')) {
      return '网络连接失败，请检查网络';
    }
    if (error.message.includes('timeout')) {
      return '请求超时，请稍后重试';
    }
    if (error.message.includes('unauthorized')) {
      return '登录已过期，请重新登录';
    }
    return '操作失败，请稍后重试';
  }
}

// 初始化全局错误处理
export const globalErrorHandler = GlobalErrorHandler.getInstance();
```

#### 4.9.4 错误上报

**Sentry 集成**：
```typescript
// lib/error-reporter.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initErrorReporter = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.1, // 10% 的请求进行性能追踪
      replaysSessionSampleRate: 0.1, // 10% 的会话记录回放
      replaysOnErrorSampleRate: 1.0, // 100% 的错误会话记录回放
      environment: import.meta.env.MODE,
      beforeSend(event, hint) {
        // 过滤敏感信息
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
        }
        return event;
      },
    });
  }
};

export const errorReporter = {
  captureException: Sentry.captureException,
  captureMessage: Sentry.captureMessage,
  setUser: Sentry.setUser,
  setContext: Sentry.setContext,
};
```

#### 4.9.5 API 错误处理

**统一的 API 错误处理**（已在 01-api-integration.md 中定义）：
```typescript
// lib/api-client.ts
import axios from 'axios';
import { globalErrorHandler } from './error-handler';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// 响应拦截器：统一错误处理
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 401: 未认证，跳转到登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 403: 无权限
    if (error.response?.status === 403) {
      globalErrorHandler.showUserError(new Error('您没有权限执行此操作'));
      return Promise.reject(error);
    }

    // 500: 服务器错误
    if (error.response?.status >= 500) {
      globalErrorHandler.showUserError(new Error('服务器错误，请稍后重试'));
      globalErrorHandler.reportError(error);
      return Promise.reject(error);
    }

    // 网络错误
    if (!error.response) {
      globalErrorHandler.showUserError(new Error('网络连接失败'));
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);
```

#### 4.9.6 用户错误提示

**Toast 通知组件**：
```typescript
// shared/components/Toast.tsx
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  },
  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  },
  warning: (message: string) => {
    sonnerToast.warning(message, {
      duration: 4000,
      position: 'top-right',
    });
  },
  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 3000,
      position: 'top-right',
    });
  },
};
```

---

### 4.10 主题系统设计

#### 4.10.1 主题配置

**Tailwind CSS 主题配置**：
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class', // 使用 class 策略
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌色
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // 灰度色
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      backgroundColor: {
        // 语义化背景色
        'app-bg': 'var(--app-bg)',
        'card-bg': 'var(--card-bg)',
        'hover-bg': 'var(--hover-bg)',
      },
      textColor: {
        // 语义化文本色
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'tertiary': 'var(--text-tertiary)',
      },
      borderColor: {
        // 语义化边框色
        'default': 'var(--border-default)',
        'hover': 'var(--border-hover)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**CSS 变量定义**：
```css
/* shared/styles/theme.css */
:root {
  /* 亮色主题 */
  --app-bg: #ffffff;
  --card-bg: #f9fafb;
  --hover-bg: #f3f4f6;
  
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  
  --border-default: #e5e7eb;
  --border-hover: #d1d5db;
}

.dark {
  /* 暗色主题 */
  --app-bg: #111827;
  --card-bg: #1f2937;
  --hover-bg: #374151;
  
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  
  --border-default: #374151;
  --border-hover: #4b5563;
}
```

#### 4.10.2 主题切换实现

**主题 Store**：
```typescript
// shared/stores/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

// 应用主题到 DOM
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
    useThemeStore.setState({ resolvedTheme: systemTheme });
  } else {
    root.classList.toggle('dark', theme === 'dark');
    useThemeStore.setState({ resolvedTheme: theme });
  }
}

// 监听系统主题变化
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
```

**主题切换组件**：
```typescript
// shared/components/ThemeToggle.tsx
import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '@/shared/stores/themeStore';

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();

  const themes = [
    { value: 'light' as const, icon: Sun, label: '亮色' },
    { value: 'dark' as const, icon: Moon, label: '暗色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md transition-colors
            ${theme === value
              ? 'bg-white dark:bg-gray-700 shadow-sm'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
};
```

#### 4.10.3 主题切换动画

**平滑过渡动画**：
```typescript
// shared/hooks/useThemeTransition.ts
import { useEffect } from 'react';

export const useThemeTransition = () => {
  useEffect(() => {
    // 添加过渡动画
    const style = document.createElement('style');
    style.textContent = `
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);

    // 300ms 后移除过渡，避免影响其他动画
    const timer = setTimeout(() => {
      document.head.removeChild(style);
    }, 300);

    return () => {
      clearTimeout(timer);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
};
```

#### 4.10.4 主题初始化

**在 App.tsx 中初始化主题**：
```typescript
// src/App.tsx
import { useEffect } from 'react';
import { useThemeStore } from '@/shared/stores/themeStore';

export const App = () => {
  const { theme } = useThemeStore();

  // 初始化主题
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    // ... 应用内容
  );
};
```

#### 4.10.5 主题感知组件

**根据主题显示不同内容**：
```typescript
// 示例：Logo 组件根据主题显示不同颜色
export const Logo = () => {
  const { resolvedTheme } = useThemeStore();
  
  return (
    <img
      src={resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Logo"
      className="h-8"
    />
  );
};
```

---

**相关文档更新**：
- [Routing Design](./06-routing-design.md) - 路由设计（新增）
- [Feature Domain Organization](./05-feature-domain-organization.md) - 功能域组织规范

