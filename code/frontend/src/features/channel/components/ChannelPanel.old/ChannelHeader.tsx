/**
 * ChannelHeader 组件
 *
 * 显示 Channel 的基本信息和操作按钮
 * 位于 ChannelPanel 的最顶部
 *
 * 功能：
 * - 显示 Channel 名称和类型图标
 * - 显示 Channel 描述（可选）
 * - 返回按钮（返回 Channel Hub）
 * - 关闭按钮（关闭整个面板）
 *
 * 参考：claude_manager 的 AgentChatHeader 设计
 */

import React from 'react';
import { ArrowLeft, X, Hash, AtSign, MessageSquare } from 'lucide-react';
import type { Channel } from './types';

/**
 * ChannelHeader 组件 Props
 *
 * @property channel - Channel 数据
 * @property onBack - 返回按钮点击回调（返回 Channel Hub）
 * @property onClose - 关闭按钮点击回调（关闭整个面板）
 */
export interface ChannelHeaderProps {
  channel: Channel;
  onBack: () => void;
  onClose: () => void;
}

/**
 * 根据 Channel 类型返回对应的图标组件
 *
 * @param type - Channel 类型
 * @returns 图标组件
 */
function getChannelIcon(type: Channel['type']) {
  switch (type) {
    case 'team':
      // 团队频道使用 # 图标
      return Hash;
    case 'agent':
      // Agent 频道使用 @ 图标
      return AtSign;
    case 'dm':
      // 私聊频道使用消息图标
      return MessageSquare;
    default:
      return Hash;
  }
}

/**
 * ChannelHeader 组件
 *
 * 布局结构：
 * ┌─────────────────────────────────────┐
 * │ [←] [Icon] Channel Name        [×] │
 * │     Description (if exists)         │
 * └─────────────────────────────────────┘
 */
export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  onBack,
  onClose,
}) => {
  // 获取 Channel 类型对应的图标
  const Icon = getChannelIcon(channel.type);

  return (
    <div className="flex flex-col border-b border-white/10 bg-[#0f111a]">
      {/* 顶部操作栏：返回按钮 + Channel 信息 + 关闭按钮 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 返回按钮 - 返回 Channel Hub */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="Back to Channel Hub"
          title="返回 Channel Hub"
        >
          <ArrowLeft size={18} className="text-white/70" />
        </button>

        {/* Channel 图标 */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5">
          <Icon size={16} className="text-white/70" />
        </div>

        {/* Channel 名称 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-white/90 truncate">
            {channel.name}
          </h2>
        </div>

        {/* 关闭按钮 - 关闭整个面板 */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="Close panel"
          title="关闭面板"
        >
          <X size={18} className="text-white/70" />
        </button>
      </div>

      {/* Channel 描述（如果存在） */}
      {channel.description && (
        <div className="px-4 pb-3">
          <p className="text-xs text-white/50 line-clamp-2">
            {channel.description}
          </p>
        </div>
      )}
    </div>
  );
};

// 使用 React.memo 优化性能，避免不必要的重渲染
export default React.memo(ChannelHeader);
