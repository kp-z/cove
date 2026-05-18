/**
 * ThreadNode - Thread 节点渲染器
 *
 * 渲染有回复的对话线程节点
 */

import { MessageCircle } from 'lucide-react';
import { TimelineNodeCard } from '../TimelineNodeCard';
import type { NodeRenderer, TimelineNode, NodeContext } from '../NodeRegistry';

/**
 * Thread 节点数据结构
 */
export interface ThreadNodeData {
  thread_id: string;
  root_message_id: string;
  title?: string;
  reply_count: number;
  last_reply_at?: string;
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
 * Thread 节点渲染器
 */
export const ThreadNodeRenderer: NodeRenderer<ThreadNodeData> = {
  type: 'thread',
  icon: MessageCircle,
  color: 'gray',
  render: (node: TimelineNode<ThreadNodeData>, context: NodeContext) => {
    const { thread_id, title, reply_count, last_reply_at } = node.data;

    // 使用 title 或生成默认标题
    const displayTitle = title || `Thread #${thread_id.slice(0, 8)}`;
    const replyText = reply_count === 1 ? 'reply' : 'replies';

    return (
      <TimelineNodeCard
        icon={<MessageCircle className="w-4 h-4 mt-0.5 shrink-0" />}
        title={displayTitle}
        description={`${reply_count} ${replyText} • ${formatTime(last_reply_at || node.timestamp)}`}
        timestamp={formatTime(last_reply_at || node.timestamp)}
        color="gray"
        onClick={() => {
          context.onNodeClick(node);
          // 如果提供了 openThread，则展开 Thread
          if (context.openThread) {
            context.openThread(thread_id);
          }
        }}
      />
    );
  },
};
