import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslation } from 'react-i18next';

export const headerCapsuleBaseClass =
  'flex items-center bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] rounded-full transition-colors duration-150 will-change-transform';

export const headerCapsuleClass = `${headerCapsuleBaseClass} h-8 gap-2 px-3`;

export interface TokenUsageData {
  model?: string;
  gateway_model?: string;
  used: number;
  remaining: number;
  total: number;
  percentage: number;
  last_updated?: string;
}

interface TokenPillProps {
  data: TokenUsageData | undefined;
  isLoading: boolean;
}

function formatModelName(model?: string): string {
  if (!model) return 'Unknown';
  const lower = model.toLowerCase();
  const match = lower.match(/claude-(\w+)-([\d]+-[\d]+)/);
  if (match) {
    const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const version = match[2].replace('-', '.');
    return `${name} ${version}`;
  }
  const parts = model.split('-');
  if (parts.length >= 2) return parts.slice(-2).join(' ');
  return model;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  } catch {
    return '';
  }
}

export const TokenPill = React.memo(({ data, isLoading }: TokenPillProps) => {
  const { t } = useTranslation('layout');
  const pct = data?.percentage ?? 0;
  const isWarn = pct > 80;
  const hasData = !!data && data.total > 0;
  const rawModel = data?.gateway_model ?? data?.model;
  const displayModelStr = rawModel ? formatModelName(rawModel) : null;

  const dotColor = isWarn
    ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
    : 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.7)]';

  const fillClass = isWarn
    ? 'from-amber-500 to-red-500'
    : 'from-blue-500 to-violet-500';

  if (isLoading) {
    return (
      <div className={`${headerCapsuleClass} animate-pulse`}>
        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        <div className="w-16 h-2.5 rounded bg-white/10" />
        <div className="w-9 h-1 rounded bg-white/10" />
      </div>
    );
  }

  const tooltipBody = hasData ? (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/40 uppercase tracking-wider">{t('tokenPill.model')}</span>
        <span className="text-[12px] text-white/90 font-medium">
          {displayModelStr ?? formatModelName(data?.model)}
        </span>
      </div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/40">{t('tokenPill.used')}</span>
        <span className="text-[12px] text-white font-medium tabular-nums">
          {formatTokens(data.used)}
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/40">{t('tokenPill.remaining')}</span>
        <span className={`text-[12px] font-medium tabular-nums ${isWarn ? 'text-amber-400' : 'text-blue-400'}`}>
          {formatTokens(data.remaining)}
        </span>
      </div>
      <div className="w-full h-[4px] rounded-full bg-white/[0.08] overflow-hidden mb-2">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillClass} transition-[width] duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-medium tabular-nums ${isWarn ? 'text-amber-400' : 'text-blue-400'}`}>
          {pct.toFixed(1)}%
        </span>
        <span className="text-[11px] text-white/30 tabular-nums">
          / {formatTokens(data.total)}
        </span>
      </div>
      {data.last_updated && (
        <div className="text-[10px] text-white/20 text-right mt-1">
          {t('tokenPill.updatedAt', { time: formatTime(data.last_updated) })}
        </div>
      )}
    </>
  ) : (
    <div className="text-[12px] text-white/30 text-center py-2">
      {t('tokenPill.noData')}
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={`${headerCapsuleClass} group relative cursor-default select-none`}>
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            <span className="text-[12px] font-medium text-white/80 leading-none">
              {displayModelStr ?? '-- / --'}
            </span>
            {hasData && (
              <div className="w-9 h-[2px] rounded-full bg-white/[0.10] overflow-hidden flex-shrink-0">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${fillClass} transition-[width] duration-500`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            )}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align="end"
            sideOffset={8}
            className="bg-[#111114] border border-white/[0.10] rounded-2xl p-4 min-w-[210px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
          >
            {tooltipBody}
            <Tooltip.Arrow className="fill-white/10" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
});

TokenPill.displayName = 'TokenPill';
