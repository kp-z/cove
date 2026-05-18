/**
 * Timeline - 垂直时间轴组件
 *
 * 经典的垂直时间轴布局，左侧时间戳，中间时间线，右侧内容卡片。
 * 支持图片缩略图、内容简短显示（最多两行）、消息筛选。
 */

import { useState, useMemo } from 'react';
import { MessageSquare, Image as ImageIcon, File, AlertCircle, Clock } from 'lucide-react';
import { TimelineFilter, type TimelineFilterOptions } from './TimelineFilter';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { formatDistanceToNow } from 'date-fns';

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

/**
 * 截断文本到指定行数
 */
function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
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
      result = result.filter(node =>
        node.title.toLowerCase().includes(searchLower) ||
        node.content.toLowerCase().includes(searchLower)
      );
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
          {/* 垂直时间线 */}
          <div className="absolute left-[120px] top-0 bottom-0 w-px bg-border" />

          {/* 时间轴节点 */}
          <div className="space-y-6">
            {filteredNodes.map((node, index) => {
              const Icon = getNodeIcon(node.type);
              const isActive = selectedNodeId === node.id;
              const isLast = index === filteredNodes.length - 1;

              return (
                <div
                  key={node.id}
                  className="relative flex items-start gap-4 group"
                  onClick={() => onNodeClick?.(node)}
                >
                  {/* 左侧：时间戳 */}
                  <div className="w-[100px] flex-shrink-0 text-right">
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(node.timestamp), { addSuffix: true })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(node.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* 中间：时间线节点 */}
                  <div className="relative flex-shrink-0 z-10">
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
                      flex-1 p-4 rounded-lg border cursor-pointer
                      transition-all duration-200
                      ${isActive
                        ? 'bg-primary/5 border-primary shadow-sm'
                        : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                      }
                    `}
                  >
                    {/* 作者信息 */}
                    {node.author && (
                      <div className="flex items-center gap-2 mb-2">
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
                    <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">
                      {node.title}
                    </h4>

                    {/* 内容（最多两行） */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {truncateText(node.content)}
                    </p>

                    {/* 图片缩略图 */}
                    {node.thumbnail && (
                      <div className="mt-3">
                        <img
                          src={node.thumbnail}
                          alt="Thumbnail"
                          className="w-full h-32 object-cover rounded-md border border-border"
                        />
                      </div>
                    )}
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
