/**
 * Timeline Component - 使用示例
 *
 * 这是一个独立的、插件化的时间轴组件，支持多种节点类型。
 */

import { Timeline } from './Timeline';
import type { TimelineNode } from './Timeline/NodeRegistry';

// ============================================
// 基础用法
// ============================================

function ChannelTimelineExample() {
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
        last_reply_at: '2026-05-18T11:30:00Z',
      },
    },
  ];

  return (
    <Timeline
      channelId="channel-1"
      nodes={nodes}
      onNodeClick={(node) => {
        console.log('Node clicked:', node);
      }}
      navigateToMessage={(messageId) => {
        console.log('Navigate to message:', messageId);
      }}
      openThread={(threadId) => {
        console.log('Open thread:', threadId);
      }}
    />
  );
}

// ============================================
// 添加新节点类型（扩展示例）
// ============================================

import { Calendar } from 'lucide-react';
import { TimelineNodeCard } from './Timeline/TimelineNodeCard';
import { nodeRegistry, type NodeRenderer } from './Timeline/NodeRegistry';

// 1. 定义新节点数据类型
interface EventNodeData {
  event_type: 'task_created' | 'task_completed' | 'member_joined';
  title: string;
  description: string;
}

// 2. 创建节点渲染器
const EventNodeRenderer: NodeRenderer<EventNodeData> = {
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

// 3. 注册节点（在应用启动时）
nodeRegistry.register(EventNodeRenderer);

// 4. 使用新节点类型
function TimelineWithEvents() {
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
    // ... 其他节点
  ];

  return <Timeline channelId="channel-1" nodes={nodes} />;
}

// ============================================
// 与 ChannelPanel 联动示例
// ============================================

import { useChannelPanelStore } from '@/features/channel/stores/channelPanelStore';

function TimelineWithChannelPanel() {
  const { openPanel } = useChannelPanelStore();

  const handleNodeClick = (node: TimelineNode) => {
    if (node.type === 'message') {
      // 打开 ChannelPanel 并跳转到消息
      openPanel({
        channelId: 'channel-1',
        messageId: node.data.message_id,
      });
    } else if (node.type === 'thread') {
      // 打开 ChannelPanel 并展开 Thread
      openPanel({
        channelId: 'channel-1',
        threadId: node.data.thread_id,
      });
    }
  };

  return (
    <Timeline
      channelId="channel-1"
      nodes={[]}
      onNodeClick={handleNodeClick}
    />
  );
}

export {
  ChannelTimelineExample,
  TimelineWithEvents,
  TimelineWithChannelPanel,
};
