# Timeline 组件集成指南

## ✅ 已完成的集成

### 1. ChannelPage 集成

Timeline 组件已成功集成到 ChannelPage，替换了原有的 ThreadTimeline 组件。

**文件**: `src/features/channel/components/ChannelPage.tsx`

**主要改动**:
- ✅ 导入新的 Timeline 组件
- ✅ 使用 `useTimelineNodes` hook 获取混合数据（messages + threads）
- ✅ 实现节点点击事件处理（联动 ChannelPanel）
- ✅ 保持原有的布局和交互逻辑

### 2. 数据适配层

**文件**: `src/features/channel/components/Timeline/hooks/useTimelineNodes.ts`

**功能**:
- ✅ 从两个数据源获取数据：
  - `useMessages(channelId)` - 获取顶层消息
  - `useChannelThreads(channelId)` - 获取对话线程
- ✅ 将数据转换为统一的 TimelineNode 格式
- ✅ 按时间倒序排序（最新的在前）
- ✅ 统一的加载和错误状态处理

### 3. 节点类型

**Message 节点** (实心圆 ●):
```typescript
{
  type: 'message',
  id: message_id,
  timestamp: created_at,
  data: {
    message_id,
    content,
    sender: { user_id, display_name, avatar }
  }
}
```

**Thread 节点** (空心圆 ○):
```typescript
{
  type: 'thread',
  id: thread_id,
  timestamp: last_reply_at,
  data: {
    thread_id,
    parent_message_id,
    title,
    reply_count,
    last_reply_at
  }
}
```

---

## 🎯 交互行为

### 点击 Message 节点
- 打开 ChannelPanel
- 显示该频道的消息列表
- TODO: 滚动到特定消息（需要扩展 ChannelPanel 功能）

### 点击 Thread 节点
- 选择该 Thread（更新 URL 参数）
- 打开 ChannelPanel
- 显示 Thread 的回复列表

---

## 📊 数据流

```
ChannelPage
    │
    ├─→ useTimelineNodes(channelId)
    │       │
    │       ├─→ useMessages(channelId)          [tRPC]
    │       │       └─→ backend: message.list
    │       │
    │       └─→ useChannelThreads(channelId)    [tRPC]
    │               └─→ backend: thread.listByChannel
    │
    └─→ Timeline Component
            │
            ├─→ useNodeRegistry()               [注册节点渲染器]
            │
            ├─→ groupNodesByDate(nodes)         [按日期分组]
            │
            └─→ useVirtualizer()                [虚拟滚动]
                    │
                    └─→ MessageNode / ThreadNode [渲染节点]
```

---

## 🔧 后续优化建议

### 1. 后端 API 优化
当前前端需要调用两个 API 并合并数据，建议后端提供统一的 timeline API：

```typescript
// 推荐的后端 API
interface TimelineRequest {
  channelId: string;
  limit?: number;
  cursor?: string;
}

interface TimelineResponse {
  items: Array<{
    type: 'message' | 'thread';
    id: string;
    timestamp: string;
    data: MessageData | ThreadData;
  }>;
  nextCursor?: string;
}

// tRPC 路由
timeline: {
  list: publicProcedure
    .input(z.object({ channelId: z.string(), ... }))
    .query(async ({ input }) => {
      // 后端合并 messages 和 threads，按时间排序
      return { items, nextCursor };
    })
}
```

**优势**:
- ✅ 减少前端请求次数（2 → 1）
- ✅ 后端统一排序和分页逻辑
- ✅ 更好的性能和一致性

### 2. 滚动到特定消息
扩展 ChannelPanel 支持滚动到特定消息：

```typescript
// 扩展 channelStore
interface ChannelPanelState {
  isOpen: boolean;
  channel_id: string | null;
  scrollToMessageId?: string;  // 新增
  mode: PanelMode;
  openChannel: (channel_id: string, scrollToMessageId?: string) => void;
}

// 使用
openChannel(channelId, messageId);
```

### 3. 无限滚动
当前只加载前 50 条数据，建议添加无限滚动：

```typescript
// 在 useTimelineNodes 中
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = trpc.timeline.list.useInfiniteQuery(
  { channelId, limit: 20 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);

// 在 Timeline 组件中
const handleScroll = () => {
  if (hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
};
```

### 4. 实时更新
添加 WebSocket 订阅，实时更新 Timeline：

```typescript
// 在 useTimelineNodes 中
useEffect(() => {
  const unsubscribe = trpc.timeline.onUpdate.subscribe(
    { channelId },
    {
      onData: (newNode) => {
        // 更新本地缓存
        queryClient.setQueryData(['timeline', channelId], (old) => {
          return [newNode, ...old];
        });
      },
    }
  );
  return unsubscribe;
}, [channelId]);
```

---

## 🧪 测试

### 单元测试状态
- ✅ 430 个单元测试全部通过
- ✅ 构建成功，无 TypeScript 错误

### 手动测试清单
- [ ] 选择频道后，Timeline 显示 messages 和 threads
- [ ] 点击 Message 节点，打开 ChannelPanel
- [ ] 点击 Thread 节点，打开 ChannelPanel 并选中该 Thread
- [ ] 按日期分组正确（Today, Yesterday, Last 7 days, Older）
- [ ] 虚拟滚动性能良好（测试 100+ 节点）
- [ ] 空状态显示正确（无消息时）
- [ ] 加载状态显示正确
- [ ] 错误状态显示正确

---

## 📝 向后兼容

原有的 ThreadTimeline 组件仍然存在，如果需要回退：

```typescript
// 在 ChannelPage.tsx 中
import { ThreadTimeline } from './ThreadTimeline';

// 替换 Timeline 为 ThreadTimeline
<ThreadTimeline
  channelId={channelId}
  selectedThreadId={threadId}
  onThreadSelect={selectThread}
/>
```

---

## 🎨 扩展新节点类型

如果需要添加新的节点类型（例如 Event, Notification），只需 3 步：

### 1. 创建节点渲染器
```typescript
// src/features/channel/components/Timeline/nodes/EventNode.tsx
import { TimelineNodeCard } from '../TimelineNodeCard';
import { Calendar } from 'lucide-react';
import type { NodeRenderer } from '../NodeRegistry';

export const EventNodeRenderer: NodeRenderer = {
  type: 'event',
  render: (node, context) => (
    <TimelineNodeCard
      icon={<Calendar className="w-4 h-4 text-purple-500" />}
      title={node.data.title}
      description={node.data.description}
      timestamp={node.timestamp}
      color="purple"
      isActive={node.data.isActive}
      onClick={() => context.onNodeClick?.(node)}
    />
  ),
};
```

### 2. 注册节点
```typescript
// src/features/channel/components/Timeline/hooks/useNodeRegistry.ts
import { EventNodeRenderer } from '../nodes/EventNode';

nodeRegistry.registerAll([
  MessageNodeRenderer,
  ThreadNodeRenderer,
  EventNodeRenderer,  // 新增
]);
```

### 3. 提供数据
```typescript
// 在 useTimelineNodes 中添加
if (eventsResponse?.events) {
  eventsResponse.events.forEach((event) => {
    timelineNodes.push({
      type: 'event',
      id: event.event_id,
      timestamp: event.created_at,
      data: {
        title: event.title,
        description: event.description,
      },
    });
  });
}
```

**就这么简单！零侵入，完全解耦。**
