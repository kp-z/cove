/**
 * Timeline - 垂直时间轴组件（紧凑型重设计）
 *
 * 使用节点注册系统的可扩展时间轴组件。
 * 支持插件化节点类型、消息筛选和动态渲染。
 *
 * 重设计特点：
 * - 紧凑型筛选栏（平铺展示）
 * - 时间分组（Today/Yesterday/This Week/Older）
 * - 单行节点（只显示关键索引信息）
 * - 类型视觉系统（彩色徽章）
 */

import { useState, useMemo } from 'react';
import { MessageSquare, Image as ImageIcon, File, AlertCircle, MessageCircle } from 'lucide-react';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useNodeRegistry } from './hooks/useNodeRegistry';
import { nodeRegistry, type TimelineNode, type NodeContext } from './NodeRegistry';
import { CompactFilterBar } from './CompactFilterBar';
import { CompactTimelineNode } from './CompactTimelineNode';
import { groupNodesByTime, getTimeGroupLabel, formatCompactTimestamp, type TimeGroup } from './utils/timeGrouping';

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
    case 'text':
      return MessageSquare;
    case 'image':
      return ImageIcon;
    case 'file':
      return File;
    case 'thread':
      return MessageCircle;
    case 'system':
      return AlertCircle;
    default:
      return MessageSquare;
  }
}

/**
 * 获取节点类型（用于颜色映射）
 */
function getNodeType(type: string): 'text' | 'image' | 'file' | 'thread' | 'system' {
  switch (type) {
    case 'message':
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'file':
      return 'file';
    case 'thread':
      return 'thread';
    case 'system':
      return 'system';
    default:
      return 'text';
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
  const [searchText, setSearchText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [timeRange, setTimeRange] = useState('all');

  // 处理类型切换
  const handleTypeToggle = (type: string) => {
    if (type === 'all') {
      setSelectedTypes(['all']);
    } else {
      let newTypes = selectedTypes.filter(t => t !== 'all');
      if (newTypes.includes(type)) {
        newTypes = newTypes.filter(t => t !== type);
      } else {
        newTypes.push(type);
      }
      if (newTypes.length === 0) {
        newTypes = ['all'];
      }
      setSelectedTypes(newTypes);
    }
  };

  // 筛选节点
  const filteredNodes = useMemo(() => {
    let result = nodes;

    // 按类型筛选
    if (!selectedTypes.includes('all')) {
      result = result.filter(node => selectedTypes.includes(node.type));
    }

    // 按搜索文本筛选
    if (searchText) {
      const searchLower = searchText.toLowerCase();
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
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;

      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (startDate) {
        result = result.filter(node => new Date(node.timestamp) >= startDate!);
      }
    }

    return result;
  }, [nodes, selectedTypes, searchText, timeRange]);

  // 按时间分组
  const groupedNodes = useMemo(() => {
    return groupNodesByTime(filteredNodes);
  }, [filteredNodes]);

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
      {/* 紧凑型筛选栏 */}
      <CompactFilterBar
        searchText={searchText}
        onSearchChange={setSearchText}
        selectedTypes={selectedTypes}
        onTypeToggle={handleTypeToggle}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* 时间轴列表 */}
      {filteredNodes.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">
            {nodes.length === 0 ? 'No messages yet' : 'No messages match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 渲染每个时间组 */}
          {(['today', 'yesterday', 'thisWeek', 'older'] as TimeGroup[]).map((group) => {
            const groupNodes = groupedNodes[group];
            if (groupNodes.length === 0) return null;

            return (
              <div key={group}>
                {/* 时间组标题 */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-semibold text-white/80">
                    {getTimeGroupLabel(group)}
                  </h3>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* 时间组节点 */}
                <div className="space-y-2">
                  {groupNodes.map((node, index) => {
                    const Icon = getNodeIcon(node.type);
                    const nodeType = getNodeType(node.type);
                    const isActive = selectedNodeId === node.id;
                    const isLast = index === groupNodes.length - 1;

                    // 提取关键信息
                    const sender = node.data?.sender?.display_name || node.title || 'Unknown';
                    const metadata = node.data?.channel || node.data?.message_id || node.content || '';

                    return (
                      <CompactTimelineNode
                        key={node.id}
                        type={nodeType}
                        icon={Icon}
                        sender={sender}
                        metadata={metadata}
                        timestamp={formatCompactTimestamp(node.timestamp)}
                        isActive={isActive}
                        isLast={isLast}
                        onClick={() => onNodeClick?.(node)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
