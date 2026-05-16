import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { CardGridLayout } from '@/shared/components/layout/CardGridLayout';
import { TimeRangeFilter, type TimeRange } from './TimeRangeFilter';
import { SystemStatusCard } from './SystemStatusCard';
import { TokenUsageOverviewCard } from './TokenUsageOverviewCard';
import { TokenTrendCard } from './TokenTrendCard';
import { AgentStatusCard } from './AgentStatusCard';
import { ChannelActivityCard } from './ChannelActivityCard';

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  const cardGridConfig = {
    rows: [
      // 第一行 - 系统状态 + Token 概览 (不等宽 2列)
      {
        id: 'overview-row',
        cols: 3,
        items: [
          {
            id: 'system-status',
            colSpan: { default: 1, md: 2, lg: 2 },
            content: <SystemStatusCard />,
            animation: { delay: 0.1 },
          },
          {
            id: 'token-overview',
            colSpan: { default: 1, md: 1, lg: 1 },
            content: <TokenUsageOverviewCard timeRange={timeRange} />,
            animation: { delay: 0.2 },
          },
        ],
      },
      // 第二行 - Token 趋势 + Channel 活动 + Agent 监控 (3列)
      {
        id: 'monitoring-row',
        cols: 3,
        items: [
          {
            id: 'token-trend',
            content: <TokenTrendCard timeRange={timeRange} />,
            animation: { delay: 0.3 },
          },
          {
            id: 'channel-activity',
            content: <ChannelActivityCard timeRange={timeRange} />,
            animation: { delay: 0.4 },
          },
          {
            id: 'agent-status',
            content: <AgentStatusCard timeRange={timeRange} />,
            animation: { delay: 0.5 },
          },
        ],
      },
    ],
  };

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle={t('page.subtitle')}
        actions={<TimeRangeFilter value={timeRange} onChange={setTimeRange} />}
      />

      <PageContent>
        <div className="max-w-7xl mx-auto pt-6">
          <CardGridLayout {...cardGridConfig} />
        </div>
      </PageContent>
    </PageShell>
  );
}
