/**
 * StreamingStatusIndicator 组件
 * Agent 回复过程中的拟人化「正在输入」指示器：
 * - pending / accepted / thinking 等「无正文」阶段：聊天式三点跳动动画 + 轮换文案 + 已等待计时
 * - tool_use：展示当前工具
 * - responding：展示「正在回复…」
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

// 拟人化「正在输入」的轮换文案：营造真人在思考、查资料、组织语言的感觉。
const THINKING_PHRASES = ['让我想想…', '正在查阅资料…', '正在整理回答…', '马上就好…'];
// 文案轮换间隔（毫秒）。
const PHRASE_ROTATE_MS = 2500;
// 超过该秒数仍停留在「无正文」阶段时，切换为更耐心的安抚文案。
const SLOW_THRESHOLD_SEC = 30;

// 三个跳动的小圆点，模拟聊天「对方正在输入」动画。
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

export function StreamingStatusIndicator({ phase, currentTool, startedAt }: StreamingStatusIndicatorProps) {
  // 「无正文」阶段：需要计时与文案轮换以呈现拟人化等待体验。
  const isPreContentPhase = phase === 'pending' || phase === 'accepted' || phase === 'thinking';

  // 计时基准：优先使用消息 timestamp，缺省时退化为组件挂载时刻。
  const mountRef = useRef<number>(Date.now());
  const startMs = startedAt ? startedAt.getTime() : mountRef.current;

  const [elapsedSec, setElapsedSec] = useState(() => Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (!isPreContentPhase) return;

    // 每秒刷新「已等待」秒数。
    const tick = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
    // 周期性轮换文案。
    const rotate = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length);
    }, PHRASE_ROTATE_MS);

    return () => {
      clearInterval(tick);
      clearInterval(rotate);
    };
  }, [isPreContentPhase, startMs]);

  if (!phase) return null;

  // 无正文阶段：统一渲染拟人化「正在输入」气泡。
  if (isPreContentPhase) {
    const slow = elapsedSec >= SLOW_THRESHOLD_SEC;
    const label = slow ? '仍在处理，请稍候…' : THINKING_PHRASES[phraseIdx];
    return (
      <div className="flex items-center gap-2 mb-2 text-sm text-blue-300">
        <TypingDots className="text-blue-400" />
        <span className="transition-opacity duration-300">{label}</span>
        {elapsedSec > 0 && (
          <span className="text-xs text-gray-500 tabular-nums">已等待 {elapsedSec}s</span>
        )}
      </div>
    );
  }

  switch (phase) {
    case 'tool_use':
      return (
        <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
          <Wrench className="w-4 h-4 animate-bounce" />
          <span>使用工具{currentTool ? `: ${currentTool.name}` : ''}</span>
          <TypingDots className="text-purple-400" />
        </div>
      );

    case 'responding':
      return (
        <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
          <MessageSquare className="w-4 h-4" />
          <span>正在回复…</span>
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
