/**
 * ActionButton 组件
 * 可配置的操作按钮，支持图标、Tooltip、变体样式
 */

import { memo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/shared/utils/cn';
import type { MessageAction } from './types';

const actionButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
  {
    variants: {
      variant: {
        default: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200',
        primary: 'bg-transparent hover:bg-blue-500/10 text-gray-400 hover:text-blue-200',
        danger: 'bg-transparent hover:bg-red-500/10 text-gray-400 hover:text-red-300',
        ghost: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200',
      },
      size: {
        sm: 'w-6 h-6',
        md: 'w-7 h-7',
        lg: 'w-8 h-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

interface ActionButtonProps extends VariantProps<typeof actionButtonVariants> {
  action: MessageAction;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const ActionButton = memo(function ActionButton({
  action,
  onClick,
  disabled = false,
  variant,
  size = 'sm',
  className,
}: ActionButtonProps) {
  const Icon = action.icon;
  const iconSize = 14; // 统一使用更小的图标尺寸

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonVariants({ variant: variant || action.variant, size }), className)}
      aria-label={action.label}
    >
      <Icon size={iconSize} />
    </button>
  );

  if (action.tooltip) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 px-2 py-1 text-xs text-white bg-gray-900 border border-white/10 rounded-md shadow-lg"
              sideOffset={5}
            >
              {action.tooltip}
              {action.shortcut && (
                <span className="ml-2 text-gray-400">({action.shortcut})</span>
              )}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return button;
});
