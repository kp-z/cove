/**
 * StreamingStatusIndicator 组件
 * Agent 回复过程中的进度指示器（简洁、中性、与阶段语义一一对应）：
 * - pending / accepted / thinking 等「无正文」阶段：单行「<状态文案> · 已等待 Ns」，无任何前置动画
 *   （加载/活着的观感由头像状态胶囊承担，避免与头像动画重复）
 * - tool_use：静态工具图标 + 「调用工具 <name>」 + 单行截断参数摘要 + 保留尾部三点
 * - responding：静态图标 + 「正在回复…」
 * - completed：不展示；failed：展示失败态
 */

import { useEffect, useRef, useState } from 'react';
import { Wrench, MessageSquare } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { StreamingPhase } from '../../domain/models/Message';

interface StreamingStatusIndicatorProps {
  phase?: StreamingPhase;
  currentTool?: {
    name: string;
    params?: any;
  };
  // 该气泡的起始时间（通常为消息 timestamp）。用于计算「已等待 Ns」，
  // 且在占位被 accepted 重绑定（React key 变化导致组件重挂载）后仍能保持连续计时。
  startedAt?: Date;
}

// 超过该秒数仍停留在「无正文」阶段时，切换为更耐心的安抚文案。
const SLOW_THRESHOLD_SEC = 30;

// 三个跳动的小圆点，模拟聊天「对方正在输入」动画（仅 tool_use 尾部复用）。
function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          // 错峰延迟形成波浪式跳动。
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
        />
      ))}
    </span>
  );
}

// 把工具参数压成单行摘要：对象取键值拼接，过长交由 CSS truncate 截断、不换行撑高。
function summarizeToolParams(params: any): string {
  try {
    if (params == null) return '';
    if (typeof params === 'string') return params;
    if (typeof params !== 'object') return String(params);
    // 步骤1：把对象键值拼成 `k: v` 形式（值为对象时序列化）。
    const parts = Object.entries(params).map(([k, v]) => {
      const val =
        typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${k}: ${val}`;
    });
    return parts.join(', ');
  } catch {
    // 异常输入（如循环引用）时退化为空摘要，绝不抛错影响渲染。
    return '';
  }
}

// 无正文阶段的简洁状态文案：与后端 phase 一一对应；慢速时切换为安抚文案。
function getPreContentLabel(phase: StreamingPhase, slow: boolean): string {
  if (slow) return '仍在处理，请稍候…';
  // thinking 单独区分「思考中」；pending / accepted 统一为「处理中」。
  return phase === 'thinking' ? '思考中…' : '处理中…';
}

export function StreamingStatusIndicator({ phase, currentTool, startedAt }: StreamingStatusIndicatorProps) {
  // 「无正文」阶段：需要连续计时以呈现等待体验。
  const isPreContentPhase = phase === 'pending' || phase === 'accepted' || phase === 'thinking';

  // 计时基准：优先使用消息 timestamp，缺省时退化为组件挂载时刻。
  const mountRef = useRef<number>(Date.now());
  const startMs = startedAt ? startedAt.getTime() : mountRef.current;

  const [elapsedSec, setElapsedSec] = useState(() => Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

  useEffect(() => {
    if (!isPreContentPhase) return;

    // 每秒刷新「已等待」秒数。
    const tick = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(tick);
  }, [isPreContentPhase, startMs]);

  if (!phase) return null;

  // 无正文阶段：单行「<简洁状态文案> · 已等待 Ns」，无面包屑、无前置动画。
  if (isPreContentPhase) {
    const slow = elapsedSec >= SLOW_THRESHOLD_SEC;
    const label = getPreContentLabel(phase, slow);
    return (
      <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-300">
        <span>{label}</span>
        {/* 连续「已等待」计时：tabular-nums 防抖动；用克制的中点分隔 */}
        {elapsedSec > 0 && (
          <>
            <span className="text-gray-600" aria-hidden>
              ·
            </span>
            <span className="text-gray-500 tabular-nums">已等待 {elapsedSec}s</span>
          </>
        )}
      </div>
    );
  }

  switch (phase) {
    case 'tool_use': {
      // 工具参数摘要：单行截断，过长不换行撑高。
      const paramsSummary = currentTool?.params ? summarizeToolParams(currentTool.params) : '';
      return (
        <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-2 min-w-0">
          {/* 前置工具图标：静态（无动画），加载动效交给头像胶囊 */}
          <Wrench className="w-4 h-4 flex-shrink-0" />
          <span className="flex-shrink-0">调用工具{currentTool ? ` ${currentTool.name}` : ''}</span>
          {/* 参数摘要：单行截断，hover 可看全文 */}
          {paramsSummary && (
            <span className="text-purple-300/70 truncate min-w-0" title={paramsSummary}>
              {paramsSummary}
            </span>
          )}
          {/* 尾部三点保留：用户明确要求保留尾部点 */}
          <TypingDots className="text-purple-400 flex-shrink-0" />
        </div>
      );
    }

    case 'responding':
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-2">
          {/* 前置图标静态：不加动画 */}
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <span>正在回复…</span>
        </div>
      );

    case 'completed':
      return null; // 完成后不显示状态，交由真实正文接管

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
