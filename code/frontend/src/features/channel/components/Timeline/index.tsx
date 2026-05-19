/**
 * Timeline - 垂直时间轴组件
 *
 * 经典的垂直时间轴布局，左侧时间戳，中间时间线，右侧内容卡片。
 * 支持图片缩略图、内容简短显示（最多两行）、消息筛选。
 */

import { useState, useMemo } from 'react';
import { MessageSquare, Image as ImageIcon, File, AlertCircle } from 'lucide-react';
import { TimelineFilter, type TimelineFilterOptions } from './TimelineFilter';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { formatTimestamp } from './utils/formatTimestamp';
import { useChannelPanelStore } from '../../stores/channelStore';

export interface TimelineNode {
  id: string;
  type: 'message' | 'image' | 'file' | 'system';
  timestamp: Date;
  title: string;
  content: string;
  author?: {
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineProps {
  channelId: string;
  nodes: TimelineNode[];
  selectedNodeId?: string;
  isLoading?: boolean;
  error?: Error | null;
  onNodeClick?: (node: TimelineNode) => void;
}

/**
 * 获取节点类型图标
 */
function getNodeIcon(type: TimelineNode['type']) {
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

export function Timeline({
  channelId,
  nodes,
  selectedNodeId,
  isLoading = false,
  error = null,
  onNodeClick,
}: TimelineProps) {
  const [filters, setFilters] = useState<TimelineFilterOptions>({
    messageTypes: ['all'],
    timeRange: { type: 'all' },
  });

  const { openChannel } = useChannelPanelStore();

  // 处理节点点击
  const handleNodeClick = (node: TimelineNode) => {
    // 从 metadata 中提取 message_id 或 thread_id
    const messageId = node.metadata?.message_id as string | undefined;
    const threadId = node.metadata?.thread_id as string | undefined;

    if (messageId) {
      // 导航到消息
      openChannel(channelId, { message_id: messageId });
    } else if (threadId) {
      // 导航到线程
      openChannel(channelId, { thread_id: threadId });
    } else {
      // 默认打开 channel
      openChannel(channelId);
    }

    // 调用原有的 onNodeClick 回调
    onNodeClick?.(node);
  };

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
      result = result.filter(node =>
        node.title.toLowerCase().includes(searchLower) ||
        node.content.toLowerCase().includes(searchLower)
      );
    }

    // 按时间范围筛选
    if (filters.timeRange.type !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (filters.timeRange.type) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          startDate = filters.timeRange.startDate || new Date(0);
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter(node => {
        const nodeDate = new Date(node.timestamp);
        const afterStart = nodeDate >= startDate;
        const beforeEnd =
          filters.timeRange.type === 'custom' && filters.timeRange.endDate
            ? nodeDate <= filters.timeRange.endDate
            : true;
        return afterStart && beforeEnd;
      });
    }

    return result;
  }, [nodes, filters]);

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
      {/* 筛选组件 */}
      <TimelineFilter onFilterChange={setFilters} />

      {/* 时间轴列表 */}
      {filteredNodes.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">No messages match your filters</p>
        </div>
      ) : (
        <div className="relative">
          {/* 时间轴节点 */}
          <div className="space-y-3">
            {filteredNodes.map((node) => {
              const Icon = getNodeIcon(node.type);
              const isActive = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className="relative grid grid-cols-[auto_1fr] items-start gap-4 group"
                  onClick={() => handleNodeClick(node)}
                >
                  {/* 左侧：时间线节点 */}
                  <div className="relative flex-shrink-0 z-10">
                    {/* 垂直连接线 - 始终渲染，延伸到下一个节点 */}
                    <div className="absolute left-[15px] top-8 h-[calc(100%+12px)] w-px bg-border" />

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

                  {/* 右侧：内容卡片 */}
                  <div
                    className={`
                      p-3 rounded-lg border cursor-pointer
                      transition-all duration-200
                      ${isActive
                        ? 'bg-primary/5 border-primary shadow-sm'
                        : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                      }
                    `}
                  >
                    {/* 作者信息 */}
                    {node.author && (
                      <div className="flex items-center gap-2 mb-1">
                        {node.author.avatar && (
                          <img
                            src={node.author.avatar}
                            alt={node.author.name}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {node.author.name}
                        </span>
                      </div>
                    )}

                    {/* 标题 */}
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      {node.title}
                    </h4>

                    {/* 内容 - 完整显示 */}
                    <p className="text-sm text-muted-foreground mb-2">
                      {node.content}
                    </p>

                    {/* 图片缩略图 */}
                    {node.thumbnail && (
                      <div className="mb-2">
                        <img
                          src={node.thumbnail}
                          alt="Thumbnail"
                          className="w-full h-32 object-cover rounded-md border border-border"
                        />
                      </div>
                    )}

                    {/* 时间戳 - 弱化显示 */}
                    <div className="text-[10px] text-muted-foreground/50 pt-1">
                      {formatTimestamp(node.timestamp)}
                    </div>
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
