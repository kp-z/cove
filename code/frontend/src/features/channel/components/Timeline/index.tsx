/**
 * Timeline - 时间轴容器组件
 *
 * 支持虚拟滚动的高性能时间轴组件，使用插件化架构支持多种节点类型。
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNodeRegistry } from './hooks/useNodeRegistry';
import { nodeRegistry, type TimelineNode, type NodeContext } from './NodeRegistry';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';

export interface TimelineProps {
  channelId: string;
  nodes: TimelineNode[];
  selectedNodeId?: string;
  isLoading?: boolean;
  error?: Error | null;
  onNodeClick?: (node: TimelineNode) => void;
  navigateToMessage?: (messageId: string) => void;
  openThread?: (threadId: string) => void;
}

/**
 * 按日期分组节点
 */
function groupNodesByDate(nodes: TimelineNode[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { label: string; nodes: TimelineNode[] }[] = [
    { label: 'Today', nodes: [] },
    { label: 'Yesterday', nodes: [] },
    { label: 'Last 7 days', nodes: [] },
    { label: 'Older', nodes: [] },
  ];

  nodes.forEach((node) => {
    const date = new Date(node.timestamp);
    if (date >= today) {
      groups[0].nodes.push(node);
    } else if (date >= yesterday) {
      groups[1].nodes.push(node);
    } else if (date >= lastWeek) {
      groups[2].nodes.push(node);
    } else {
      groups[3].nodes.push(node);
    }
  });

  return groups.filter((group) => group.nodes.length > 0);
}

export function Timeline({
  channelId,
  nodes,
  selectedNodeId,
  isLoading = false,
  error = null,
  onNodeClick,
  navigateToMessage,
  openThread,
}: TimelineProps) {
  // 初始化节点注册
  useNodeRegistry();

  const parentRef = useRef<HTMLDivElement>(null);

  // 构建节点上下文
  const context: NodeContext = {
    channelId,
    onNodeClick: onNodeClick || (() => {}),
    navigateToMessage,
    openThread,
  };

  // 按日期分组（即使在 loading/error 状态也要计算，保持 hooks 调用一致）
  const groups = groupNodesByDate(nodes);

  // 展平所有节点（包含分组标题）
  const flatItems: Array<{ type: 'header'; label: string } | { type: 'node'; node: TimelineNode; isLast: boolean }> = [];
  groups.forEach((group) => {
    flatItems.push({ type: 'header', label: group.label });
    group.nodes.forEach((node, index) => {
      flatItems.push({
        type: 'node',
        node,
        isLast: index === group.nodes.length - 1,
      });
    });
  });

  // 虚拟滚动 - 必须在所有条件判断之前调用（React Hooks 规则）
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flatItems[index];
      return item.type === 'header' ? 50 : 100; // 估算高度
    },
    overscan: 5,
  });

  // 条件渲染放在所有 hooks 之后
  if (isLoading) return <PageLoader />;
  if (error) return <PageError message={error.message || 'Failed to load timeline'} />;
  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">No messages yet</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto p-6">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = flatItems[virtualItem.index];

          if (item.type === 'header') {
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 mb-4 z-20">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {item.label}
                  </h3>
                </div>
              </div>
            );
          }

          // 渲染节点
          const { node, isLast } = item;
          const renderer = nodeRegistry.getRenderer(node.type);

          if (!renderer) {
            console.warn(`No renderer found for node type: ${node.type}`);
            return null;
          }

          const isActive = selectedNodeId === node.id;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="mb-4"
            >
              {renderer.render({ ...node, data: { ...node.data, isActive, isLast } }, context)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
