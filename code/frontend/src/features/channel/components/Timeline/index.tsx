/**
 * Timeline - 垂直时间轴组件
 *
 * 使用节点注册系统的可扩展时间轴组件。
 * 支持插件化节点类型、消息筛选和动态渲染。
 */

import { useState, useMemo } from 'react';
import { MessageSquare, Image as ImageIcon, File, AlertCircle } from 'lucide-react';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useNodeRegistry } from './hooks/useNodeRegistry';
import { nodeRegistry, type TimelineNode, type NodeContext } from './NodeRegistry';
import { TimelineFilter, type TimelineFilterOptions } from './TimelineFilter';

export interface TimelineProps {
  channelId: string;
  nodes: TimelineNode[];
  selectedNodeId?: string;
  isLoading?: boolean;
  error?: Error | null;
  onNodeClick?: (node: TimelineNode) => void;
}

export type { TimelineNode } from './NodeRegistry';

/**
 * 获取节点类型图标
 */
function getNodeIcon(type: string) {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'image':
      return ImageIcon;
    case 'file':
      return File;
    case 'system':
      return AlertCircle;
    default:
      return MessageSquare;
  }
}

/**
 * 计算时间范围的开始时间
 */
function getTimeRangeStart(rangeType: string): Date | null {
  const now = new Date();
  switch (rangeType) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

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

  // Filter state
  const [filters, setFilters] = useState<TimelineFilterOptions>({
    messageTypes: ['all'],
    timeRange: { type: 'all' },
  });

  // 筛选节点
  const filteredNodes = useMemo(() => {
    let result = nodes;

    // 按类型筛选
    if (!filters.messageTypes.includes('all')) {
      result = result.filter(node => filters.messageTypes.includes(node.type));
    }

    // 按搜索文本筛选
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(node => {
        const title = node.title || '';
        const content = node.content || '';
        return (
          title.toLowerCase().includes(searchLower) ||
          content.toLowerCase().includes(searchLower)
        );
      });
    }

    // 按时间范围筛选
    if (filters.timeRange.type !== 'all') {
      if (filters.timeRange.type === 'custom') {
        // 自定义时间范围
        if (filters.timeRange.startDate) {
          result = result.filter(node => new Date(node.timestamp) >= filters.timeRange.startDate!);
        }
        if (filters.timeRange.endDate) {
          result = result.filter(node => new Date(node.timestamp) <= filters.timeRange.endDate!);
        }
      } else {
        // 预设时间范围
        const startDate = getTimeRangeStart(filters.timeRange.type);
        if (startDate) {
          result = result.filter(node => new Date(node.timestamp) >= startDate);
        }
      }
    }

    return result;
  }, [nodes, filters]);

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

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 筛选组件 */}
      <TimelineFilter onFilterChange={setFilters} />

      {/* 时间轴列表 */}
      {filteredNodes.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">
            {nodes.length === 0 ? 'No messages yet' : 'No messages match your filters'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* 时间轴节点 */}
          <div className="space-y-3">
            {filteredNodes.map((node, index) => {
              const renderer = nodeRegistry.getRenderer(node.type);

              if (!renderer) {
                console.warn(`No renderer found for node type: ${node.type}`);
                return null;
              }

              const Icon = getNodeIcon(node.type);
              const isActive = selectedNodeId === node.id;
              const isLast = index === filteredNodes.length - 1;

              return (
                <div
                  key={node.id}
                  className="relative grid grid-cols-[auto_1fr] items-start gap-4 group"
                  onClick={() => onNodeClick?.(node)}
                >
                  {/* 左侧：时间线节点 */}
                  <div className="relative flex-shrink-0 z-10">
                    {/* 垂直连接线 - 始终渲染，延伸到下一个节点 */}
                    {!isLast && (
                      <div className="absolute left-[15px] top-8 h-[calc(100%+12px)] w-px bg-border" />
                    )}

                    <div
                      className={`
                        w-8 h-8 rounded-full border-2 flex items-center justify-center
                        transition-all duration-200
                        ${isActive
                          ? 'bg-primary border-primary text-primary-foreground scale-110'
                          : 'bg-background border-border text-muted-foreground group-hover:border-primary group-hover:text-primary'
                        }
                      `}
                    >
                      <Icon size={16} />
                    </div>
                  </div>

                  {/* 右侧：插件渲染的内容 */}
                  <div className="flex-1">
                    {renderer.render(node, context)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
