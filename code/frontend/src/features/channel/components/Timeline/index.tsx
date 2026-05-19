/**
 * Timeline - 垂直时间轴组件
 *
 * 使用节点注册系统的可扩展时间轴组件。
 * 支持插件化节点类型、消息筛选和动态渲染。
 */

import { useMemo } from 'react';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useNodeRegistry } from './hooks/useNodeRegistry';
import { nodeRegistry, type TimelineNode, type NodeContext } from './NodeRegistry';

export interface TimelineProps {
  channelId: string;
  nodes: TimelineNode[];
  selectedNodeId?: string;
  isLoading?: boolean;
  error?: Error | null;
  onNodeClick?: (node: TimelineNode) => void;
}

export type { TimelineNode } from './NodeRegistry';

export function Timeline({
  channelId,
  nodes,
  selectedNodeId,
  isLoading = false,
  error = null,
  onNodeClick,
}: TimelineProps) {
  // 初始化节点注册器
  useNodeRegistry();

  // 构建节点上下文
  const context: NodeContext = useMemo(
    () => ({
      channelId,
      onNodeClick: onNodeClick || (() => {}),
    }),
    [channelId, onNodeClick]
  );

  // 条件渲染
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
    <div className="h-full overflow-y-auto p-6">
      {/* 时间轴列表 */}
      <div className="relative space-y-4">
        {nodes.map((node) => {
          const renderer = nodeRegistry.getRenderer(node.type);

          if (!renderer) {
            console.warn(`No renderer found for node type: ${node.type}`);
            return null;
          }

          const isActive = selectedNodeId === node.id;

          return (
            <div
              key={node.id}
              className={`
                relative transition-all duration-200
                ${isActive ? 'scale-[1.02]' : ''}
              `}
            >
              {renderer.render(node, context)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
