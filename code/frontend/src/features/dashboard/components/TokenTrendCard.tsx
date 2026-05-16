import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { EChartWrapper } from '@/shared/components/charts/EChartWrapper';
import { chartColors } from '@/shared/lib/echarts-theme';
import type { EChartsOption } from 'echarts';
import type { TimeRange } from './TimeRangeFilter';

interface TokenTrendData {
  date: string;
  tokens: number;
  cost: number;
}

// Mock 数据 - 后续替换为 API 调用
const mockData: TokenTrendData[] = [
  { date: '01/15', tokens: 50000, cost: 5.2 },
  { date: '01/16', tokens: 65000, cost: 6.8 },
  { date: '01/17', tokens: 48000, cost: 5.0 },
  { date: '01/18', tokens: 72000, cost: 7.5 },
  { date: '01/19', tokens: 58000, cost: 6.1 },
  { date: '01/20', tokens: 81000, cost: 8.4 },
  { date: '01/21', tokens: 69000, cost: 7.2 },
];

interface TokenTrendCardProps {
  timeRange: TimeRange;
}

export function TokenTrendCard({ timeRange }: TokenTrendCardProps) {
  const { t } = useTranslation('dashboard');
  const data = mockData;

  const option: EChartsOption = {
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => value.toLocaleString(),
      },
    },
    series: [
      {
        name: 'Tokens',
        type: 'line',
        data: data.map((d) => d.tokens),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: chartColors.primary,
        },
        lineStyle: {
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>Tokens: ${item.value.toLocaleString()}`;
      },
    },
  };

  return (
    <GlassCard>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t('tokenTrend.title')}</h2>

        <EChartWrapper option={option} height={250} />

        {/* 空状态提示 */}
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 {t('tokenTrend.apiNote')}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
