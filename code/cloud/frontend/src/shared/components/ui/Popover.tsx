import React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/shared/lib/utils';

export interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface PopoverContentProps {
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  width?: string;
  onOpenAutoFocus?: (event: Event) => void;
}

const PopoverRoot = ({ children, open, onOpenChange }: PopoverProps) => {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </PopoverPrimitive.Root>
  );
};

const PopoverTrigger = ({ children, asChild = true }: PopoverTriggerProps) => {
  return (
    <PopoverPrimitive.Trigger asChild={asChild}>
      {children}
    </PopoverPrimitive.Trigger>
  );
};

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      children,
      side = 'bottom',
      align = 'center',
      sideOffset = 8,
      className = '',
      width = 'min-w-[300px] max-w-[min(380px,92vw)] w-[min(380px,92vw)]',
      onOpenAutoFocus,
    },
    ref
  ) => {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          side={side}
          align={align}
          sideOffset={sideOffset}
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            'bg-[#111114] border border-white/[0.10] rounded-xl p-0 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 outline-none',
            width,
            className
          )}
        >
          {children}
          <PopoverPrimitive.Arrow className="fill-white/10" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  }
);

PopoverContent.displayName = 'PopoverContent';

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
});
