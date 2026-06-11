/**
 * AgentProgressPanel 组件
 * Agent 回复过程的实时进度展示面板
 *
 * 功能：
 * - 实时显示 Agent 的执行阶段（pending → thinking → tool_use → responding）
 * - 显示 thinking 内容（可折叠）
 * - 显示 tool call 详情和参数
 * - 显示等待时间和动画反馈
 * - 内聚所有 Agent 过程信息的展示逻辑
 */

import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Wrench,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Edit3,
  Terminal,
  Search,
  Code,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { StreamingPhase } from '../../domain/models/Message';

interface AgentProgressPanelProps {
  phase?: StreamingPhase;
  thinking?: string;
  currentTool?: {
    name: string;
    params?: any;
  };
  startedAt?: Date;
  className?: string;
}

// 工具图标映射
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Write: Edit3,
  Edit: Edit3,
  Bash: Terminal,
  Grep: Search,
  Glob: Search,
  WebSearch: Search,
  WebFetch: Code,
};

// 工具显示名称
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  Read: '读取文件',
  Write: '写入文件',
  Edit: '编辑文件',
  Bash: '执行命令',
  Grep: '搜索内容',
  Glob: '查找文件',
  WebSearch: '网络搜索',
  WebFetch: '获取网页',
};

// 阶段配置
const PHASE_CONFIG = {
  pending: {
    label: '等待接收',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    Icon: Loader2,
    iconClass: 'animate-spin',
  },
  accepted: {
    label: '已接收',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    Icon: Loader2,
    iconClass: 'animate-spin',
  },
  thinking: {
    label: '思考中',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    Icon: Brain,
    iconClass: 'animate-pulse',
  },
  tool_use: {
    label: '工具调用',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    Icon: Wrench,
    iconClass: '',
  },
  responding: {
    label: '正在回复',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    Icon: MessageSquare,
    iconClass: '',
  },
} as const;

// 格式化工具参数为可读字符串
function formatToolParams(params: any): string {
  if (!params || typeof params !== 'object') return JSON.stringify(params);

  const formatted: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    let valueStr: string;
    if (typeof value === 'string') {
      valueStr = value.length > 100 ? `${value.slice(0, 100)}...` : value;
    } else {
      valueStr = JSON.stringify(value, null, 2);
    }
    formatted.push(`${key}: ${valueStr}`);
  }
  return formatted.join('\n');
}

// 跳动的点
function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
        />
      ))}
    </span>
  );
}

export function AgentProgressPanel({
  phase,
  thinking,
  currentTool,
  startedAt,
  className,
}: AgentProgressPanelProps) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [isToolParamsExpanded, setIsToolParamsExpanded] = useState(false);
  const mountRef = useRef(Date.now());

  // 计算等待时间
  useEffect(() => {
    const startMs = startedAt ? startedAt.getTime() : mountRef.current;

    const tick = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(tick);
  }, [startedAt]);

  if (!phase || phase === 'completed' || phase === 'failed') return null;

  const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG];
  if (!config) return null;

  const { label, color, bgColor, borderColor, Icon, iconClass } = config;
  const ToolIcon = currentTool ? (TOOL_ICONS[currentTool.name] || Wrench) : Wrench;
  const toolDisplayName = currentTool ? (TOOL_DISPLAY_NAMES[currentTool.name] || currentTool.name) : '';

  return (
    <div className={cn('space-y-2', className)}>
      {/* 主状态行 */}
      <div className={cn('flex items-center gap-2 text-xs', color)}>
        <Icon className={cn('w-4 h-4 flex-shrink-0', iconClass)} />
        <span className="font-medium">{label}</span>
        {elapsedSec > 0 && (
          <>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500 tabular-nums">{elapsedSec}s</span>
          </>
        )}
        <TypingDots className={color} />
      </div>

      {/* Thinking 内容区域 */}
      {phase === 'thinking' && thinking && (
        <div className={cn('rounded-lg border p-3 transition-all', borderColor, bgColor)}>
          <button
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            className="flex items-center gap-2 w-full text-left text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
          >
            {isThinkingExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <Brain className="w-3.5 h-3.5 flex-shrink-0" />
            <span>思考过程</span>
          </button>

          {isThinkingExpanded && (
            <div className="mt-2 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap border-t border-blue-500/20 pt-2">
              {thinking}
            </div>
          )}
        </div>
      )}

      {/* Tool Call 详情区域 */}
      {phase === 'tool_use' && currentTool && (
        <div className={cn('rounded-lg border p-3 transition-all', borderColor, bgColor)}>
          <div className="flex items-start gap-2">
            <ToolIcon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', color)} />
            <div className="flex-1 min-w-0">
              <div className={cn('text-xs font-medium', color)}>
                {toolDisplayName}
              </div>

              {currentTool.params && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsToolParamsExpanded(!isToolParamsExpanded)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {isToolParamsExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>参数</span>
                  </button>

                  {isToolParamsExpanded && (
                    <pre className="mt-2 text-xs text-gray-300 bg-black/20 rounded p-2 overflow-x-auto border border-purple-500/10">
                      {formatToolParams(currentTool.params)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responding 状态 */}
      {phase === 'responding' && (
        <div className={cn('flex items-center gap-2 text-xs', color)}>
          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
          <span>正在生成回复</span>
          <TypingDots className={color} />
        </div>
      )}
    </div>
  );
}
