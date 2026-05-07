---
title: 功能域组织规范
version: 1.0.0
last_updated: 2026-05-07
status: approved
author: FrontendEngineer
related_docs:
  - frontend-layer.md
  - 01-api-integration.md
  - 02-feature-flows.md
---

# 功能域组织规范

## 1. 概述

本文档定义 V4 前端代码的功能域（Feature Domain）组织方式，替代传统的技术分层组织。

### 1.1 设计原则

- **按功能域组织**：相关代码聚合在一起，降低认知负担
- **高内聚低耦合**：每个功能域独立完整，通过明确接口通信
- **渐进式增强**：支持从简单到复杂的演进路径
- **类型安全**：TypeScript 严格模式，完整的类型定义

### 1.2 与现有文档的关系

- `frontend-layer.md`：前端层主文档，定义整体架构和核心组件
- `01-api-integration.md`：定义 Backend Service ↔ Frontend Hook 映射
- `02-feature-flows.md`：定义核心功能的调用流程和时序图
- 本文档：定义代码组织方式和目录结构规范

---

## 2. 目录结构

```
frontend/src/
├── features/              # 功能域目录
│   ├── chat/             # 聊天功能域
│   │   ├── components/   # 功能域专用组件
│   │   │   ├── ChatPage.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ThreadPanel.tsx
│   │   ├── hooks/        # 功能域专用 hooks
│   │   │   ├── useMessages.ts
│   │   │   ├── useThreads.ts
│   │   │   └── useChatWebSocket.ts
│   │   ├── stores/       # 功能域状态管理
│   │   │   └── chatStore.ts
│   │   ├── types/        # 功能域类型定义
│   │   │   └── chat.types.ts
│   │   ├── api/          # 功能域 API 调用
│   │   │   └── chatApi.ts
│   │   ├── utils/        # 功能域工具函数
│   │   │   └── messageFormatter.ts
│   │   └── constants/    # 功能域常量
│   │       └── chatConstants.ts
│   │
│   ├── task/             # 任务功能域
│   │   ├── components/
│   │   │   ├── TaskPage.tsx
│   │   │   ├── TaskBoard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskDetail.tsx
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   └── useTaskWebSocket.ts
│   │   ├── stores/
│   │   │   └── taskStore.ts
│   │   ├── types/
│   │   │   └── task.types.ts
│   │   ├── api/
│   │   │   └── taskApi.ts
│   │   ├── utils/
│   │   │   └── taskStatusHelper.ts
│   │   └── constants/
│   │       └── taskConstants.ts
│   │
│   ├── agent/            # Agent 功能域
│   │   ├── components/
│   │   │   ├── AgentBar.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentDetail.tsx
│   │   │   └── ResourceMonitor.tsx
│   │   ├── hooks/
│   │   │   ├── useAgents.ts
│   │   │   ├── useAgentStatus.ts
│   │   │   └── useAgentWebSocket.ts
│   │   ├── stores/
│   │   │   └── agentStore.ts
│   │   ├── types/
│   │   │   └── agent.types.ts
│   │   ├── api/
│   │   │   └── agentApi.ts
│   │   ├── utils/
│   │   │   └── agentStatusHelper.ts
│   │   └── constants/
│   │       └── agentConstants.ts
│   │
│   ├── okr/              # OKR 功能域
│   │   ├── components/
│   │   │   ├── OKRPage.tsx
│   │   │   ├── OKRTree.tsx
│   │   │   ├── OKRCard.tsx
│   │   │   └── ProgressChart.tsx
│   │   ├── hooks/
│   │   │   ├── useOKRs.ts
│   │   │   └── useOKRWebSocket.ts
│   │   ├── stores/
│   │   │   └── okrStore.ts
│   │   ├── types/
│   │   │   └── okr.types.ts
│   │   ├── api/
│   │   │   └── okrApi.ts
│   │   ├── utils/
│   │   │   └── okrCalculator.ts
│   │   └── constants/
│   │       └── okrConstants.ts
│   │
│   └── feishu/           # 飞书集成功能域
│       ├── components/
│       │   ├── FeishuLoginButton.tsx
│       │   ├── FeishuUserMapping.tsx
│       │   └── FeishuSyncStatus.tsx
│       ├── hooks/
│       │   ├── useFeishuAuth.ts
│       │   └── useFeishuSync.ts
│       ├── stores/
│       │   └── feishuStore.ts
│       ├── types/
│       │   └── feishu.types.ts
│       ├── api/
│       │   └── feishuApi.ts
│       ├── utils/
│       │   └── feishuTokenHelper.ts
│       └── constants/
│           └── feishuConstants.ts
│
├── shared/               # 共享资源
│   ├── components/       # 通用 UI 组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   └── Toast.tsx
│   ├── hooks/            # 通用 hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useWebSocket.ts
│   ├── types/            # 共享类型定义
│   │   ├── common.types.ts
│   │   ├── api.types.ts
│   │   └── websocket.types.ts
│   └── styles/           # 全局样式
│       ├── theme.ts
│       ├── global.css
│       └── variables.css
│
├── lib/                  # 工具库
│   ├── api-client.ts     # HTTP 客户端封装
│   ├── websocket-client.ts  # WebSocket 客户端封装
│   ├── event-bus.ts      # 功能域间事件总线
│   ├── logger.ts         # 日志工具
│   └── error-handler.ts  # 错误处理工具
│
├── config/               # 配置文件
│   ├── env.ts            # 环境变量
│   ├── routes.ts         # 路由配置
│   └── api-endpoints.ts  # API 端点配置
│
├── App.tsx               # 应用入口
├── main.tsx              # 渲染入口
└── router.tsx            # 路由定义
```

---

## 3. 功能域结构规范

### 3.1 必需目录

每个功能域必须包含以下目录：

#### 3.1.1 `components/`
- **用途**：功能域专用的 React 组件
- **命名**：PascalCase，如 `ChatPage.tsx`、`MessageList.tsx`
- **导出**：每个文件导出一个主组件，可选导出子组件
- **示例**：
  ```typescript
  // features/chat/components/MessageList.tsx
  export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
    // ...
  };
  ```

#### 3.1.2 `hooks/`
- **用途**：功能域专用的自定义 hooks
- **命名**：camelCase，以 `use` 开头，如 `useMessages.ts`
- **职责**：封装业务逻辑、API 调用、状态管理
- **示例**：
  ```typescript
  // features/chat/hooks/useMessages.ts
  export const useMessages = (channelId: string) => {
    const { data, isLoading, error } = useQuery({
      queryKey: ['messages', channelId],
      queryFn: () => chatApi.getMessages(channelId),
    });
    return { messages: data, isLoading, error };
  };
  ```

#### 3.1.3 `stores/`
- **用途**：功能域的状态管理（Zustand）
- **命名**：camelCase，以 `Store` 结尾，如 `chatStore.ts`
- **职责**：管理功能域的全局状态
- **示例**：
  ```typescript
  // features/chat/stores/chatStore.ts
  export const useChatStore = create<ChatStore>((set) => ({
    activeChannelId: null,
    setActiveChannelId: (id) => set({ activeChannelId: id }),
  }));
  ```

#### 3.1.4 `types/`
- **用途**：功能域的 TypeScript 类型定义
- **命名**：camelCase，以 `.types.ts` 结尾，如 `chat.types.ts`
- **职责**：定义功能域专用的接口、类型、枚举
- **示例**：
  ```typescript
  // features/chat/types/chat.types.ts
  export interface Message {
    id: string;
    content: string;
    senderId: string;
    channelId: string;
    createdAt: string;
  }
  
  export type MessageStatus = 'sending' | 'sent' | 'failed';
  ```

### 3.2 可选目录

根据功能域复杂度，可选择性添加以下目录：

#### 3.2.1 `api/`
- **用途**：功能域的 API 调用封装
- **命名**：camelCase，以 `Api` 结尾，如 `chatApi.ts`
- **职责**：封装 HTTP 请求，返回类型化数据
- **示例**：
  ```typescript
  // features/chat/api/chatApi.ts
  export const chatApi = {
    getMessages: async (channelId: string): Promise<Message[]> => {
      const response = await apiClient.get(`/channels/${channelId}/messages`);
      return response.data;
    },
    sendMessage: async (channelId: string, content: string): Promise<Message> => {
      const response = await apiClient.post(`/channels/${channelId}/messages`, { content });
      return response.data;
    },
  };
  ```

#### 3.2.2 `utils/`
- **用途**：功能域专用的工具函数
- **命名**：camelCase，描述性名称，如 `messageFormatter.ts`
- **职责**：纯函数，无副作用，可测试
- **示例**：
  ```typescript
  // features/chat/utils/messageFormatter.ts
  export const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };
  ```

#### 3.2.3 `constants/`
- **用途**：功能域的常量定义
- **命名**：camelCase，以 `Constants` 结尾，如 `chatConstants.ts`
- **职责**：定义魔法数字、配置项、枚举值
- **示例**：
  ```typescript
  // features/chat/constants/chatConstants.ts
  export const CHAT_CONSTANTS = {
    MAX_MESSAGE_LENGTH: 5000,
    TYPING_INDICATOR_TIMEOUT: 3000,
    MESSAGE_BATCH_SIZE: 50,
  } as const;
  ```

---

## 4. 共享资源规范

### 4.1 `shared/components/`
- **用途**：跨功能域复用的通用 UI 组件
- **原则**：无业务逻辑，高度可配置
- **示例**：Button、Input、Modal、Dropdown、Toast

### 4.2 `shared/hooks/`
- **用途**：跨功能域复用的通用 hooks
- **原则**：通用逻辑，无功能域依赖
- **示例**：useDebounce、useLocalStorage、useWebSocket

### 4.3 `shared/types/`
- **用途**：跨功能域共享的类型定义
- **原则**：基础类型、API 响应类型、WebSocket 消息类型
- **示例**：
  ```typescript
  // shared/types/common.types.ts
  export interface PaginationParams {
    page: number;
    pageSize: number;
  }
  
  export interface ApiResponse<T> {
    data: T;
    message: string;
    code: number;
  }
  ```

---

## 5. 工具库规范

### 5.1 `lib/api-client.ts`
- **用途**：HTTP 客户端封装（基于 Axios）
- **职责**：请求拦截、响应拦截、错误处理、Token 注入

### 5.2 `lib/websocket-client.ts`
- **用途**：WebSocket 客户端封装
- **职责**：连接管理、重连策略、消息分发、心跳检测

### 5.3 `lib/event-bus.ts`（新增）
- **用途**：功能域间事件通信
- **职责**：发布/订阅模式，解耦功能域间依赖
- **示例**：
  ```typescript
  // lib/event-bus.ts
  type EventCallback = (data: any) => void;
  
  class EventBus {
    private events: Map<string, EventCallback[]> = new Map();
    
    on(event: string, callback: EventCallback) {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      this.events.get(event)!.push(callback);
    }
    
    emit(event: string, data: any) {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.forEach(cb => cb(data));
      }
    }
    
    off(event: string, callback: EventCallback) {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }
  
  export const eventBus = new EventBus();
  ```

### 5.4 `lib/logger.ts`
- **用途**：统一日志工具
- **职责**：分级日志、环境过滤、格式化输出

### 5.5 `lib/error-handler.ts`
- **用途**：全局错误处理
- **职责**：错误捕获、错误上报、用户提示

---

## 6. 功能域间通信

### 6.1 通信方式

功能域间通信遵循以下优先级：

1. **Props 传递**（最优）
   - 适用场景：父子组件通信
   - 示例：`<TaskCard task={task} onUpdate={handleUpdate} />`

2. **Event Bus**（推荐）
   - 适用场景：跨功能域事件通知
   - 示例：
     ```typescript
     // features/chat/components/MessageInput.tsx
     import { eventBus } from '@/lib/event-bus';
     
     const handleSendMessage = () => {
       // 发送消息后通知任务功能域
       eventBus.emit('message:sent', { channelId, messageId });
     };
     
     // features/task/hooks/useTasks.ts
     useEffect(() => {
       const handleMessageSent = (data: { channelId: string; messageId: string }) => {
         // 刷新任务列表
         refetch();
       };
       eventBus.on('message:sent', handleMessageSent);
       return () => eventBus.off('message:sent', handleMessageSent);
     }, []);
     ```

3. **全局状态**（谨慎使用）
   - 适用场景：真正的全局状态（如用户信息、主题设置）
   - 示例：`useAuthStore`、`useThemeStore`

### 6.2 事件命名规范

- **格式**：`<domain>:<action>`
- **示例**：
  - `message:sent` - 消息发送完成
  - `task:updated` - 任务更新完成
  - `agent:status_changed` - Agent 状态变化
  - `okr:progress_updated` - OKR 进度更新

---

## 7. 类型安全规范

### 7.1 严格模式

所有功能域必须启用 TypeScript 严格模式：

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 7.2 类型导出

- **功能域类型**：从 `types/` 目录导出
- **共享类型**：从 `shared/types/` 目录导出
- **API 类型**：与 Backend 保持一致，参考 `01-api-integration.md`

### 7.3 类型命名

- **接口**：PascalCase，如 `Message`、`Task`、`Agent`
- **类型别名**：PascalCase，如 `MessageStatus`、`TaskPriority`
- **枚举**：PascalCase，如 `AgentStatus`、`OKRType`

---

## 8. 代码示例

### 8.1 完整功能域示例：Chat

```typescript
// features/chat/types/chat.types.ts
export interface Message {
  id: string;
  content: string;
  senderId: string;
  channelId: string;
  createdAt: string;
  status: MessageStatus;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

// features/chat/api/chatApi.ts
import { apiClient } from '@/lib/api-client';
import type { Message } from '../types/chat.types';

export const chatApi = {
  getMessages: async (channelId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/channels/${channelId}/messages`);
    return response.data;
  },
  sendMessage: async (channelId: string, content: string): Promise<Message> => {
    const response = await apiClient.post(`/channels/${channelId}/messages`, { content });
    return response.data;
  },
};

// features/chat/hooks/useMessages.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { eventBus } from '@/lib/event-bus';

export const useMessages = (channelId: string) => {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => chatApi.getMessages(channelId),
  });
  
  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(channelId, content),
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      eventBus.emit('message:sent', { channelId, messageId: newMessage.id });
    },
  });
  
  return {
    messages: data ?? [],
    isLoading,
    error,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
};

// features/chat/components/MessageList.tsx
import React from 'react';
import type { Message } from '../types/chat.types';
import { formatMessageTime } from '../utils/messageFormatter';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message-item">
          <div className="message-content">{message.content}</div>
          <div className="message-time">{formatMessageTime(message.createdAt)}</div>
        </div>
      ))}
    </div>
  );
};

// features/chat/components/ChatPage.tsx
import React from 'react';
import { useMessages } from '../hooks/useMessages';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export const ChatPage: React.FC = () => {
  const channelId = 'channel-123'; // 从路由获取
  const { messages, isLoading, sendMessage, isSending } = useMessages(channelId);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="chat-page">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} isSending={isSending} />
    </div>
  );
};
```

---

## 9. 迁移指南

### 9.1 从技术分层到功能域

**旧结构**：
```
src/
├── components/
│   ├── ChatPage.tsx
│   ├── TaskPage.tsx
│   └── AgentBar.tsx
├── hooks/
│   ├── useMessages.ts
│   ├── useTasks.ts
│   └── useAgents.ts
└── stores/
    ├── chatStore.ts
    ├── taskStore.ts
    └── agentStore.ts
```

**新结构**：
```
src/
├── features/
│   ├── chat/
│   │   ├── components/ChatPage.tsx
│   │   ├── hooks/useMessages.ts
│   │   └── stores/chatStore.ts
│   ├── task/
│   │   ├── components/TaskPage.tsx
│   │   ├── hooks/useTasks.ts
│   │   └── stores/taskStore.ts
│   └── agent/
│       ├── components/AgentBar.tsx
│       ├── hooks/useAgents.ts
│       └── stores/agentStore.ts
```

### 9.2 迁移步骤

1. **创建功能域目录**：`mkdir -p src/features/{chat,task,agent,okr,feishu}`
2. **移动组件**：将相关组件移动到对应功能域的 `components/` 目录
3. **移动 hooks**：将相关 hooks 移动到对应功能域的 `hooks/` 目录
4. **移动 stores**：将相关 stores 移动到对应功能域的 `stores/` 目录
5. **创建类型文件**：提取类型定义到 `types/` 目录
6. **更新导入路径**：使用路径别名 `@/features/chat/...`
7. **测试验证**：确保所有功能正常工作

---

## 10. 最佳实践

### 10.1 功能域划分原则

- **按业务功能划分**，不按技术层次划分
- **高内聚**：相关代码放在一起
- **低耦合**：通过接口和事件通信
- **独立部署**：每个功能域可独立开发和测试

### 10.2 代码组织原则

- **就近原则**：相关代码放在一起，减少跨目录查找
- **单一职责**：每个文件只做一件事
- **显式依赖**：通过 import 明确依赖关系
- **避免循环依赖**：功能域间不应相互导入组件或 hooks

### 10.3 性能优化

- **代码分割**：每个功能域独立打包，按需加载
- **懒加载**：使用 `React.lazy()` 和 `Suspense`
- **缓存策略**：合理使用 React Query 的缓存机制
- **虚拟滚动**：长列表使用 `react-window` 或 `react-virtualized`

### 10.4 测试策略

- **单元测试**：测试 hooks、utils、stores
- **组件测试**：使用 React Testing Library
- **集成测试**：测试功能域的完整流程
- **E2E 测试**：测试关键用户路径

---

## 11. 工具配置

### 11.1 路径别名

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/features/*": ["src/features/*"],
      "@/shared/*": ["src/shared/*"],
      "@/lib/*": ["src/lib/*"],
      "@/config/*": ["src/config/*"]
    }
  }
}
```

### 11.2 ESLint 规则

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../features/*"],
            "message": "功能域间不应直接导入，请使用 Event Bus 或共享状态"
          }
        ]
      }
    ]
  }
}
```

---

## 12. 常见问题

### Q1: 功能域间如何共享组件？

**A**: 将通用组件提取到 `shared/components/`，功能域专用组件保留在功能域内。

### Q2: 功能域间如何通信？

**A**: 优先使用 Event Bus，避免直接导入其他功能域的代码。

### Q3: 如何避免功能域过大？

**A**: 当功能域超过 10 个文件时，考虑拆分为子功能域或提取共享逻辑。

### Q4: 如何处理跨功能域的状态？

**A**: 将真正的全局状态提取到 `shared/stores/`，功能域状态保留在功能域内。

---

## 13. 参考资料

- [Feature-Sliced Design](https://feature-sliced.design/)
- [React 项目结构最佳实践](https://react.dev/learn/thinking-in-react)
- [TypeScript 严格模式指南](https://www.typescriptlang.org/tsconfig#strict)
- [Zustand 状态管理](https://zustand-demo.pmnd.rs/)
- [React Query 数据获取](https://tanstack.com/query/latest)
