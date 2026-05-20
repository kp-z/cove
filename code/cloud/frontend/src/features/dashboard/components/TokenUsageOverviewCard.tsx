import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import type { TimeRange } from './TimeRangeFilter';

interface TokenUsageOverview {
  total: number;
  used: number;
  remaining: number;
  percentage: number;
  cost: {
    today: number;
    week: number;
    month: number;
  };
}

// Mock 数据 - 后续替换为 API 调用
const mockData: TokenUsageOverview = {
  total: 1000000,
  used: 450000,
  remaining: 550000,
  percentage: 45,
  cost: {
    today: 12.5,
    week: 85.3,
    month: 342.8,
  },
};

interface TokenUsageOverviewCardProps {
  timeRange: TimeRange;
}

export function TokenUsageOverviewCard({ timeRange }: TokenUsageOverviewCardProps) {
  const { t } = useTranslation('dashboard');
  const data = mockData;

  return (
    <GlassCard>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t('tokenUsage.title')}</h2>

        {/* 总量显示 */}
        <div className="mb-6">
          <div className="text-3xl font-bold mb-2">
            {data.used.toLocaleString()} / {data.total.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">{t('tokenUsage.used')} {data.percentage}%</div>
        </div>

        {/* 成本统计 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{t('tokenUsage.costToday')}</span>
            <span className="font-medium text-lg">${data.cost.today.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{t('tokenUsage.costWeek')}</span>
            <span className="font-medium text-lg">${data.cost.week.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{t('tokenUsage.costMonth')}</span>
            <span className="font-medium text-lg">${data.cost.month.toFixed(2)}</span>
          </div>
        </div>

        {/* 空状态提示 */}
        <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 {t('tokenUsage.apiNote', { timeRange })}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
