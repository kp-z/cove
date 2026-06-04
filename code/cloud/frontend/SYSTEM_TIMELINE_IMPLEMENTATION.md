# System Timeline 实现文档

## 概述

实现了一个系统事件时间轴调试功能，用于在 Timeline 组件中可视化 channel 的系统事件，方便开发者追踪消息流动、WebSocket 连接、状态变化等。

## 架构设计

```
┌─────────────────────────────────┐
│   业务代码 (ChannelPanel 等)   │
│   触发系统事件                  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   systemLog.info/error/warn     │
│   (便捷日志接口)                │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  SystemEventStore (Zustand)     │
│  - 存储系统事件 (最多100条/频道)│
│  - 按 channelId 分组            │
│  - 只在开发环境启用             │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  useTimelineNodes               │
│  合并 system 事件到 nodes       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Timeline 组件                  │
│  - System 筛选器可用            │
│  - SystemNodeRenderer 渲染      │
└─────────────────────────────────┘
```

## 核心组件

### 1. 类型定义 (`types/system-event.ts`)

定义了系统事件的类型结构：

- **SystemEventType**: 事件类型枚举
  - WebSocket 事件: `websocket.connected`, `websocket.message_received` 等
  - 消息事件: `message.created_local`, `message.sent`, `message.streaming_start` 等
  - 状态事件: `state.updated`, `state.subscribers_notified` 等
  - 错误事件: `error.network`, `error.validation` 等

- **SystemEventLevel**: 日志级别 (`info`, `warn`, `error`, `debug`)

- **SystemEvent**: 事件数据结构
  ```typescript
  interface SystemEvent {
    id: string;
    type: SystemEventType;
    level: SystemEventLevel;
    timestamp: Date;
    channelId: string;
    message: string;
    metadata?: Record<string, any>;
    stack?: string;
  }
  ```

### 2. 状态管理 (`stores/systemEventStore.ts`)

使用 Zustand 管理系统事件：

```typescript
const useSystemEventStore = create<SystemEventStore>({
  events: Map<string, SystemEvent[]>,  // 按 channelId 分组
  enabled: true,                        // 开发环境默认启用
  maxEventsPerChannel: 100,            // 每个频道最多100条
  
  logEvent: (channelId, type, message, metadata) => void,
  getEvents: (channelId) => SystemEvent[],
  clearEvents: (channelId) => void,
});
```

**特性**：
- 自动判断事件级别 (根据 type 自动推断 error/warn/info/debug)
- 自动限制数量 (保留最新的 100 条事件)
- 同时输出到浏览器控制台 (开发环境)
- 错误事件自动捕获堆栈信息

### 3. 便捷日志接口

```typescript
import { systemLog } from '@/features/channel/stores/systemEventStore';

// 使用方式
systemLog.info(channelId, 'message.sent', 'Message sent successfully', { messageId });
systemLog.error(channelId, 'error.network', 'Failed to connect', { error });
systemLog.warn(channelId, 'state.subscribers_notified', 'No subscribers', {});
```

### 4. Timeline 节点渲染 (`components/Timeline/nodes/SystemNode.tsx`)

**SystemNodeRenderer** 渲染系统事件：

- 图标：Terminal (颜色根据级别变化)
- 标题：事件类型标签 + 精确时间戳 (毫秒级)
- 消息：简短描述
- 可展开：显示 metadata 和 stack trace

**交互特性**：
- 点击展开/折叠详细信息
- Metadata 以 JSON 格式展示
- Stack trace 可滚动查看

### 5. Timeline 集成 (`hooks/useTimelineNodes.ts`)

修改了 `useTimelineNodes` hook：

```typescript
// 获取系统事件
const systemEvents = useSystemEventStore((state) => state.getEvents(channelId));

// 转换为 timeline 节点
systemEvents.forEach((event) => {
  timelineNodes.push({
    type: 'system',
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    data: event,
  });
});
```

## 已集成的事件点

### MessageStateManager

| 位置 | 事件类型 | 说明 |
|------|---------|------|
| `addLocalMessage` | `message.created_local` | 本地消息创建 |
| `updateMessageStatus` (sent) | `message.sent` | 消息发送成功 |
| `updateMessageStatus` (queued) | `message.queued` | 消息排队 |
| `updateMessageStatus` (failed) | `message.failed` | 消息发送失败 |
| `syncRemoteMessages` | `message.synced` | 远程消息同步 |
| `updateStreamingPhase` (thinking/responding) | `message.streaming_phase` | 流式阶段变化 |
| `updateStreamingPhase` (completed) | `message.streaming_complete` | 流式完成 |
| `notifySubscribers` | `state.subscribers_notified` | 通知订阅者 |

### ChannelPanel WebSocket

| 位置 | 事件类型 | 说明 |
|------|---------|------|
| `onMessage.onData` | `websocket.message_received` | 接收消息事件 |
| `onMessage.onData` (agent) | `message.streaming_start` | Agent 流式开始 |
| `onMessage.onError` | `websocket.subscription_error` | 订阅错误 |
| `onChannelMember.onData` | `websocket.message_received` | 成员事件 |
| `onChannelMember.onError` | `websocket.subscription_error` | 成员订阅错误 |

## 使用指南

### 开发者使用

1. **查看系统事件**：
   - 打开 Channel 页面
   - 切换到 Timeline 面板
   - 点击 "System" 筛选器图标 (AlertCircle)
   - 查看所有系统事件

2. **添加新的系统事件**：
   ```typescript
   import { systemLog } from '@/features/channel/stores/systemEventStore';
   
   // 在关键位置添加日志
   systemLog.info(
     channelId,
     'message.sent',  // 选择合适的事件类型
     'Message sent successfully',
     { messageId, timestamp }  // 可选的元数据
   );
   ```

3. **添加新的事件类型**：
   - 编辑 `types/system-event.ts`
   - 在 `SystemEventType` 中添加新类型
   - 在 `getEventTypeLabel` 中添加显示名称

### 用户使用

1. **筛选系统事件**：
   - Timeline 顶部有筛选栏
   - 点击 System 图标 (AlertCircle) 只显示系统事件
   - 可以与其他筛选器组合使用

2. **查看事件详情**：
   - 点击系统事件卡片展开
   - 查看 Metadata (JSON 格式)
   - 查看 Stack Trace (错误事件)

## 配置选项

### 启用/禁用

默认在开发环境启用，生产环境禁用。可以手动控制：

```typescript
const { setEnabled } = useSystemEventStore();
setEnabled(true);  // 启用
setEnabled(false); // 禁用
```

### 调整事件数量限制

```typescript
// 在 systemEventStore.ts 中修改
const MAX_EVENTS_PER_CHANNEL = 100;  // 默认 100 条
```

## 性能考虑

1. **内存限制**：每个频道最多保存 100 条事件，超出自动删除最旧的
2. **按需加载**：只在 Timeline 组件需要时才读取事件
3. **开发环境限定**：默认只在开发环境启用，生产环境无开销
4. **异步存储**：Zustand 更新不会阻塞主线程

## 扩展建议

### 1. 导出功能
添加导出系统日志为 JSON 的功能：

```typescript
function exportSystemLogs(channelId: string) {
  const events = useSystemEventStore.getState().getEvents(channelId);
  const json = JSON.stringify(events, null, 2);
  // 下载或复制到剪贴板
}
```

### 2. 实时搜索
在 Timeline 中添加搜索框，过滤事件：

```typescript
const filteredEvents = events.filter(event =>
  event.message.toLowerCase().includes(searchText.toLowerCase()) ||
  event.type.includes(searchText)
);
```

### 3. 事件统计
显示事件类型分布：

```typescript
const stats = events.reduce((acc, event) => {
  acc[event.type] = (acc[event.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

### 4. 持久化
将事件保存到 localStorage：

```typescript
persist(
  (set, get) => ({ /* store */ }),
  { name: 'system-events' }
)
```

## 技术栈

- **状态管理**: Zustand + Zustand DevTools
- **UI 组件**: Lucide Icons + Tailwind CSS
- **类型安全**: TypeScript strict mode
- **React Hooks**: useMemo, useEffect

## 文件清单

```
src/features/channel/
├── types/
│   └── system-event.ts              # 事件类型定义
├── stores/
│   └── systemEventStore.ts          # Zustand store
├── components/
│   └── Timeline/
│       ├── nodes/
│       │   ├── SystemNode.tsx       # 节点渲染器
│       │   └── index.ts             # 导出
│       └── hooks/
│           ├── useTimelineNodes.ts  # 集成系统事件
│           └── useNodeRegistry.ts   # 注册渲染器
└── domain/
    └── MessageStateManager.ts       # 集成 systemLog
```

## 测试建议

1. **单元测试**: 测试 systemEventStore 的状态管理逻辑
2. **集成测试**: 测试事件在 Timeline 中的显示
3. **E2E 测试**: 测试完整的消息发送流程和事件记录

## 未来改进

- [ ] 添加事件过滤器 (按级别、类型)
- [ ] 支持事件导出 (JSON/CSV)
- [ ] 添加事件统计面板
- [ ] 支持实时搜索
- [ ] 添加时间线播放功能
- [ ] 支持事件标注和高亮
