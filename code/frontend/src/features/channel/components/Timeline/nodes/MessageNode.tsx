/**
 * MessageNode - Message 节点渲染器
 *
 * 渲染顶层消息节点（没有回复的对话）
 */

import { MessageSquare } from 'lucide-react';
import { TimelineNodeCard } from '../TimelineNodeCard';
import type { NodeRenderer, TimelineNode, NodeContext } from '../NodeRegistry';

/**
 * Message 节点数据结构
 */
export interface MessageNodeData {
  message_id: string;
  content: string;
  sender: {
    user_id: string;
    display_name: string;
    avatar?: string;
  };
}

/**
 * 格式化时间显示
 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Message 节点渲染器
 */
export const MessageNodeRenderer: NodeRenderer<MessageNodeData> = {
  type: 'message',
  icon: MessageSquare,
  color: 'blue',
  render: (node: TimelineNode<MessageNodeData>, context: NodeContext) => {
    const { content, sender } = node.data;

    // 截取内容预览（最多 100 字符）
    const preview = content.length > 100 ? `${content.slice(0, 100)}...` : content;

    return (
      <TimelineNodeCard
        icon={<MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />}
        title={preview}
        description={`${sender.display_name} • ${formatTime(node.timestamp)}`}
        timestamp={formatTime(node.timestamp)}
        color="blue"
        onClick={() => {
          context.onNodeClick(node);
          // 如果提供了 navigateToMessage，则跳转到消息
          if (context.navigateToMessage) {
            context.navigateToMessage(node.data.message_id);
          }
        }}
      />
    );
  },
};
