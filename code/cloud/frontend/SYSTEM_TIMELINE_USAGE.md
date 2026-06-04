# System Timeline 使用指南

## 快速开始

### 1. 查看系统事件

打开应用后，进入任意 Channel：

1. **找到 Timeline 面板**（Channel 右侧的中间面板）
2. **点击筛选栏中的 System 图标**（AlertCircle 图标）
3. **查看系统事件流**

### 2. 系统事件示例

当你在 Channel 中发送消息时，Timeline 会显示：

```
[message.created_local] 10:23:45.123
Created local message: Hello world...

[message.queued] 10:23:45.234
Message queued

[websocket.message_received] 10:23:45.456
Received message.created event

[message.sent] 10:23:45.567
Message sent successfully

[state.subscribers_notified] 10:23:45.678
Notified 2 subscribers with 15 messages
```

### 3. 查看详细信息

点击任意系统事件卡片，展开查看：

- **Metadata**：事件相关的数据（JSON 格式）
- **Stack Trace**：错误事件的堆栈信息

## 开发者集成

### 在代码中添加系统日志

```typescript
import { systemLog } from '@/features/channel/stores/systemEventStore';

// 基本用法
systemLog.info(
  channelId,
  'message.sent',
  'Message sent successfully'
);

// 带元数据
systemLog.info(
  channelId,
  'message.sent',
  'Message sent successfully',
  { 
    messageId: 'msg-123',
    timestamp: new Date(),
    retryCount: 0
  }
);

// 错误日志（自动捕获堆栈）
systemLog.error(
  channelId,
  'error.network',
  'Failed to send message',
  { error: error.message }
);

// 警告日志
systemLog.warn(
  channelId,
  'state.subscribers_notified',
  'No subscribers found'
);
```

### 可用的事件类型

#### WebSocket 事件
- `websocket.connected` - WebSocket 连接成功
- `websocket.disconnected` - WebSocket 断开连接
- `websocket.error` - WebSocket 错误
- `websocket.message_received` - 接收到 WebSocket 消息
- `websocket.subscription_started` - 订阅开始
- `websocket.subscription_error` - 订阅错误

#### 消息生命周期事件
- `message.created_local` - 本地创建消息（optimistic update）
- `message.sent` - 消息发送成功
- `message.queued` - 消息进入队列
- `message.failed` - 消息发送失败
- `message.synced` - 远程消息同步完成
- `message.streaming_start` - Agent 流式响应开始
- `message.streaming_phase` - 流式响应阶段变化
- `message.streaming_complete` - 流式响应完成

#### 状态管理事件
- `state.updated` - 状态更新
- `state.subscribers_notified` - 通知订阅者
- `state.cleanup` - 状态清理

#### 错误事件
- `error.network` - 网络错误
- `error.validation` - 验证错误
- `error.unknown` - 未知错误

### 添加自定义事件类型

1. 编辑 `src/features/channel/types/system-event.ts`
2. 在 `SystemEventType` 中添加新类型：

```typescript
export type SystemEventType =
  // ... 现有类型
  | 'custom.my_event'  // 添加自定义事件
  | 'custom.another_event';
```

3. 在 `getEventTypeLabel` 中添加显示名称：

```typescript
const labels: Record<SystemEventType, string> = {
  // ... 现有标签
  'custom.my_event': 'My Custom Event',
  'custom.another_event': 'Another Event',
};
```

4. 在代码中使用：

```typescript
systemLog.info(
  channelId,
  'custom.my_event',
  'My custom event occurred',
  { customData: 'value' }
);
```

## 调试技巧

### 1. 追踪消息流动

发送一条消息，观察系统事件序列：

```
1. message.created_local    (本地创建)
2. message.queued           (进入队列)
3. websocket.message_received (后端确认)
4. message.sent             (发送成功)
5. state.subscribers_notified (UI 更新)
```

### 2. 诊断连接问题

查看 WebSocket 相关事件：

- `websocket.connected` - 连接正常
- `websocket.subscription_error` - 订阅失败
- `websocket.disconnected` - 连接断开

### 3. 监控 Agent 响应

追踪 Agent 流式响应：

```
1. message.streaming_start     (开始)
2. message.streaming_phase     (thinking)
3. message.streaming_phase     (tool_use)
4. message.streaming_phase     (responding)
5. message.streaming_complete  (完成)
```

### 4. 查找错误

筛选错误事件：

1. 点击 System 筛选器
2. 查看红色的错误事件
3. 展开查看 Stack Trace 和 Metadata

## 性能优化

### 控制日志输出

生产环境自动禁用，开发环境默认启用。手动控制：

```typescript
import { useSystemEventStore } from '@/features/channel/stores/systemEventStore';

// 禁用系统日志
useSystemEventStore.getState().setEnabled(false);

// 启用系统日志
useSystemEventStore.getState().setEnabled(true);
```

### 清理旧事件

```typescript
import { useSystemEventStore } from '@/features/channel/stores/systemEventStore';

// 清理指定 channel 的事件
useSystemEventStore.getState().clearEvents(channelId);

// 清理所有事件
useSystemEventStore.getState().clearAllEvents();
```

## 常见问题

### Q: 为什么看不到系统事件？

A: 检查以下几点：
1. 确保在开发环境（`NODE_ENV=development`）
2. 确认 System 筛选器已启用
3. 检查是否有触发相关事件的操作

### Q: 系统事件太多怎么办？

A: 
- 每个 channel 最多保存 100 条事件
- 超出后自动删除最旧的事件
- 可以手动清理：`clearEvents(channelId)`

### Q: 可以在生产环境使用吗？

A: 
- 默认在生产环境禁用
- 如需启用，调用 `setEnabled(true)`
- 建议只在必要时临时启用

### Q: 如何导出系统日志？

A:
```typescript
const events = useSystemEventStore.getState().getEvents(channelId);
const json = JSON.stringify(events, null, 2);
console.log(json);
// 或复制到剪贴板
navigator.clipboard.writeText(json);
```

## 最佳实践

### 1. 合理选择事件类型

- 使用现有的事件类型
- 遵循命名约定：`category.action`
- 消息相关用 `message.*`
- WebSocket 相关用 `websocket.*`
- 状态相关用 `state.*`
- 错误相关用 `error.*`

### 2. 提供有意义的消息

```typescript
// ❌ 不好
systemLog.info(channelId, 'message.sent', 'sent');

// ✅ 好
systemLog.info(
  channelId,
  'message.sent',
  'Message sent successfully',
  { messageId, timestamp }
);
```

### 3. 包含关键元数据

```typescript
systemLog.error(
  channelId,
  'error.network',
  'Failed to fetch messages',
  {
    url: '/api/messages',
    status: 500,
    retryCount: 3,
    error: error.message
  }
);
```

### 4. 避免过度日志

只在关键位置添加日志：
- 状态转换点
- 网络请求
- 错误边界
- 重要的业务逻辑

### 5. 使用合适的日志级别

- `info`: 正常的业务流程
- `warn`: 需要注意但不影响功能
- `error`: 错误和异常
- `debug`: 详细的调试信息（很少使用）

## 示例场景

### 场景 1: 追踪消息发送流程

```typescript
// Composer.tsx
systemLog.info(channelId, 'message.created_local', 'User typing message', { length: content.length });

// MessageStateManager.ts
systemLog.info(channelId, 'message.queued', 'Message added to queue', { queueSize: 5 });

// useSendMessage.ts
systemLog.info(channelId, 'message.sent', 'Message sent to backend', { messageId });

// ChannelPanel/index.tsx (WebSocket)
systemLog.info(channelId, 'websocket.message_received', 'Backend confirmed', { eventType });
```

### 场景 2: 调试订阅问题

```typescript
// ChannelPanel/index.tsx
trpc.subscription.onMessage.useSubscription(
  { channelId, events: [...] },
  {
    onData: (event) => {
      systemLog.info(channelId, 'websocket.subscription_started', 'Subscription active');
    },
    onError: (error) => {
      systemLog.error(channelId, 'websocket.subscription_error', error.message, { error });
    },
  }
);
```

### 场景 3: 监控性能

```typescript
const startTime = Date.now();

// ... 执行操作

const duration = Date.now() - startTime;
systemLog.info(
  channelId,
  'state.updated',
  `State update completed in ${duration}ms`,
  { duration, itemsCount }
);
```

## 进阶功能

### 自定义事件过滤

Timeline 组件支持多种筛选方式：

1. **按类型筛选**：点击 System 图标只显示系统事件
2. **按时间筛选**：使用时间范围筛选器
3. **搜索筛选**：在搜索框中输入关键词

### 编程方式访问事件

```typescript
import { useSystemEventStore } from '@/features/channel/stores/systemEventStore';

function MyComponent({ channelId }) {
  const events = useSystemEventStore((state) => state.getEvents(channelId));
  
  // 获取最近的错误
  const recentErrors = events
    .filter(e => e.level === 'error')
    .slice(0, 5);
  
  // 统计事件类型
  const stats = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div>
      <h3>Recent Errors: {recentErrors.length}</h3>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}
```

## 相关文档

- [系统架构文档](./SYSTEM_TIMELINE_IMPLEMENTATION.md)
- [Timeline 组件文档](./src/features/channel/components/Timeline/README.md)
- [Agent Metadata 文档](./AGENT_METADATA_IMPLEMENTATION.md)
