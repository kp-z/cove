import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Capsule } from '@/shared/components/ui/Capsule';
import { CapsuleTooltip } from '@/shared/components/ui/CapsuleTooltip';

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
    <CapsuleTooltip content={formatFull(now, lang)}>
      <Capsule
        ariaLabel={formatFull(now, lang)}
        interactive={false}
      >
        <Clock size={14} className="text-white/50 shrink-0" />
        <span className="text-[12px] font-medium text-white/80 tabular-nums leading-none">
          {formatClock(now)}
        </span>
      </Capsule>
    </CapsuleTooltip>
  );
});

TimeCapsule.displayName = 'TimeCapsule';
