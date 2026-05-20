import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface CapsuleTooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
}

/**
 * CapsuleTooltip - 统一的胶囊 Tooltip 组件
 *
 * 为 TopBar 胶囊组件提供统一的 tooltip 样式和行为
 */
export const CapsuleTooltip = React.memo(
  ({
    children,
    content,
    side = 'bottom',
    align = 'end',
    sideOffset = 8,
    delayDuration = 200,
  }: CapsuleTooltipProps) => {
    return (
      <Tooltip.Provider delayDuration={delayDuration}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side={side}
              align={align}
              sideOffset={sideOffset}
              className="bg-[#111114] border border-white/[0.10] rounded-xl px-3 py-2 text-xs text-white/90 z-50 max-w-[280px]"
            >
              {content}
              <Tooltip.Arrow className="fill-white/10" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }
);

CapsuleTooltip.displayName = 'CapsuleTooltip';
