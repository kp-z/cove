import { cn } from '@/shared/lib/utils';

interface HoverGradientProps {
  /**
   * Border radius style
   * @default 'rounded-2xl'
   */
  rounded?: 'rounded-full' | 'rounded-2xl' | 'rounded-xl' | 'rounded-lg';

  /**
   * Additional className
   */
  className?: string;
}

/**
 * Reusable hover gradient effect component
 * Used across GlassCard, TokenPill, AgentRunCapsule, TimeCapsule, NotificationBubble, UserMenu
 */
export function HoverGradient({ rounded = 'rounded-2xl', className }: HoverGradientProps) {
  return (
    <span
      className={cn(
        'absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
        rounded,
        className,
      )}
    />
  );
}
