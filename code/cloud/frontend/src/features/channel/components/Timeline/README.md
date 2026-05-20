# Timeline Component

一个高性能、插件化的时间轴组件，支持虚拟滚动和多种节点类型。

## 特性

- ✅ **插件化架构**：通过节点注册中心轻松添加新节点类型
- ✅ **高性能**：基于 @tanstack/react-virtual 的虚拟滚动
- ✅ **完全可控**：使用 Framer Motion 和 Tailwind CSS
- ✅ **高内聚低耦合**：每个节点类型独立，互不影响
- ✅ **易于扩展**：添加新节点类型无需修改现有代码

## 架构设计

```
Timeline Container
    ↓
Node Registry (注册中心)
    ↓
┌─────────┬─────────┬─────────┬─────────┐
│ Message │ Thread  │  Event  │ Future  │
│  Node   │  Node   │  Node   │  Types  │
└─────────┴─────────┴─────────┴─────────┘
```

## 文件结构

```
Timeline/
├── index.tsx                    # Timeline 容器（虚拟滚动）
├── TimelineNodeCard.tsx         # 通用节点卡片组件
├── NodeRegistry.ts              # 节点注册中心
├── nodes/                       # 节点类型目录
│   ├── MessageNode.tsx          # Message 节点渲染器
│   ├── ThreadNode.tsx           # Thread 节点渲染器
│   └── index.ts                 # 导出所有节点
├── hooks/
│   └── useNodeRegistry.ts       # 节点注册管理
├── USAGE.tsx                    # 使用示例
└── README.md                    # 本文档
```

## 基础用法

```tsx
import { Timeline } from '@/features/channel/components/Timeline';
import type { TimelineNode } from '@/features/channel/components/Timeline/NodeRegistry';

function MyTimeline() {
  const nodes: TimelineNode[] = [
    {
      type: 'message',
      id: 'msg-1',
      timestamp: '2026-05-18T10:30:00Z',
      data: {
        message_id: 'msg-1',
        content: '项目进展如何？',
        sender: {
          user_id: 'user-1',
          display_name: 'Alice',
        },
      },
    },
    {
      type: 'thread',
      id: 'thread-1',
      timestamp: '2026-05-18T11:00:00Z',
      data: {
        thread_id: 'thread-1',
        root_message_id: 'msg-2',
        title: '关于新功能的讨论',
        reply_count: 5,
      },
    },
  ];

  return (
    <Timeline
      channelId="channel-1"
      nodes={nodes}
      onNodeClick={(node) => console.log('Clicked:', node)}
    />
  );
}
```

## 添加新节点类型

### 1. 定义节点数据类型

```tsx
interface EventNodeData {
  event_type: 'task_created' | 'task_completed';
  title: string;
  description: string;
}
```

### 2. 创建节点渲染器

```tsx
import { Calendar } from 'lucide-react';
import { TimelineNodeCard } from '../TimelineNodeCard';
import type { NodeRenderer } from '../NodeRegistry';

export const EventNodeRenderer: NodeRenderer<EventNodeData> = {
  type: 'event',
  icon: Calendar,
  color: 'purple',
  render: (node, context) => (
    <TimelineNodeCard
      icon={<Calendar className="w-4 h-4" />}
      title={node.data.title}
      description={node.data.description}
      timestamp={new Date(node.timestamp).toLocaleString()}
      color="purple"
      onClick={() => context.onNodeClick(node)}
    />
  ),
};
```

### 3. 注册节点

```tsx
import { nodeRegistry } from '@/features/channel/components/Timeline/NodeRegistry';
import { EventNodeRenderer } from './EventNode';

// 在应用启动时注册
nodeRegistry.register(EventNodeRenderer);
```

### 4. 使用新节点

```tsx
const nodes: TimelineNode[] = [
  {
    type: 'event',
    id: 'event-1',
    timestamp: '2026-05-18T09:00:00Z',
    data: {
      event_type: 'task_created',
      title: '新任务创建',
      description: '实现 Timeline 组件',
    },
  },
];
```

## API

### Timeline Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `channelId` | `string` | ✅ | 频道 ID |
| `nodes` | `TimelineNode[]` | ✅ | 时间轴节点数组 |
| `selectedNodeId` | `string` | ❌ | 当前选中的节点 ID |
| `isLoading` | `boolean` | ❌ | 加载状态 |
| `error` | `Error \| null` | ❌ | 错误信息 |
| `onNodeClick` | `(node: TimelineNode) => void` | ❌ | 节点点击回调 |
| `navigateToMessage` | `(messageId: string) => void` | ❌ | 跳转到消息 |
| `openThread` | `(threadId: string) => void` | ❌ | 打开 Thread |

### TimelineNode

```tsx
interface TimelineNode<T = any> {
  type: string;           // 节点类型
  id: string;             // 唯一标识
  timestamp: string;      // ISO 8601 时间戳
  data: T;                // 节点特定数据
}
```

### NodeRenderer

```tsx
interface NodeRenderer<T = any> {
  type: string;
  render: (node: TimelineNode<T>, context: NodeContext) => ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}
```

## 与 ChannelPanel 联动

```tsx
import { useChannelPanelStore } from '@/features/channel/stores/channelPanelStore';

function TimelineWithPanel() {
  const { openPanel } = useChannelPanelStore();

  const handleNodeClick = (node: TimelineNode) => {
    if (node.type === 'message') {
      openPanel({
        channelId: 'channel-1',
        messageId: node.data.message_id,
      });
    }
  };

  return <Timeline channelId="channel-1" nodes={nodes} onNodeClick={handleNodeClick} />;
}
```

## 性能优化

- ✅ 虚拟滚动：只渲染可见节点
- ✅ 按日期分组：减少渲染节点数量
- ✅ 动画优化：使用 Framer Motion 的硬件加速
- ✅ 懒加载：支持分页加载更多节点

## 注意事项

1. **独立性**：此组件完全独立，不影响现有的 `ThreadTimeline` 组件
2. **向后兼容**：可以与现有组件并行使用
3. **扩展性**：添加新节点类型时，无需修改现有代码
4. **性能**：虚拟滚动支持海量数据（10000+ 节点）

## 迁移指南

如果需要从 `ThreadTimeline` 迁移到新的 `Timeline` 组件：

1. 保持 `ThreadTimeline` 不变（向后兼容）
2. 在新页面使用 `Timeline` 组件
3. 逐步迁移现有页面
4. 最终移除 `ThreadTimeline`（可选）

## 依赖

- `@tanstack/react-virtual`: 虚拟滚动
- `framer-motion`: 动画效果
- `lucide-react`: 图标库
- `tailwindcss`: 样式系统
