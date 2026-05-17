import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'
import { borderRadius } from '@/core/config/design-tokens'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden border border-white/10',
        'bg-white/5 backdrop-blur-md shadow-xl',
        'hover:border-white/20 transition-[border-color] duration-300',
        'h-full flex flex-col',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ borderRadius: borderRadius.card }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative z-10 flex-1">{children}</div>
    </motion.div>
  )
}
