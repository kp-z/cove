import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Notification } from '@/shared/stores/notificationStore'

interface NotificationBubbleProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    borderColor: 'border-emerald-300/30',
    glowColor: 'shadow-emerald-500/20',
    iconColor: 'text-emerald-300',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-rose-300/30',
    glowColor: 'shadow-rose-500/20',
    iconColor: 'text-rose-300',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-amber-300/30',
    glowColor: 'shadow-amber-500/20',
    iconColor: 'text-amber-300',
  },
  info: {
    icon: Info,
    borderColor: 'border-blue-300/30',
    glowColor: 'shadow-blue-500/20',
    iconColor: 'text-blue-300',
  },
  loading: {
    icon: Loader2,
    borderColor: 'border-violet-300/30',
    glowColor: 'shadow-violet-500/20',
    iconColor: 'text-violet-300',
  },
}

export function NotificationBubble({ notifications, onDismiss }: NotificationBubbleProps) {
  return (
    <div className="fixed top-20 right-6 z-50 space-y-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const config = typeConfig[notification.type]
          const Icon = config.icon

          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ scale: 0.96, opacity: 0, y: -12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: 100 }}
              transition={{
                type: 'spring',
                damping: 28,
                stiffness: 320,
              }}
              className={cn(
                'group relative overflow-hidden rounded-xl border backdrop-blur-2xl',
                'bg-gradient-to-br from-slate-800/98 via-slate-850/98 to-slate-900/98',
                'shadow-2xl',
                config.borderColor,
                config.glowColor
              )}
            >
              <div className="p-4 pr-12">
                <div className="flex items-start gap-3">
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0 mt-0.5',
                      config.iconColor,
                      notification.type === 'loading' && 'animate-spin'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white mb-1">{notification.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{notification.message}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDismiss(notification.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4 text-slate-400" />
              </motion.button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
