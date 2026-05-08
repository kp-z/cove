# Frontend API Integration (前端 API 集成)

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `API映射`, `React Query`, `WebSocket`, `Backend Service`, `Frontend Hook`, `状态管理`, `错误处理`, `重试机制`, `乐观更新`

**本文档包含**:
- 完整的 Backend Service ↔ Frontend Hook 映射表
- 每个核心服务的 API 端点和前端调用方式
- React Query 配置和缓存策略
- WebSocket 消息格式规范
- 错误处理和重试机制
- 乐观更新和回滚策略

**适用场景**:
- 需要了解某个后端服务对应的前端 Hook
- 查找特定功能的 API 调用方式
- 设计新的 API 集成
- 处理 API 错误和重试逻辑
- 实现乐观更新

**相关文档**:
- [Backend API](../03-infrastructure/04-backend-api.md) - 后端 API 完整设计
- [Presentation Layer](./frontend-layer.md) - 前端架构设计
- [Domain Layer](../01-domain/models/README.md) - 实体定义

---

## 1. Backend Service ↔ Frontend Hook 完整映射表

### 1.1 核心服务映射

| Backend Service | Frontend Hook | 主要方法 | React Query Key | 说明 |
|----------------|---------------|---------|----------------|------|
| **ProjectService** | `useProject` | `getProject`<br>`updateProject`<br>`listProjects`<br>`createProject`<br>`deleteProject` | `['projects']`<br>`['project', projectId]` | 项目 CRUD 操作 |
| **UserService** | `useUser` | `getUser`<br>`updateUser`<br>`getUserProfile`<br>`updateUserSettings` | `['users']`<br>`['user', userId]` | 用户管理 |
| **DeviceService** | `useDevice` | `getDevice`<br>`listDevices`<br>`updateDeviceStatus` | `['devices']`<br>`['device', deviceId]` | 设备管理 |
| **ChannelService** | `useChannel` | `getChannel`<br>`createChannel`<br>`updateChannel`<br>`addMember`<br>`removeMember`<br>`listChannelMembers` | `['channels']`<br>`['channel', channelId]`<br>`['channel', channelId, 'members']` | 频道管理 |
| **MessageService** | `useMessage` | `sendMessage`<br>`editMessage`<br>`deleteMessage`<br>`addReaction`<br>`convertToTask`<br>`listMessages` | `['messages', channelId]`<br>`['message', messageId]` | 消息管理 |
| **TaskService** | `useTask` | `createTask`<br>`claimTask`<br>`unclaimTask`<br>`updateTaskStatus`<br>`addTaskComment`<br>`listTasks` | `['tasks', channelId]`<br>`['task', taskId]` | 任务管理 |
| **OKRService** | `useOKR` | `createOKR`<br>`updateOKR`<br>`updateKRProgress`<br>`linkWorkflow`<br>`listProjectOKRs` | `['okrs', projectId]`<br>`['okr', okrId]` | OKR 管理 |
| **WorkflowService** | `useWorkflow` | `createWorkflow`<br>`updateWorkflow`<br>`startWorkflow`<br>`stopWorkflow`<br>`listWorkflows` | `['workflows']`<br>`['workflow', workflowId]` | 工作流管理 |
| **ExecutionService** | `useExecution` | `getExecution`<br>`getExecutionLogs`<br>`listExecutions`<br>`cancelExecution` | `['executions', agentId]`<br>`['execution', executionId]`<br>`['execution', executionId, 'logs']` | 执行记录 |
| **AgentRuntimeService** | `useAgent` | `startAgent`<br>`stopAgent`<br>`getAgentStatus`<br>`exportAgentState`<br>`importAgentState`<br>`listAgents` | `['agents']`<br>`['agent', agentId]`<br>`['agent', agentId, 'status']` | Agent 运行时 |
| **ServerService** | `useServer` | `createServer`<br>`startServer`<br>`stopServer`<br>`deleteServer`<br>`getServerStatus` | `['servers']`<br>`['server', serverId]` | Server 管理 |

---

## 2. 详细 API 端点和 Hook 实现

### 2.1 ProjectService ↔ useProject

**Backend API 端点**:
```typescript
GET    /api/v1/projects              // 列出所有项目
GET    /api/v1/projects/:id           // 获取项目详情
POST   /api/v1/projects               // 创建项目
PUT    /api/v1/projects/:id           // 更新项目
DELETE /api/v1/projects/:id           // 删除项目
GET    /api/v1/projects/:id/okrs      // 获取项目的 OKRs
GET    /api/v1/projects/:id/channels  // 获取项目的频道
```

**Frontend Hook 实现**:
```typescript
// frontend/src/hooks/useProject.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';

export function useProject(projectId?: string) {
  const queryClient = useQueryClient();

  // 获取单个项目
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.get<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });

  // 创建项目
  const createProject = useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiClient.post<Project>('/projects', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // 更新项目
  const updateProject = useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      apiClient.put<Project>(`/projects/${projectId}`, input),
    onSuccess: (data) => {
      queryClient.setQueryData(['project', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // 删除项目
  const deleteProject = useMutation({
    mutationFn: () => apiClient.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.removeQueries({ queryKey: ['project', projectId] });
    },
  });

  return {
    project,
    isLoading,
    error,
    createProject: createProject.mutate,
    updateProject: updateProject.mutate,
    deleteProject: deleteProject.mutate,
    isCreating: createProject.isPending,
    isUpdating: updateProject.isPending,
    isDeleting: deleteProject.isPending,
  };
}

// 列出所有项目
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<Project[]>('/projects'),
    staleTime: 5 * 60 * 1000,
  });
}
```

---

### 2.2 MessageService ↔ useMessage

**Backend API 端点**:
```typescript
GET    /api/v1/channels/:channelId/messages       // 获取消息列表（分页）
POST   /api/v1/channels/:channelId/messages       // 发送消息
PUT    /api/v1/messages/:id                       // 编辑消息
DELETE /api/v1/messages/:id                       // 删除消息
POST   /api/v1/messages/:id/reactions             // 添加 Reaction
POST   /api/v1/messages/:id/convert-to-task       // 转换为任务
```

**Frontend Hook 实现**:
```typescript
// frontend/src/hooks/useMessage.ts

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Message, SendMessageInput } from '@/types';

export function useMessages(channelId: string) {
  const queryClient = useQueryClient();

  // 无限滚动消息列表
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: ({ pageParam }) =>
      apiClient.get<{ messages: Message[]; nextCursor: string | null }>(
        `/channels/${channelId}/messages`,
        { params: { limit: 50, before: pageParam } }
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 1 * 60 * 1000, // 1 分钟
  });

  // 发送消息（乐观更新）
  const sendMessage = useMutation({
    mutationFn: (input: SendMessageInput) =>
      apiClient.post<Message>(`/channels/${channelId}/messages`, input),
    onMutate: async (newMessage) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

      // 保存之前的数据
      const previousMessages = queryClient.getQueryData(['messages', channelId]);

      // 乐观更新
      queryClient.setQueryData(['messages', channelId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: [
            {
              messages: [
                {
                  id: `temp-${Date.now()}`,
                  ...newMessage,
                  created_at: new Date().toISOString(),
                  status: 'sending',
                },
                ...old.pages[0].messages,
              ],
              nextCursor: old.pages[0].nextCursor,
            },
            ...old.pages.slice(1),
          ],
        };
      });

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // 回滚
      queryClient.setQueryData(['messages', channelId], context?.previousMessages);
    },
    onSuccess: () => {
      // 重新获取以确保数据一致
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  // 编辑消息
  const editMessage = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      apiClient.put<Message>(`/messages/${messageId}`, { content }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  // 删除消息
  const deleteMessage = useMutation({
    mutationFn: (messageId: string) =>
      apiClient.delete(`/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  // 添加 Reaction
  const addReaction = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiClient.post(`/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  // 转换为任务
  const convertToTask = useMutation({
    mutationFn: (messageId: string) =>
      apiClient.post(`/messages/${messageId}/convert-to-task`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', channelId] });
    },
  });

  const messages = data?.pages.flatMap((page) => page.messages) ?? [];

  return {
    messages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sendMessage: sendMessage.mutate,
    editMessage: editMessage.mutate,
    deleteMessage: deleteMessage.mutate,
    addReaction: addReaction.mutate,
    convertToTask: convertToTask.mutate,
    isSending: sendMessage.isPending,
  };
}
```

---

### 2.3 TaskService ↔ useTask

**Backend API 端点**:
```typescript
GET    /api/v1/channels/:channelId/tasks    // 获取任务列表
POST   /api/v1/tasks                        // 创建任务
POST   /api/v1/tasks/:id/claim              // 认领任务
POST   /api/v1/tasks/:id/unclaim            // 取消认领
PUT    /api/v1/tasks/:id/status             // 更新任务状态
POST   /api/v1/tasks/:id/comments           // 添加评论
```

**Frontend Hook 实现**:
```typescript
// frontend/src/hooks/useTask.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Task, CreateTaskInput } from '@/types';

export function useTasks(channelId: string) {
  const queryClient = useQueryClient();

  // 获取任务列表
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', channelId],
    queryFn: () => apiClient.get<Task[]>(`/channels/${channelId}/tasks`),
    staleTime: 2 * 60 * 1000, // 2 分钟
  });

  // 创建任务
  const createTask = useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiClient.post<Task>('/tasks', { ...input, channel_id: channelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', channelId] });
    },
  });

  // 认领任务（乐观更新 + 冲突处理）
  const claimTask = useMutation({
    mutationFn: (taskId: string) =>
      apiClient.post<Task>(`/tasks/${taskId}/claim`),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', channelId] });
      const previousTasks = queryClient.getQueryData(['tasks', channelId]);

      // 乐观更新
      queryClient.setQueryData(['tasks', channelId], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === taskId
            ? { ...task, assignee_id: 'current-user-id', status: 'in_progress' }
            : task
        );
      });

      return { previousTasks };
    },
    onError: (err: any, taskId, context) => {
      // 回滚
      queryClient.setQueryData(['tasks', channelId], context?.previousTasks);
      
      // 处理冲突错误
      if (err.response?.status === 409) {
        // 任务已被其他人认领
        alert('任务已被其他人认领');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', channelId] });
    },
  });

  // 更新任务状态
  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      apiClient.put<Task>(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', channelId] });
    },
  });

  return {
    tasks,
    isLoading,
    createTask: createTask.mutate,
    claimTask: claimTask.mutate,
    updateTaskStatus: updateTaskStatus.mutate,
    isCreating: createTask.isPending,
    isClaiming: claimTask.isPending,
  };
}
```

---

### 2.4 AgentRuntimeService ↔ useAgent

**Backend API 端点**:
```typescript
GET    /api/v1/agents                      // 列出所有 Agent
GET    /api/v1/agents/:id                  // 获取 Agent 详情
GET    /api/v1/agents/:id/status           // 获取 Agent 状态
POST   /api/v1/agents/:id/start            // 启动 Agent
POST   /api/v1/agents/:id/stop             // 停止 Agent
POST   /api/v1/agents/:id/export-state     // 导出 Agent 状态
POST   /api/v1/agents/:id/import-state     // 导入 Agent 状态
GET    /api/v1/agents/:id/executions       // 获取 Agent 执行记录
```

**Frontend Hook 实现**:
```typescript
// frontend/src/hooks/useAgent.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Agent, AgentStatus, AgentState } from '@/types';

export function useAgent(agentId?: string) {
  const queryClient = useQueryClient();

  // 获取 Agent 详情
  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => apiClient.get<Agent>(`/agents/${agentId}`),
    enabled: !!agentId,
    staleTime: 3 * 60 * 1000, // 3 分钟
  });

  // 获取 Agent 状态（轮询）
  const { data: status } = useQuery({
    queryKey: ['agent', agentId, 'status'],
    queryFn: () => apiClient.get<AgentStatus>(`/agents/${agentId}/status`),
    enabled: !!agentId,
    refetchInterval: 5000, // 每 5 秒轮询一次
    staleTime: 0, // 始终视为过期，确保轮询
  });

  // 启动 Agent
  const startAgent = useMutation({
    mutationFn: () => apiClient.post(`/agents/${agentId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId, 'status'] });
    },
  });

  // 停止 Agent
  const stopAgent = useMutation({
    mutationFn: () => apiClient.post(`/agents/${agentId}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId, 'status'] });
    },
  });

  // 导出 Agent 状态
  const exportState = useMutation({
    mutationFn: () =>
      apiClient.post<AgentState>(`/agents/${agentId}/export-state`),
    onSuccess: (data) => {
      // 下载状态文件
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-${agentId}-state-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  // 导入 Agent 状态
  const importState = useMutation({
    mutationFn: (state: AgentState) =>
      apiClient.post(`/agents/${agentId}/import-state`, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId, 'status'] });
    },
  });

  return {
    agent,
    status,
    isLoading,
    startAgent: startAgent.mutate,
    stopAgent: stopAgent.mutate,
    exportState: exportState.mutate,
    importState: importState.mutate,
    isStarting: startAgent.isPending,
    isStopping: stopAgent.isPending,
    isExporting: exportState.isPending,
    isImporting: importState.isPending,
  };
}

// 列出所有 Agent
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.get<Agent[]>('/agents'),
    staleTime: 5 * 60 * 1000,
  });
}

// 获取频道内的 Agent
export function useChannelAgents(channelId: string) {
  return useQuery({
    queryKey: ['channel', channelId, 'agents'],
    queryFn: () => apiClient.get<Agent[]>(`/channels/${channelId}/agents`),
    staleTime: 2 * 60 * 1000,
  });
}
```

---

## 3. React Query 全局配置

```typescript
// frontend/src/lib/react-query-config.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 默认缓存时间：5 分钟
      staleTime: 5 * 60 * 1000,
      // 默认缓存保留时间：10 分钟
      cacheTime: 10 * 60 * 1000,
      // 窗口重新获得焦点时重新获取
      refetchOnWindowFocus: true,
      // 网络重新连接时重新获取
      refetchOnReconnect: true,
      // 默认重试 3 次
      retry: 3,
      // 重试延迟（指数退避）
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 默认重试 1 次
      retry: 1,
    },
  },
});
```

---

## 4. API Client 实现

```typescript
// frontend/src/lib/api-client.ts

import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加认证 token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    // 401: 未认证，跳转到登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    // 403: 无权限
    if (error.response?.status === 403) {
      console.error('Permission denied');
    }

    // 409: 冲突（如任务已被认领）
    if (error.response?.status === 409) {
      console.warn('Conflict:', error.response.data);
    }

    // 500: 服务器错误
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T, T>(url, config),
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.post<T, T>(url, data, config),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    axiosInstance.put<T, T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T, T>(url, config),
};
```

---

## 5. 错误分类和处理

```typescript
// frontend/src/lib/error-handler.ts

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export function classifyError(error: any): ErrorType {
  if (!error.response) {
    return ErrorType.NETWORK_ERROR;
  }

  const status = error.response.status;

  if (status === 401) return ErrorType.AUTH_ERROR;
  if (status === 403) return ErrorType.PERMISSION_ERROR;
  if (status === 400 || status === 422) return ErrorType.VALIDATION_ERROR;
  if (status === 409) return ErrorType.CONFLICT_ERROR;
  if (status >= 500) return ErrorType.SERVER_ERROR;

  return ErrorType.UNKNOWN_ERROR;
}

export function getErrorMessage(error: any): string {
  const errorType = classifyError(error);

  const messages: Record<ErrorType, string> = {
    [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络',
    [ErrorType.AUTH_ERROR]: '认证失败，请重新登录',
    [ErrorType.PERMISSION_ERROR]: '权限不足',
    [ErrorType.VALIDATION_ERROR]: error.response?.data?.message || '输入数据无效',
    [ErrorType.CONFLICT_ERROR]: error.response?.data?.message || '操作冲突',
    [ErrorType.SERVER_ERROR]: '服务器错误，请稍后重试',
    [ErrorType.UNKNOWN_ERROR]: '未知错误',
  };

  return messages[errorType];
}
```

---

## 6. 总结

### 6.1 关键设计原则

1. **统一的 Hook 命名规范**：`use<EntityName>` 或 `use<EntityName>s`
2. **React Query Key 规范**：`[entityType, ...identifiers]`
3. **乐观更新 + 回滚**：提升用户体验，同时保证数据一致性
4. **错误分类处理**：根据错误类型给出不同的用户提示
5. **缓存策略**：根据数据更新频率设置不同的 staleTime

### 6.2 下一步

- 阅读 [功能调用流程](./02-feature-flows.md) 了解完整的功能调用链路
- 阅读 [状态导出导入 UI](./03-state-export-import-ui.md) 了解具体功能的 UI 设计
- 阅读 [飞书集成前端](./04-feishu-integration-ui.md) 了解外部集成的前端实现

小张人呢？
