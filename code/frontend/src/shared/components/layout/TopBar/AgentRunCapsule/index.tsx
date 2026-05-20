import React, { useState } from 'react';
import { Bot, Loader2, MessagesSquare } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import { useChannelPanelStore } from '@/features/channel/stores/channelStore';
import { Capsule } from '@/shared/components/ui/Capsule';
import { CapsuleTooltip } from '@/shared/components/ui/CapsuleTooltip';

interface AgentRunCapsuleProps {
  runningCount?: number;
}

export const AgentRunCapsule = React.memo(({ runningCount = 0 }: AgentRunCapsuleProps) => {
  const { t } = useTranslation('layout');
  const [open, setOpen] = useState(false);
  const hasRunning = runningCount > 0;
  const { openChannel } = useChannelPanelStore();

  const tooltipContent = hasRunning
    ? t('agentRun.tooltipRunning', { count: runningCount })
    : t('agentRun.tooltipIdle');

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <CapsuleTooltip content={tooltipContent}>
        <Popover.Trigger asChild>
          <Capsule
            variant={hasRunning ? 'active' : 'default'}
            isExpanded={open}
            ariaLabel={
              hasRunning ? t('agentRun.ariaRunning', { count: runningCount }) : t('agentRun.ariaIdle')
            }
            title={hasRunning ? t('agentRun.titleRunning', { count: runningCount }) : t('agentRun.titleIdle')}
            minWidth="min-w-8"
            gap="gap-1.5"
            padding="px-2"
            justify="center"
            pulseEffect={hasRunning}
          >
            {hasRunning ? (
              <div className="flex items-center gap-1.5 relative z-10">
                <Loader2 size={12} className="text-blue-300 shrink-0 animate-spin" />
              </div>
            ) : (
              <Bot size={14} className="text-white/55 shrink-0 relative z-10" />
            )}
          </Capsule>
        </Popover.Trigger>
      </CapsuleTooltip>

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
              <span className="text-[10px] text-white/35 shrink-0">{t('agentRun.quickAgents')}</span>
            </div>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto px-3 py-2 space-y-3">
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-white/75 uppercase tracking-wide">
                  Channel
                </p>
              </div>
              <button
                onClick={() => {
                  openChannel('channel-1');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
              >
                <MessagesSquare size={14} />
                <span>{t('agentRun.openGeneral')}</span>
              </button>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-white/75 uppercase tracking-wide">
                  {t('agentRun.history')}
                </p>
              </div>
              <p className="text-[11px] text-white/45 py-2">{t('agentRun.noRecords')}</p>
            </section>
          </div>

          <Popover.Arrow className="fill-white/10" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

AgentRunCapsule.displayName = 'AgentRunCapsule';
