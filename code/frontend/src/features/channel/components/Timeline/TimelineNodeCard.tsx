/**
 * TimelineNodeCard - 通用时间轴节点卡片组件
 *
 * 所有节点类型共享的基础 UI 组件，提供统一的视觉风格。
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export interface TimelineNodeCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  timestamp: string;
  color?: string;
  isActive?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

export function TimelineNodeCard({
  icon,
  title,
  description,
  timestamp,
  color = 'gray',
  isActive = false,
  isLast = false,
  onClick,
}: TimelineNodeCardProps) {
  // 颜色映射
  const colorClasses = {
    gray: {
      node: isActive ? 'bg-gray-500 ring-4 ring-gray-500/20' : 'bg-transparent border-2 border-gray-600 group-hover:border-gray-400',
      icon: isActive ? 'text-gray-400' : 'text-gray-500',
      card: isActive ? 'bg-gray-500/10 border-gray-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10',
    },
    blue: {
      node: isActive ? 'bg-blue-500 ring-4 ring-blue-500/20' : 'bg-transparent border-2 border-blue-600 group-hover:border-blue-400',
      icon: isActive ? 'text-blue-400' : 'text-blue-500',
      card: isActive ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10',
    },
    purple: {
      node: isActive ? 'bg-purple-500 ring-4 ring-purple-500/20' : 'bg-transparent border-2 border-purple-600 group-hover:border-purple-400',
      icon: isActive ? 'text-purple-400' : 'text-purple-500',
      card: isActive ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10',
    },
    green: {
      node: isActive ? 'bg-green-500 ring-4 ring-green-500/20' : 'bg-transparent border-2 border-green-600 group-hover:border-green-400',
      icon: isActive ? 'text-green-400' : 'text-green-500',
      card: isActive ? 'bg-green-500/10 border-green-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;

  return (
    <div className="relative flex items-start gap-4 group">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-700" />
      )}

      {/* Timeline node */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${colors.node}`}
      >
        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
      </motion.div>

      {/* Content card */}
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex-1 text-left p-3 rounded-lg transition-all border ${colors.card}`}
      >
        <div className="flex items-start gap-2 mb-2">
          <div className={colors.icon}>{icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-white' : 'text-gray-300'}`}>
              {title}
            </p>
            {description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{timestamp}</span>
        </div>
      </motion.button>
    </div>
  );
}
