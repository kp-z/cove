/**
 * CompactTimelineNode - 紧凑型时间轴节点
 *
 * 单行显示，只展示关键索引信息
 */

import type { LucideIcon } from 'lucide-react';

export interface CompactTimelineNodeProps {
  type: 'text' | 'image' | 'file' | 'thread' | 'system';
  icon: LucideIcon;
  sender: string;
  metadata: string; // 频道名、文件名等关键信息
  timestamp: string;
  isActive?: boolean;
  isLast?: boolean;
  onClick?: () => void;
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

export function CompactTimelineNode({
  type,
  icon: Icon,
  sender,
  metadata,
  timestamp,
  isActive = false,
  isLast = false,
  onClick,
}: CompactTimelineNodeProps) {
  const colors = TYPE_COLORS[type];

  return (
    <div className="relative flex items-center gap-3 group">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/10" />
      )}

      {/* Timeline Node */}
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
          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>

      {/* Content */}
      <button
        onClick={onClick}
        className={`
          flex-1 flex items-center gap-2 px-3 py-2 rounded-lg
          transition-all duration-200
          ${isActive
            ? 'bg-white/10 border border-white/20'
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
          }
        `}
      >
        {/* Type Badge */}
        <div className={`flex items-center justify-center w-7 h-7 rounded-md border ${colors.badge}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-white truncate">
            {sender}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-sm text-white/60 truncate">
            {metadata}
          </span>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-white/40 whitespace-nowrap">
          {timestamp}
        </span>
      </button>
    </div>
  );
}
