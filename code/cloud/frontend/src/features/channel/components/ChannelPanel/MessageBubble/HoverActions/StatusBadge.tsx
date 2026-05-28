/**
 * StatusBadge 组件
 * 状态徽章，支持图标和 Tooltip
 */

import { memo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/shared/utils/cn';
import type { StatusBadge as StatusBadgeType } from './types';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-500/20 text-gray-300',
        success: 'bg-green-500/20 text-green-300',
        warning: 'bg-yellow-500/20 text-yellow-300',
        info: 'bg-blue-500/20 text-blue-300',
        purple: 'bg-purple-500/20 text-purple-300',
        blue: 'bg-blue-500/20 text-blue-300',
        green: 'bg-green-500/20 text-green-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  badge: StatusBadgeType;
  className?: string;
}

export const StatusBadge = memo(function StatusBadge({
  badge,
  variant,
  className,
}: StatusBadgeProps) {
  const Icon = badge.icon;

  const badgeContent = (
    <div className={cn(statusBadgeVariants({ variant: variant || badge.variant }), className)}>
      {Icon && <Icon size={12} />}
      <span>{badge.label}</span>
    </div>
  );

  if (badge.tooltip) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{badgeContent}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 px-2 py-1 text-xs text-white bg-gray-900 border border-white/10 rounded-md shadow-lg"
              sideOffset={5}
            >
              {badge.tooltip}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return badgeContent;
});
