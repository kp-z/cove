import { cn } from '@/shared/lib/utils';

interface ButtonGroupOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ButtonGroup({ options, value, onChange, className }: ButtonGroupProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => {
            if (option.onClick) {
              option.onClick();
            } else if (onChange) {
              onChange(option.value);
            }
          }}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
            'flex items-center gap-2',
            value === option.value
              ? 'bg-blue-500 text-white'
              : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.07] hover:text-white border border-white/[0.08] hover:border-white/[0.14]'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
