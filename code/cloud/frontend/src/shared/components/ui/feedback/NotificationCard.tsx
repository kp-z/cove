import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Info,
} from 'lucide-react';

export interface NotificationCardProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

const typeStyleMap: Record<
  NotificationCardProps['type'],
  {
    icon: React.ReactNode;
    iconColor: string;
    titleColor: string;
    bgGradient: string;
    borderColor: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={16} />,
    iconColor: 'text-emerald-300',
    titleColor: 'text-emerald-100',
    bgGradient: 'from-emerald-400/20 via-emerald-300/8 to-transparent',
    borderColor: 'border-emerald-300/25',
  },
  error: {
    icon: <AlertCircle size={16} />,
    iconColor: 'text-rose-300',
    titleColor: 'text-rose-100',
    bgGradient: 'from-rose-400/20 via-rose-300/8 to-transparent',
    borderColor: 'border-rose-300/25',
  },
  warning: {
    icon: <AlertCircle size={16} />,
    iconColor: 'text-amber-300',
    titleColor: 'text-amber-100',
    bgGradient: 'from-amber-400/20 via-amber-300/8 to-transparent',
    borderColor: 'border-amber-300/25',
  },
  info: {
    icon: <Info size={16} />,
    iconColor: 'text-blue-300',
    titleColor: 'text-blue-100',
    bgGradient: 'from-blue-400/20 via-blue-300/8 to-transparent',
    borderColor: 'border-blue-300/25',
  },
  loading: {
    icon: <Loader2 size={16} className="animate-spin" />,
    iconColor: 'text-violet-300',
    titleColor: 'text-violet-100',
    bgGradient: 'from-violet-400/20 via-violet-300/8 to-transparent',
    borderColor: 'border-violet-300/25',
  },
};

export const NotificationCard = React.memo(
  ({ type, title, message, onDismiss, showDismiss = true }: NotificationCardProps) => {
    const style = typeStyleMap[type];

    return (
      <div
        className={`
          group relative rounded-lg bg-white/[0.02] backdrop-blur-xl
          border ${style.borderColor}
          p-3 shadow-lg
          hover:bg-white/[0.04] transition-colors
          min-w-[280px] max-w-[420px]
        `}
      >
        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${style.bgGradient} rounded-lg pointer-events-none`}
        />

        <div className="relative flex items-start gap-2.5">
          {/* Icon */}
          <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
            {style.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${style.titleColor} leading-snug`}>
              {title}
            </h4>
            {message && (
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                {message}
              </p>
            )}
          </div>

          {/* Dismiss button */}
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            >
              <X size={12} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

NotificationCard.displayName = 'NotificationCard';
