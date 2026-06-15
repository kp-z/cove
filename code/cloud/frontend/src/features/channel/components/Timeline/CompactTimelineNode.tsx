/**
 * CompactTimelineNode - 紧凑型时间轴节点
 *
 * 单行显示，只展示关键索引信息
 * 支持系统事件的展开和颜色标签
 */

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { AgentExecutionSection } from './sections/AgentExecutionSection';
import { PerformanceMetricsSection } from './sections/PerformanceMetricsSection';
import { RelatedInfoSection } from './sections/RelatedInfoSection';
import { SystemEventSection } from './sections/SystemEventSection';
import { EditHistorySection } from './sections/EditHistorySection';

export interface CompactTimelineNodeProps {
  type: 'text' | 'image' | 'file' | 'thread' | 'system';
  icon: LucideIcon;
  sender: string;
  metadata: string; // 频道名、文件名等关键信息
  timestamp: string;
  isActive?: boolean;
  isLast?: boolean;
  onClick?: () => void;
  // 系统事件特有属性
  systemLevel?: 'info' | 'warn' | 'error' | 'debug';
  systemDetails?: {
    message: string;
    metadata?: Record<string, any>;
    stack?: string;
  };
  // 完整的消息数据（用于展开详情）
  messageData?: any; // 使用 any 暂时，后续可以引入准确类型
}

// 类型颜色映射
const TYPE_COLORS = {
  text: {
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    node: 'bg-blue-500 border-blue-400',
    nodeInactive: 'border-blue-500/50',
  },
  image: {
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    node: 'bg-purple-500 border-purple-400',
    nodeInactive: 'border-purple-500/50',
  },
  file: {
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    node: 'bg-green-500 border-green-400',
    nodeInactive: 'border-green-500/50',
  },
  thread: {
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    node: 'bg-orange-500 border-orange-400',
    nodeInactive: 'border-orange-500/50',
  },
  system: {
    badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    node: 'bg-gray-500 border-gray-400',
    nodeInactive: 'border-gray-500/50',
  },
};

// 系统事件级别颜色
const SYSTEM_LEVEL_COLORS = {
  info: {
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    text: 'text-blue-400',
  },
  warn: {
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    text: 'text-yellow-400',
  },
  error: {
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    text: 'text-red-400',
  },
  debug: {
    badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    text: 'text-gray-400',
  },
};

export function CompactTimelineNode({
  type,
  icon: Icon,
  sender,
  metadata,
  timestamp,
  isActive = false,
  isLast = false,
  onClick,
  systemLevel,
  systemDetails,
  messageData,
}: CompactTimelineNodeProps) {
  const colors = TYPE_COLORS[type];
  const [isExpanded, setIsExpanded] = useState(false);

  // 系统事件特殊处理
  const isSystemEvent = type === 'system';
  const levelColors = systemLevel ? SYSTEM_LEVEL_COLORS[systemLevel] : SYSTEM_LEVEL_COLORS.info;
  const hasDetails = systemDetails && (
    (systemDetails.metadata && Object.keys(systemDetails.metadata).length > 0) ||
    !!systemDetails.stack
  );

  // 判断是否有展开内容
  const canExpand = isSystemEvent ? hasDetails : !!messageData;

  const handleClick = () => {
    if (canExpand) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div className="relative">
      <div className="relative grid grid-cols-[24px_1fr] gap-3 group">
        {/* Timeline Line - 连续的，从节点底部延伸 */}
        {!isLast && (
          <div className="absolute left-3 top-6 bottom-[-8px] w-px bg-white/10" />
        )}

        {/* Timeline Node with Icon - 对齐内容上边缘 */}
        <div className="relative z-10 flex-shrink-0">
          <div
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center
              transition-all duration-200
              ${isActive
                ? `${colors.node} scale-110`
                : `bg-background ${colors.nodeInactive} group-hover:${colors.node.split(' ')[0]}`
              }
            `}
          >
            <Icon className="w-3 h-3" />
          </div>
        </div>

        {/* Content Card */}
        <div
          className={`
            min-w-0 rounded-lg overflow-hidden transition-all duration-200
            ${isActive
              ? 'bg-white/10 border border-white/20'
              : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
            }
          `}
        >
          {/* Main Row */}
          <button
            onClick={handleClick}
            className="w-full flex items-center gap-2 px-3 py-2"
          >
            {/* Info */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {/* 系统事件显示级别标签 */}
              {isSystemEvent && systemLevel && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${levelColors.badge} flex-shrink-0`}>
                  {systemLevel.toUpperCase()}
                </span>
              )}

              <span className={`text-sm font-medium truncate ${isSystemEvent ? levelColors.text : 'text-white'}`}>
                {sender}
              </span>
              <span className="text-white/40 flex-shrink-0">•</span>
              <span className="text-sm text-white/60 truncate">
                {metadata}
              </span>
            </div>

            {/* Timestamp and Expand Icon - 固定宽度 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-white/40 whitespace-nowrap w-16 text-right">
                {timestamp}
              </span>
              {canExpand ? (
                <div className="w-5 flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ) : (
                <div className="w-5" />
              )}
            </div>
          </button>

          {/* 展开的详细信息 - 现在在卡片内部 */}
          {isExpanded && (
            <div className="border-t border-white/10 px-4 py-3 transition-all duration-200">
              {/* 系统事件：显示系统事件详情 */}
              {isSystemEvent && systemDetails && (
                <SystemEventSection systemDetails={systemDetails} />
              )}

              {/* 消息：显示所有适用的信息维度 */}
              {messageData && !isSystemEvent && (
                <>
                  <BasicInfoSection messageData={messageData} />
                  <AgentExecutionSection messageData={messageData} />
                  <PerformanceMetricsSection messageData={messageData} />
                  <RelatedInfoSection messageData={messageData} />
                  <EditHistorySection messageData={messageData} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
