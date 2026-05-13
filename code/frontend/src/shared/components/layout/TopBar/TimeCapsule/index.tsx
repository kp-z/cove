import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { headerCapsuleBaseClass } from '../TokenPill';

function formatClock(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatFull(d: Date, lang: string): string {
  return d.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TimeCapsuleProps {
  lang?: string;
}

export const TimeCapsule = React.memo(({ lang = 'zh' }: TimeCapsuleProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    const timeoutId = window.setTimeout(() => {
      tick();
      const intervalId = window.setInterval(tick, 60000);
      cleanup.intervalId = intervalId;
    }, msUntilNextMinute);
    const cleanup: { intervalId: number | null } = { intervalId: null };
    return () => {
      window.clearTimeout(timeoutId);
      if (cleanup.intervalId !== null) window.clearInterval(cleanup.intervalId);
    };
  }, []);

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={`${headerCapsuleBaseClass} group relative h-8 gap-2 px-3 cursor-default select-none`}
            aria-label={formatFull(now, lang)}
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            <Clock size={14} className="text-white/50 shrink-0" />
            <span className="text-[12px] font-medium text-white/80 tabular-nums leading-none">
              {formatClock(now)}
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align="end"
            sideOffset={8}
            className="bg-[#111114] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white/90 z-50"
          >
            {formatFull(now, lang)}
            <Tooltip.Arrow className="fill-white/10" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
});

TimeCapsule.displayName = 'TimeCapsule';
