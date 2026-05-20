import { useTranslation } from 'react-i18next';
import { ButtonGroup } from '@/shared/components/ui/ButtonGroup';

export type TimeRange = 'today' | 'week' | 'month';

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const { t } = useTranslation('dashboard');

  const timeRangeOptions = [
    { value: 'today', label: t('timeRange.today') },
    { value: 'week', label: t('timeRange.week') },
    { value: 'month', label: t('timeRange.month') },
  ];

  return (
    <ButtonGroup
      options={timeRangeOptions}
      value={value}
      onChange={(val) => onChange(val as TimeRange)}
    />
  );
}
