import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Info,
  Sparkles,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { headerCapsuleBaseClass } from '../TokenPill';

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
    const [isExpanded, setIsExpanded] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const activeNotifications = useMemo(
      () => notifications.filter((n) => n.type === 'loading'),
      [notifications]
    );
    const unreadCount = notifications.length;

    // 点击外部关闭
    useEffect(() => {
      if (!isExpanded) return;
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t)) return;
        if (panelRef.current?.contains(t)) return;
        setIsExpanded(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, [isExpanded]);

    return (
      <div className="relative z-50">
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                ref={triggerRef}
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-label={
                  unreadCount > 0
                    ? `通知中心，未读 ${unreadCount > 99 ? '99+' : unreadCount} 条`
                    : '通知中心'
                }
                className={`${headerCapsuleBaseClass} relative h-8 min-w-8 gap-1.5 px-2 justify-center shrink-0 transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] ${
                  activeNotifications.length > 0
                    ? 'border-violet-400/35 bg-violet-500/15 hover:bg-violet-500/25'
                    : ''
                } ${isExpanded ? 'ring-1 ring-white/20 bg-white/[0.08]' : ''}`}
              >
                {activeNotifications.length > 0 ? (
                  <Loader2
                    size={14}
                    className="text-violet-200 shrink-0 animate-spin relative z-10"
                  />
                ) : (
                  <Bell size={14} className="text-white/55 shrink-0 relative z-10" />
                )}
                {unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500/90 text-[10px] font-bold text-white flex items-center justify-center tabular-nums leading-none border border-white/15 relative z-10">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {activeNotifications.length > 0 && (
                  <span className="absolute inset-0 rounded-full bg-violet-400/20 pointer-events-none animate-pulse z-0" />
                )}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                align="end"
                sideOffset={8}
                className="z-[10050] bg-[#111114] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white/90 max-w-[240px]"
              >
                <p className="font-medium text-white">通知中心</p>
                <p className="text-[11px] text-white/60 mt-1">
                  {unreadCount > 0
                    ? `未读 ${unreadCount > 99 ? '99+' : unreadCount} 条`
                    : activeNotifications.length > 0
                      ? '有进行中的任务'
                      : '暂无未读'}
                </p>
                <Tooltip.Arrow className="fill-white/10" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>

        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              ref={panelRef}
              initial={{ scale: 0.96, opacity: 0, y: -12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute top-full right-0 mt-2 w-[min(420px,92vw)] max-h-[min(580px,calc(100vh-6rem))] rounded-2xl bg-gradient-to-br from-slate-800/98 via-slate-850/98 to-slate-900/98 backdrop-blur-2xl border border-white/15 shadow-[0_24px_80px_rgba(15,23,42,0.65)] overflow-hidden z-[10001]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-sky-400/[0.02] pointer-events-none" />

              <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400/20 to-sky-400/20 flex items-center justify-center border border-white/15">
                    <Sparkles size={15} className="text-violet-200" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">通知中心</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} 条未读消息` : '暂无新消息'}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-slate-300" />
                </motion.button>
              </div>

              <div className="relative overflow-y-auto max-h-[480px] custom-scrollbar">
                <div className="p-4 space-y-3">
                  {notifications.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Bell size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">暂无通知</p>
                    </div>
                  )}
                  {notifications.map((notification) => {
                    const style = typeStyleMap[notification.type] ?? typeStyleMap.info;
                    const safeTypeLabel =
                      notification.type === 'loading' ? '进行中' : notification.type || 'info';
                    const safeTimestamp =
                      notification.timestamp instanceof Date
                        ? notification.timestamp
                        : new Date(notification.timestamp as unknown as string);
                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`relative group rounded-xl bg-gradient-to-br ${style.cardGlow} backdrop-blur-sm border border-white/10 p-4 shadow-lg ring-1 ${style.ring}`}
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />

                        <div className="relative flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">{style.icon}</div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h4 className={`text-sm font-semibold ${style.titleColor}`}>
                                {notification.title}
                              </h4>
                              <span
                                className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium ${style.chip}`}
                              >
                                {safeTypeLabel}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed mb-2">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">
                                {safeTimestamp.toLocaleTimeString('zh-CN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => onDismiss(notification.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md bg-white/8 hover:bg-white/15 flex items-center justify-center"
                              >
                                <X size={12} className="text-slate-400" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {notifications.length > 0 && (
                <div className="relative px-5 py-3 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClearAll}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-700/70 hover:to-slate-800/70 border border-white/10 text-xs font-medium text-slate-300 transition-all"
                  >
                    清空所有通知
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

NotificationBubble.displayName = 'NotificationBubble';
