import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from './button';

interface ButtonGroupOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

interface ButtonGroupProps extends VariantProps<typeof buttonVariants> {
  options: ButtonGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ButtonGroup({
  options,
  value,
  onChange,
  className,
  variant = 'outline',
  size = 'default',
}: ButtonGroupProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : variant}
          size={size}
          onClick={() => {
            if (option.onClick) {
              option.onClick();
            } else if (onChange) {
              onChange(option.value);
            }
          }}
        >
          {option.icon}
          {option.label}
        </Button>
      ))}
    </div>
  );
}
