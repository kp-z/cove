import { type CSSProperties, type FC, type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export interface AnimatedShinyTextProps {
  children: ReactNode
  className?: string
  shimmerWidth?: number
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
}) => {
  return (
    <span
      style={{
        '--shiny-width': `${shimmerWidth}px`,
      } as CSSProperties}
      className={cn(
        'animate-shiny-text bg-clip-text text-transparent',
        'bg-gradient-to-r from-transparent via-foreground/80 to-transparent',
        'bg-[length:var(--shiny-width)_100%] bg-[position:0_0]',
        '[transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite]',
        className
      )}
    >
      {children}
    </span>
  )
}
