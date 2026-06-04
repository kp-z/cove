# Agent 回复流程分析 (DM 场景)

## 📊 当前流程概览

### 完整流程图

```
用户发送消息
    ↓
前端: useSendMessage.send()
    ↓
创建本地消息 (optimistic update)
    ↓
发送到后端 API: message.send
    ↓
后端: MessageRouter.send()
    ↓
保存消息到数据库
    ↓
发布事件: message.created
    ↓
    ├─→ WebSocket 通知前端
    │   (所有订阅该 channel 的客户端)
    │
    └─→ 触发 Agent DM Handler
        (检测到 DM channel + human 消息)
            ↓
        Agent DM Service 处理
            ↓
        通过 Local Device 调用 Agent
            ↓
        Agent 开始处理 (Claude API)
            ↓
        流式响应开始
            ↓
    ┌───────┴───────┐
    │               │
Thinking        Tool Use
    │               │
    └───────┬───────┘
            ↓
        Responding (流式输出)
            ↓
        Completed
            ↓
        保存 Agent 消息
            ↓
        发布事件: message.created
            ↓
        WebSocket 通知前端
```

## 🔍 详细阶段分析

### 阶段 1: 用户发送消息

**前端代码**: `useSendMessage.ts`

```typescript
// 1. 创建本地消息 (pending)
const localMessage = Message.createLocal({...});
messageStateManager.addLocalMessage(localMessage);

// 2. 标记为 sending
messageStateManager.updateMessageStatus(tempId, 'sending');

// 3. 发送到后端
const result = await mutation.mutateAsync({
  channelId,
  senderId: userId,
  senderType: 'human',
  content,
});

// 4. 标记为 sent，记录 remoteId
messageStateManager.updateMessageStatus(tempId, 'sent');
```

**系统日志**:
- `[INFO] Message Created (Local)`
- `[INFO] Message Sending`
- `[INFO] Message Sent`

### 阶段 2: 后端接收消息

**后端代码**: `message.router.ts`

```typescript
// 1. 保存消息
const message = await messageService.create({
  channelId,
  senderId,
  senderType: 'human',
  content,
});

// 2. 发布事件
eventBus.publish('message.created', {
  channelId,
  message,
});

// 3. 通过 WebSocket 通知所有订阅者
```

### 阶段 3: 触发 Agent 响应

**后端代码**: `agent-dm.handler.ts`

```typescript
// 监听 message.created 事件
eventBus.on('message.created', async (event) => {
  const { channelId, message } = event;
  
  // 检查条件:
  // 1. 是 DM channel (metadata.agent_id 存在)
  // 2. 发送者是 human
  // 3. 不是 Agent 自己的消息
  
  if (isDMChannel && message.sender_type === 'human') {
    // 调用 Agent DM Service
    await agentDMService.handleUserMessage({
      channelId,
      messageId: message.message_id,
      content: message.content,
    });
  }
});
```

### 阶段 4: Agent 处理消息

**后端代码**: `agent-dm.service.ts`

```typescript
async handleUserMessage(params) {
  // 1. 获取 channel 信息和 agent 配置
  const channel = await getChannel(channelId);
  const agentId = channel.metadata?.agent_id;
  const agent = await getAgent(agentId);
  
  // 2. 通过 Local Device 调用 Agent
  const response = await localDeviceClient.executeAgent({
    agentId,
    channelId,
    messageId,
    content,
  });
  
  // 3. 流式响应处理 (通过 WebSocket)
  // - thinking
  // - tool_use
  // - responding
  // - completed
}
```

### 阶段 5: 前端接收流式响应

**前端代码**: `ChannelPanel/index.tsx` + `useAgentStreaming.ts`

#### 5.1 监听消息创建事件

```typescript
// ChannelPanel/index.tsx
trpc.subscription.onMessage.useSubscription({
  channelId: channel_id,
  events: ['message.created'],
}, {
  onData: (event) => {
    // 检测到 Agent 消息
    if (event.data.sender_type === 'agent') {
      setStreamingMessageId(event.data.message_id);
      // 开始监听流式更新
    }
    
    // 刷新消息列表
    queryClient.invalidateQueries(...);
  }
});
```

#### 5.2 订阅 Agent 流式事件

```typescript
// useAgentStreaming.ts
trpc.subscription.onAgentResponse.useSubscription({
  channelId,
  events: [
    'agent.response.accepted',
    'agent.response.thinking',
    'agent.response.streaming',
    'agent.response.completed',
  ],
}, {
  onData: (event) => {
    switch (event.eventType) {
      case 'agent.response.thinking':
        // 更新 thinking 内容
        messageStateManager.updateStreamingData(messageId, {
          thinking: event.data.thinking
        });
        break;
        
      case 'agent.response.streaming':
        // 追加流式内容
        messageStateManager.appendStreamingContent(
          messageId,
          event.data.chunk
        );
        break;
        
      case 'agent.response.completed':
        // 标记完成
        messageStateManager.updateStreamingPhase(
          messageId,
          'completed'
        );
        break;
    }
  }
});
```

#### 5.3 UI 实时更新

```typescript
// MessageBubbleNew.tsx
{message.status === 'streaming' && (
  <>
    {/* 显示 Thinking */}
    {message.streamingData?.thinking && (
      <AgentThinking thinking={message.streamingData.thinking} />
    )}
    
    {/* 显示 Tool Use */}
    {message.streamingData?.currentTool && (
      <ToolCallIndicator tool={message.streamingData.currentTool} />
    )}
    
    {/* 显示流式内容 */}
    <StreamingContent content={message.streamingData?.partialContent} />
  </>
)}
```

## ⚠️  当前问题

### 问题 1: 双重订阅导致混乱
**位置**: `ChannelPanel/index.tsx` + `useAgentStreaming.ts`

**问题描述**:
- 同时使用了 `useAgentStreaming` 和 `useMessageStreaming`
- `streamingMessageId` 状态管理不清晰
- 两个订阅可能收到重复事件

**当前代码**:
```typescript
// ChannelPanel/index.tsx
useAgentStreaming(channel_id);  // 订阅 1
const streamingState = useMessageStreaming(streamingMessageId);  // 订阅 2
```

### 问题 2: 流式完成后延迟清理
**位置**: `ChannelPanel/index.tsx`

**问题描述**:
- 使用 setTimeout 延迟 1 秒清理
- 可能导致状态不一致

**当前代码**:
```typescript
useEffect(() => {
  if (streamingState.status === 'completed' && streamingMessageId) {
    setTimeout(() => {
      setStreamingMessageId(null);
    }, 1000);  // 为什么需要延迟?
  }
}, [streamingState.status, streamingMessageId]);
```

### 问题 3: invalidateQueries 导致不必要的重新查询
**位置**: `ChannelPanel/index.tsx`

**问题描述**:
- 每次收到 WebSocket 事件都 invalidateQueries
- 导致重新查询整个消息列表
- 应该直接更新 MessageStateManager

**当前代码**:
```typescript
onData: (event) => {
  // 每次都重新查询
  queryClient.invalidateQueries({
    queryKey: [['message', 'list'], { input: { channelId: channel_id } }],
  });
}
```

### 问题 4: useMessageStreaming 的 messageId 参数问题
**位置**: `useAgentStreaming.ts`

**问题描述**:
- `onMessageStreaming` 订阅需要具体的 messageId
- 但在 `useAgentStreaming` 中设为空字符串并禁用
- 无法工作

**当前代码**:
```typescript
trpc.subscription.onMessageStreaming.useSubscription({
  messageId: '',  // 空字符串!
}, {
  enabled: false,  // 禁用!
  onData: (event) => {
    // 这段代码永远不会执行
  }
});
```

## ✅ 改进方案

### 方案 1: 统一流式订阅 (推荐)

只使用 `useAgentStreaming`，移除 `useMessageStreaming`：

```typescript
// ChannelPanel/index.tsx
useAgentStreaming(channel_id);

// 移除这两行:
// const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
// const streamingState = useMessageStreaming(streamingMessageId);

// 移除 streamingMessageId 的设置
```

### 方案 2: 直接更新 MessageStateManager

不要 invalidateQueries，直接更新状态：

```typescript
onData: (event) => {
  if (event.eventType === 'message.created') {
    // 将 WebSocket 消息转换为 Message 对象
    const message = Message.fromRemote(event.data);
    
    // 直接添加到 MessageStateManager
    messageStateManager.syncRemoteMessages(channel_id, [message]);
    
    // 不需要 invalidateQueries
  }
}
```

### 方案 3: 立即清理流式状态

使用事件而不是 setTimeout：

```typescript
// 在 MessageStateManager 中
updateStreamingPhase(id: string, phase: StreamingPhase): void {
  // ...更新状态...
  
  if (phase === 'completed') {
    // 立即清理流式数据
    this.cleanupStreamingData(id);
  }
}
```

### 方案 4: 修复 onMessageStreaming 订阅

要么移除它，要么正确使用：

```typescript
// 选项 A: 移除 (推荐)
// 删除整个 onMessageStreaming 订阅

// 选项 B: 动态订阅
function useMessageStreamingDynamic(messageId: string | null) {
  trpc.subscription.onMessageStreaming.useSubscription({
    messageId: messageId || '',
  }, {
    enabled: !!messageId,
    onData: (event) => {
      // 处理流式事件
    }
  });
}
```

## 📋 推荐的流程 (简化版)

```
用户发送消息
    ↓
前端: pending → sending → sent
    ↓
后端: 保存消息 → 发布 message.created
    ↓
    ├─→ WebSocket → 前端 → MessageStateManager.syncRemoteMessages()
    │                     (直接更新，不 invalidate)
    │
    └─→ Agent DM Handler → Local Device → Agent 处理
                                              ↓
                            WebSocket: agent.response.* 事件
                                              ↓
                            前端: useAgentStreaming 统一处理
                                              ↓
                            MessageStateManager 更新流式状态
                                              ↓
                            UI 实时显示 (thinking/tool/content)
                                              ↓
                            完成: agent.response.completed
                                              ↓
                            立即清理流式数据
```

## 🎯 下一步行动

1. **P0 - 移除双重订阅**
   - 移除 `useMessageStreaming`
   - 只保留 `useAgentStreaming`

2. **P0 - 直接更新而不是 invalidate**
   - WebSocket 事件直接调用 `syncRemoteMessages`
   - 减少网络请求

3. **P1 - 立即清理流式状态**
   - 移除 setTimeout
   - 事件驱动清理

4. **P2 - 修复或移除 onMessageStreaming**
   - 评估是否需要
   - 如果需要，修复 messageId 传递

## 📝 测试检查清单

- [ ] 用户发送消息，Agent 立即开始响应
- [ ] Thinking 阶段正确显示
- [ ] Tool Use 正确显示
- [ ] 流式内容实时追加
- [ ] 完成后状态立即清理
- [ ] 没有重复的消息
- [ ] 没有不必要的网络请求
