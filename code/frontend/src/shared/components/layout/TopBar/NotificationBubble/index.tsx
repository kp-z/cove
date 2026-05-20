import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Info,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Capsule } from '@/shared/components/ui/Capsule';
import { Popover } from '@/shared/components/ui/Popover';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationBubbleProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const typeStyleMap: Record<
  Notification['type'],
  {
    icon: React.ReactNode;
    chip: string;
    ring: string;
    cardGlow: string;
    titleColor: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={16} className="text-emerald-300" />,
    chip: 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/25',
    ring: 'ring-emerald-300/30',
    cardGlow: 'from-emerald-400/20 via-emerald-300/8 to-transparent',
    titleColor: 'text-emerald-100',
  },
  error: {
    icon: <AlertCircle size={16} className="text-rose-300" />,
    chip: 'bg-rose-400/15 text-rose-200 border border-rose-300/25',
    ring: 'ring-rose-300/30',
    cardGlow: 'from-rose-400/20 via-rose-300/8 to-transparent',
    titleColor: 'text-rose-100',
  },
  warning: {
    icon: <AlertCircle size={16} className="text-amber-300" />,
    chip: 'bg-amber-400/15 text-amber-200 border border-amber-300/25',
    ring: 'ring-amber-300/30',
    cardGlow: 'from-amber-400/20 via-amber-300/8 to-transparent',
    titleColor: 'text-amber-100',
  },
  info: {
    icon: <Info size={16} className="text-blue-300" />,
    chip: 'bg-blue-400/15 text-blue-200 border border-blue-300/25',
    ring: 'ring-blue-300/30',
    cardGlow: 'from-blue-400/20 via-blue-300/8 to-transparent',
    titleColor: 'text-blue-100',
  },
  loading: {
    icon: <Loader2 size={16} className="text-violet-300 animate-spin" />,
    chip: 'bg-violet-400/15 text-violet-200 border border-violet-300/25',
    ring: 'ring-violet-300/30',
    cardGlow: 'from-violet-400/20 via-violet-300/8 to-transparent',
    titleColor: 'text-violet-100',
  },
};

export const NotificationBubble = React.memo(
  ({ notifications, onDismiss, onClearAll }: NotificationBubbleProps) => {
    const { t } = useTranslation('layout');
    const [isExpanded, setIsExpanded] = useState(false);

    const activeNotifications = useMemo(
      () => notifications.filter((n) => n.type === 'loading'),
      [notifications]
    );
    const unreadCount = notifications.length;

    const tooltipContent = useMemo(() => {
      if (notifications.length === 0) {
        return t('notification.noUnread');
      }

      const recentNotifications = notifications.slice(0, 3);
      const remaining = notifications.length - 3;

      return (
        <div className="space-y-1.5 min-w-[200px] max-w-[280px]">
          {recentNotifications.map((notification) => (
            <div key={notification.id} className="text-xs">
              <div className="font-medium text-white/90 truncate">
                {notification.title}
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <div className="text-[10px] text-white/50 pt-0.5">
              +{remaining} {t('notification.more')}
            </div>
          )}
        </div>
      );
    }, [notifications, t]);

    return (
      <Popover open={isExpanded} onOpenChange={setIsExpanded}>
        <Popover.Trigger>
          <Capsule
            onClick={() => setIsExpanded(!isExpanded)}
            variant={activeNotifications.length > 0 ? 'loading' : 'default'}
            isExpanded={isExpanded}
            ariaLabel={
              unreadCount > 0
                ? t('notification.ariaWithUnread', { count: unreadCount > 99 ? '99+' : unreadCount })
                : t('notification.ariaDefault')
            }
            minWidth="min-w-8"
            gap="gap-1.5"
            padding="px-2"
            justify="center"
            pulseEffect={activeNotifications.length > 0}
            badge={
              unreadCount > 0 ? (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500/90 text-[10px] font-bold text-white flex items-center justify-center tabular-nums leading-none border border-white/15 relative z-10">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : undefined
            }
          >
            {activeNotifications.length > 0 ? (
              <Loader2 size={14} className="text-violet-200 shrink-0 animate-spin relative z-10" />
            ) : (
              <Bell size={14} className="text-white/55 shrink-0 relative z-10" />
            )}
          </Capsule>
        </Popover.Trigger>

        <Popover.Content align="end" width="w-[min(420px,92vw)]" className="max-h-[min(580px,calc(100vh-6rem))]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-violet-300" />
              <h3 className="text-sm font-semibold text-white">{t('notification.center')}</h3>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-slate-300" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[480px] custom-scrollbar">
            <div className="p-3 space-y-2">
              {notifications.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Bell size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t('notification.empty')}</p>
                </div>
              )}
              {notifications.map((notification) => {
                const style = typeStyleMap[notification.type] ?? typeStyleMap.info;
                const safeTypeLabel =
                  notification.type === 'loading' ? t('notification.inProgress') : notification.type || 'info';
                const safeTimestamp =
                  notification.timestamp instanceof Date
                    ? notification.timestamp
                    : new Date(notification.timestamp as unknown as string);
                return (
                  <div
                    key={notification.id}
                    className={`group rounded-lg bg-white/[0.02] border border-white/10 p-3 hover:bg-white/[0.04] transition-colors`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-xs font-semibold ${style.titleColor}`}>
                            {notification.title}
                          </h4>
                          <span
                            className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${style.chip}`}
                          >
                            {safeTypeLabel}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed mb-1.5">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-500">
                            {safeTimestamp.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          <button
                            onClick={() => onDismiss(notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center"
                          >
                            <X size={11} className="text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10">
              <button
                onClick={onClearAll}
                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
              >
                {t('notification.clearAll')}
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover>
    );
  }
);

NotificationBubble.displayName = 'NotificationBubble';
