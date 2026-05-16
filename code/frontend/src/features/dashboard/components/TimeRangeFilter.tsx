import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';

export type TimeRange = 'today' | 'week' | 'month';

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const { t } = useTranslation('dashboard');

  const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
    { value: 'today', label: t('timeRange.today') },
    { value: 'week', label: t('timeRange.week') },
    { value: 'month', label: t('timeRange.month') },
  ];
  return (
    <div className="flex gap-2">
      {timeRangeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
