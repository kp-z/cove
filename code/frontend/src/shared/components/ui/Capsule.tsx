import React from 'react';
import { HoverGradient } from './HoverGradient';

export interface CapsuleProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'active' | 'loading';
  isExpanded?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  title?: string;
  badge?: React.ReactNode;
  pulseEffect?: boolean;
  interactive?: boolean;
  minWidth?: string;
  gap?: string;
  padding?: string;
  height?: string;
  justify?: 'start' | 'center' | 'end';
}

const variantStyles = {
  default: '',
  active: 'border-blue-400/30 bg-blue-500/12 hover:bg-blue-500/18',
  loading: 'border-violet-400/35 bg-violet-500/15 hover:bg-violet-500/25',
};

/**
 * Capsule - 统一的胶囊组件
 *
 * 用于 TopBar 中的所有胶囊元素，提供统一的样式和交互
 */
export const Capsule = React.forwardRef<HTMLButtonElement, CapsuleProps>(
  (
    {
      children,
      onClick,
      className = '',
      variant = 'default',
      isExpanded = false,
      ariaLabel,
      ariaExpanded,
      title,
      badge,
      pulseEffect = false,
      interactive = true,
      minWidth,
      gap = 'gap-2',
      padding = 'px-3',
      height = 'h-8',
      justify = 'start',
    },
    ref
  ) => {
    const baseClass =
      'flex items-center bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] rounded-full transition-colors duration-150 will-change-transform';

    const interactionClass = interactive
      ? 'transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]'
      : 'cursor-default';

    const expandedClass = isExpanded ? 'ring-1 ring-white/20 bg-white/[0.08]' : '';

    const justifyClass = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    }[justify];

    const minWidthClass = minWidth || '';

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        title={title}
        className={`${baseClass} ${height} ${gap} ${padding} ${interactionClass} ${variantStyles[variant]} ${expandedClass} ${justifyClass} ${minWidthClass} ${className} group relative shrink-0`}
      >
        <HoverGradient rounded="rounded-full" />
        {children}
        {badge}
        {pulseEffect && (
          <span className="absolute inset-0 rounded-full bg-violet-400/20 pointer-events-none animate-pulse z-0" />
        )}
      </button>
    );
  }
);

Capsule.displayName = 'Capsule';
