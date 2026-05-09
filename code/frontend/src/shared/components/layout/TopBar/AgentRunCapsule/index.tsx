/**
 * AgentRunCapsule - 顶栏 Agent 执行状态胶囊
 *
 * 注意：这是一个简化版本，用于 Cove 项目的 TopBar 集成
 * 完整功能需要后端 API 支持（agents, executions, projects）
 */
import React, { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import * as Tooltip from '@radix-ui/react-tooltip';
import { headerCapsuleBaseClass } from '../TokenPill';

interface AgentRunCapsuleProps {
  // 预留接口，未来可以传入真实数据
  runningCount?: number;
}

/**
 * 简化版 AgentRunCapsule
 *
 * TODO: 完整实现需要以下依赖
 * - ExecutionContext (运行中的执行列表)
 * - GlobalAgentChatContext (打开全局对话面板)
 * - NotificationContext (通知系统)
 * - API: agentsApi, executionsApi, projectsApi
 * - 全局快捷 Agent 管理 (localStorage)
 */
export const AgentRunCapsule = React.memo(({ runningCount = 0 }: AgentRunCapsuleProps) => {
  const [open, setOpen] = useState(false);
  const hasRunning = runningCount > 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-expanded={open}
                aria-label={
                  hasRunning ? `Agent 执行，${runningCount} 项进行中` : 'Agent 执行与历史'
                }
                title={hasRunning ? `进行中 ${runningCount} 项 — 点击查看` : '执行与历史'}
                className={`${headerCapsuleBaseClass} relative h-8 min-w-8 gap-1.5 px-2 justify-center shrink-0 transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] ${
                  hasRunning ? 'border-blue-400/30 bg-blue-500/12 hover:bg-blue-500/18' : ''
                } ${open ? 'ring-1 ring-white/20 bg-white/[0.08]' : ''}`}
              >
                {hasRunning ? (
                  <div className="flex items-center gap-1.5 relative z-10">
                    <Loader2 size={12} className="text-blue-300 shrink-0 animate-spin" />
                  </div>
                ) : (
                  <Bot size={14} className="text-white/55 shrink-0 relative z-10" />
                )}
                {hasRunning && (
                  <span className="absolute inset-0 rounded-full bg-blue-400/15 pointer-events-none animate-pulse z-0" />
                )}
              </button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              align="end"
              sideOffset={8}
              className="bg-[#111114] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white/90 z-50"
            >
              {hasRunning ? `进行中 ${runningCount} 项` : 'Agent 执行与历史'}
              <Tooltip.Arrow className="fill-white/10" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      <Popover.Portal>
        <Popover.Content
          align="end"
          side="bottom"
          sideOffset={8}
          className="bg-[#111114] border border-white/[0.10] rounded-xl p-0 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[300px] max-w-[min(380px,92vw)] w-[min(380px,92vw)] z-50 outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] text-white/35 shrink-0">快捷 Agent（开发中）</span>
            </div>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto px-3 py-2 space-y-3">
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-white/75 uppercase tracking-wide">
                  历史
                </p>
              </div>
              <p className="text-[11px] text-white/45 py-2">暂无记录</p>
            </section>
          </div>

          <Popover.Arrow className="fill-white/10" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

AgentRunCapsule.displayName = 'AgentRunCapsule';
