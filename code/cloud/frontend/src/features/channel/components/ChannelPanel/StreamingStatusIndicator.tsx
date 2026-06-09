/**
 * StreamingStatusIndicator 组件
 * 显示 Agent 回复的当前状态（第一人称视角）
 */

import { Loader2, Brain, Wrench, MessageSquare } from 'lucide-react';
import type { StreamingPhase } from '../../domain/models/Message';

interface StreamingStatusIndicatorProps {
  phase?: StreamingPhase;
  currentTool?: {
    name: string;
    params?: any;
  };
}

export function StreamingStatusIndicator({ phase, currentTool }: StreamingStatusIndicatorProps) {
  if (!phase) return null;

  switch (phase) {
    case 'pending':
      // pending 状态：前端创建的占位（方案 B）或等待后端响应
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>等待 Agent 接收...</span>
        </div>
      );

    case 'accepted':
      // accepted 状态：后端确认接收
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Agent 正在准备...</span>
        </div>
      );

    case 'thinking':
      return (
        <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
          <Brain className="w-4 h-4 animate-pulse" />
          <span>正在思考...</span>
        </div>
      );

    case 'tool_use':
      return (
        <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
          <Wrench className="w-4 h-4 animate-bounce" />
          <span>使用工具{currentTool ? `: ${currentTool.name}` : ''}</span>
        </div>
      );

    case 'responding':
      return (
        <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
          <MessageSquare className="w-4 h-4" />
          <span>正在回复...</span>
        </div>
      );

    case 'completed':
      return null; // 完成后不显示状态

    case 'failed':
      return (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
          <span>⚠️ 响应失败</span>
        </div>
      );

    default:
      return null;
  }
}
