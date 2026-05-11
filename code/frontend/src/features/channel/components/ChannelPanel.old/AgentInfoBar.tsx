/**
 * AgentInfoBar 组件
 *
 * 显示当前 Thread 中的 Agent 信息
 * 位于 ThreadTabs 下方
 *
 * 功能：
 * - 显示 Agent 头像、名称、模型
 * - 显示 Agent 状态（idle/running/error）
 * - 支持展开/折叠详细信息
 * - 显示 Agent 描述（展开时）
 *
 * 参考：claude_manager 的 AgentChatHeader 设计
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import type { AgentInfo } from './types';

/**
 * AgentInfoBar 组件 Props
 *
 * @property agent - Agent 信息
 * @property expanded - 是否展开详细信息（可选，默认 false）
 * @property onToggleExpand - 展开/折叠回调（可选）
 */
export interface AgentInfoBarProps {
  agent: AgentInfo;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * 根据模型类型返回对应的显示文本和颜色
 *
 * @param model - 模型类型
 * @returns 模型显示信息
 */
function getModelInfo(model: AgentInfo['model']) {
  switch (model) {
    case 'opus':
      return {
        label: 'Opus',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
      };
    case 'sonnet':
      return {
        label: 'Sonnet',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
      };
    case 'haiku':
      return {
        label: 'Haiku',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
      };
    default:
      return {
        label: model,
        color: 'text-white/60',
        bg: 'bg-white/5',
      };
  }
}

/**
 * 根据 Agent 状态返回对应的图标和颜色
 *
 * @param status - Agent 状态
 * @returns 状态显示信息
 */
function getStatusInfo(status: AgentInfo['status']) {
  switch (status) {
    case 'running':
      return {
        icon: Loader2,
        color: 'text-blue-400',
        label: 'Running',
        animate: true,
      };
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        label: 'Error',
        animate: false,
      };
    case 'idle':
    default:
      return {
        icon: null,
        color: 'text-white/40',
        label: 'Idle',
        animate: false,
      };
  }
}

/**
 * AgentInfoBar 组件
 *
 * 布局结构（折叠态）：
 * ┌─────────────────────────────────────┐
 * │ [▶] [Avatar] Agent Name | Sonnet   │
 * └─────────────────────────────────────┘
 *
 * 布局结构（展开态）：
 * ┌─────────────────────────────────────┐
 * │ [▼] [Avatar] Agent Name | Sonnet   │
 * │     Description text here...        │
 * └─────────────────────────────────────┘
 */
export const AgentInfoBar: React.FC<AgentInfoBarProps> = ({
  agent,
  expanded: controlledExpanded,
  onToggleExpand,
}) => {
  // 内部状态（如果没有外部控制）
  const [internalExpanded, setInternalExpanded] = useState(false);

  // 使用外部控制或内部状态
  const expanded = controlledExpanded ?? internalExpanded;
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // 获取模型和状态信息
  const modelInfo = getModelInfo(agent.model);
  const statusInfo = getStatusInfo(agent.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex flex-col border-b border-white/10 bg-[#0f111a]">
      {/* 主信息栏 */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors w-full text-left"
        aria-expanded={expanded}
        aria-label={`Agent: ${agent.name}`}
      >
        {/* 展开/折叠图标 */}
        <div className="flex items-center justify-center w-5 h-5 text-white/40">
          {expanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </div>

        {/* Agent 头像 */}
        <div className="relative">
          <img
            src={agent.avatar}
            alt={agent.name}
            className="w-8 h-8 rounded-full border border-white/10 object-cover"
          />
          {/* 状态指示器（运行中或错误） */}
          {StatusIcon && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0f111a] flex items-center justify-center ${statusInfo.color}`}
            >
              <StatusIcon
                size={10}
                className={statusInfo.animate ? 'animate-spin' : ''}
              />
            </div>
          )}
        </div>

        {/* Agent 名称 */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white/90 truncate block">
            {agent.name}
          </span>
        </div>

        {/* 模型标签 */}
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${modelInfo.bg} ${modelInfo.color}`}
        >
          {modelInfo.label}
        </div>
      </button>

      {/* 展开的详细信息 */}
      {expanded && agent.description && (
        <div className="px-4 pb-3 pl-12">
          <p className="text-xs text-white/50 leading-relaxed">
            {agent.description}
          </p>
        </div>
      )}
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(AgentInfoBar);
