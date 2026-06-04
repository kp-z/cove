# Message 各阶段逻辑分析与改进方案

## 📊 当前消息流程

### 1. 发送消息阶段
```
用户输入 → Composer.handleSend()
           ↓
      useSendMessage.send()
           ↓
   创建本地消息 (tempId, status: pending)
           ↓
   MessageStateManager.addLocalMessage()
           ↓
      检查网络状态
           ↓
    ┌─────┴─────┐
    │           │
  在线        离线
    │           │
    ↓           ↓
发送到后端   进入队列 (status: queued)
    │
    ↓
  成功/失败
    │
    ↓
标记为 sent/failed
```

### 2. WebSocket 接收阶段
```
后端消息事件 → trpc.subscription.onMessage
                    ↓
            ChannelPanel 监听到事件
                    ↓
         invalidateQueries (刷新消息列表)
                    ↓
         useMessages 重新获取数据
                    ↓
      MessageStateManager.syncRemoteMessages()
                    ↓
         合并去重 → 通知 UI 更新
```

## ⚠️  识别的问题

### 问题 1: 消息去重逻辑不够健壮
**位置**: `MessageStateManager.syncRemoteMessages()`

**问题描述**:
- 当前通过 `content` + `timestamp` (5秒误差) 来匹配本地和远程消息
- 如果两条消息内容相同且时间接近，会误判为重复
- tempId 和 messageId 之间没有明确的映射关系

**当前代码**:
```typescript
const localMsg = Array.from(this.localMessages.values()).find(
  (m) =>
    m.tempId &&
    m.content === msg.content &&
    m.channelId === channelId &&
    Math.abs(m.timestamp.getTime() - msg.timestamp.getTime()) < 5000
);
```

**改进方案**:
1. 后端返回消息时应该包含 tempId (如果是本地发送的)
2. 使用 tempId 作为主要匹配条件
3. content + timestamp 作为备选方案

### 问题 2: 本地消息状态不一致
**位置**: `MessageStateManager.updateMessageStatus()`

**问题描述**:
- 本地消息标记为 `sent` 后仍在 localMessages Map 中
- 5秒后才清理，期间存在两份消息（local + remote）
- 容易导致 UI 显示重复消息

**当前代码**:
```typescript
// 清理已完成的本地消息（5秒后）
cleanupCompletedMessages(): void {
  const now = Date.now();
  Array.from(this.localMessages.entries()).forEach(([id, msg]) => {
    if (msg.status === 'sent' && now - msg.timestamp.getTime() > 5000) {
      this.localMessages.delete(id);
      this.notifySubscribers(msg.channelId);
    }
  });
}
```

**改进方案**:
1. 消息标记为 `sent` 后立即从 localMessages 移除
2. 或者在 getMessages() 中更智能地去重
3. 不依赖定时器，改为事件驱动

### 问题 3: WebSocket 事件处理不完整
**位置**: `ChannelPanel/index.tsx`

**问题描述**:
- WebSocket 收到 `message.created` 事件后，只是 invalidateQueries
- 没有直接更新 MessageStateManager
- 导致需要重新查询才能看到消息
- 延迟和网络开销

**当前代码**:
```typescript
onData: (event) => {
  // 只做了 invalidate，没有直接添加消息
  queryClient.invalidateQueries({
    queryKey: [['message', 'list'], { input: { channelId: channel_id } }],
  });
},
```

**改进方案**:
1. WebSocket 事件直接调用 MessageStateManager.syncRemoteMessages()
2. 将 WebSocket 消息转换为 Message 对象
3. 立即更新 UI，不需要重新查询

### 问题 4: Agent 消息流式更新逻辑混乱
**位置**: `ChannelPanel/index.tsx` + `useAgentStreaming`

**问题描述**:
- 同时使用了两个订阅：`useAgentStreaming` 和 `useMessageStreaming`
- `streamingMessageId` 状态管理不清晰
- 流式完成后的清理逻辑有延迟
- 没有明确的状态机

**当前代码**:
```typescript
// 订阅 Agent 流式更新
useAgentStreaming(channel_id);

// 流式更新订阅
const streamingState = useMessageStreaming(streamingMessageId);

// 当流式完成时，清理状态
useEffect(() => {
  if (streamingState.status === 'completed' && streamingMessageId) {
    setTimeout(() => {
      setStreamingMessageId(null);
    }, 1000);
  }
}, [streamingState.status, streamingMessageId]);
```

**改进方案**:
1. 统一流式更新入口，只用一个订阅
2. 建立明确的状态机：thinking → tool_use → responding → completed
3. 立即清理，不用 setTimeout
4. MessageStateManager 统一管理流式状态

### 问题 5: 消息队列与状态同步脱节
**位置**: `MessageQueue.ts` + `useSendMessage.ts`

**问题描述**:
- MessageQueue 通过 CustomEvent 通知发送
- useSendMessage 没有监听队列的 send 事件
- 队列消息可能永远不会被发送

**当前代码**:
```typescript
// MessageQueue.ts
private async sendMessage(msg: QueuedMessage): Promise<void> {
  window.dispatchEvent(new CustomEvent('queue:send-message', { detail: msg }));
  // ...等待 queue:message-sent 事件
}

// useSendMessage.ts - 没有监听 queue:send-message
```

**改进方案**:
1. 在 useSendMessage 中监听 `queue:send-message` 事件
2. 或者让 MessageQueue 直接调用 MessageStateManager
3. 使用更明确的依赖注入，而不是全局事件

### 问题 6: 消息状态转换不完整
**位置**: `Message.ts`

**问题描述**:
- 缺少 `sending` 状态
- pending 和 sent 之间没有中间状态
- 无法区分"正在发送"和"等待发送"

**当前状态定义**:
```typescript
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'deleted' | 'queued' | 'streaming';
```

**改进方案**:
```typescript
export type MessageStatus = 
  | 'pending'    // 等待发送
  | 'sending'    // 正在发送 (NEW)
  | 'sent'       // 已发送成功
  | 'failed'     // 发送失败
  | 'queued'     // 进入队列
  | 'deleted'    // 已删除
  | 'streaming'; // 流式更新中
```

## ✅ 改进方案总结

### 优先级 P0 (必须修复)

1. **修复消息去重逻辑**
   - 使用 tempId 作为主要匹配
   - 后端返回 tempId
   - 改进时间戳匹配算法

2. **修复本地消息清理**
   - 标记为 sent 后立即移除
   - 不依赖定时器
   - 事件驱动清理

3. **修复队列消息发送**
   - 监听 queue:send-message 事件
   - 或重构为直接调用

### 优先级 P1 (重要改进)

4. **优化 WebSocket 事件处理**
   - 直接更新 MessageStateManager
   - 减少不必要的查询
   - 降低延迟

5. **添加 sending 状态**
   - 完善状态转换
   - 更好的 UI 反馈

### 优先级 P2 (后续优化)

6. **统一流式更新逻辑**
   - 建立状态机
   - 简化订阅逻辑
   - 统一管理

## 🎯 建议的实施顺序

1. 先修复 P0 问题（去重、清理、队列）
2. 添加 sending 状态
3. 优化 WebSocket 处理
4. 重构流式更新（可选）

## 📝 测试检查清单

修复后需要验证：
- [ ] 快速连续发送多条消息，不出现重复
- [ ] 离线发送消息，上线后自动发送
- [ ] 消息状态正确显示（pending → sending → sent）
- [ ] WebSocket 消息立即显示，无延迟
- [ ] Agent 流式响应流畅，无卡顿
- [ ] Timeline 显示完整的消息生命周期

