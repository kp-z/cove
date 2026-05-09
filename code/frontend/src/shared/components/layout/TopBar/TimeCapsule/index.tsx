import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { headerCapsuleBaseClass } from '../TokenPill';

function formatClock(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatFull(d: Date, lang: string): string {
  return d.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface TimeCapsuleProps {
  lang?: string;
}

/** 顶栏实时时间胶囊（与 TokenPill 视觉一致） */
export const TimeCapsule = React.memo(({ lang = 'zh' }: TimeCapsuleProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={`${headerCapsuleBaseClass} h-8 gap-2 px-3 cursor-default select-none`}
            aria-label={formatFull(now, lang)}
          >
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
