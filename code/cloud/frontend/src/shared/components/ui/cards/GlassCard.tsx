import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'
import { borderRadius } from '@/core/config/design-tokens'
import { HoverGradient } from '@/shared/components/ui/HoverGradient'
import { AnimatedBorder } from '@/shared/components/ui/animations'

type BlurLevel = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type BorderVariant = 'default' | 'animated' | 'none'
type GradientVariant = 'hover' | 'none'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void

  // 视觉效果配置
  blur?: BlurLevel
  shadow?: ShadowLevel
  border?: BorderVariant
  gradient?: GradientVariant

  // 交互效果配置
  hover?: boolean
  hoverScale?: number
  hoverLift?: number

  // 布局配置
  padding?: string
  rounded?: string
}

const blurClasses: Record<BlurLevel, string> = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl',
}

const shadowClasses: Record<ShadowLevel, string> = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
}

export function GlassCard({
  children,
  className,
  onClick,
  blur = 'md',
  shadow = 'xl',
  border = 'default',
  gradient = 'hover',
  hover = true,
  hoverScale = 1.01,
  hoverLift = -4,
  padding,
  rounded,
}: GlassCardProps) {
  const hoverAnimation = hover
    ? { y: hoverLift, scale: hoverScale }
    : {}

  return (
    <motion.div
      whileHover={hoverAnimation}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden',
        // 背景和模糊
        'bg-white/5',
        blurClasses[blur],
        shadowClasses[shadow],
        // 边框
        border === 'default' && 'border border-white/10 hover:border-white/20',
        border === 'none' && 'border-0',
        // 过渡效果
        'transition-[border-color] duration-300',
        // 布局
        !padding && 'h-full flex flex-col',
        // 交互
        gradient === 'hover' && 'group',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ borderRadius: rounded || borderRadius.card }}
    >
      {/* 边框动画 */}
      {border === 'animated' && <AnimatedBorder />}

      {/* 悬停渐变 */}
      {gradient === 'hover' && <HoverGradient />}

      {/* 内容 */}
      <div className={cn('relative z-10', !padding && 'flex-1', padding)}>
        {children}
      </div>
    </motion.div>
  )
}

// 预设变体 - 方便快速使用
export const GlassCardVariants = {
  // 默认变体 - 适用于大多数卡片
  default: {
    blur: 'md' as BlurLevel,
    shadow: 'xl' as ShadowLevel,
    border: 'default' as BorderVariant,
    gradient: 'hover' as GradientVariant,
    hover: true,
  },

  // 登录变体 - 强视觉焦点
  hero: {
    blur: 'xl' as BlurLevel,
    shadow: '2xl' as ShadowLevel,
    border: 'animated' as BorderVariant,
    gradient: 'none' as GradientVariant,
    hover: false,
    padding: 'p-8',
  },

  // 简约变体 - 轻量级卡片
  minimal: {
    blur: 'sm' as BlurLevel,
    shadow: 'md' as ShadowLevel,
    border: 'default' as BorderVariant,
    gradient: 'none' as GradientVariant,
    hover: false,
  },

  // 交互变体 - 强调可点击
  interactive: {
    blur: 'md' as BlurLevel,
    shadow: 'lg' as ShadowLevel,
    border: 'default' as BorderVariant,
    gradient: 'hover' as GradientVariant,
    hover: true,
    hoverScale: 1.02,
    hoverLift: -6,
  },
} as const
