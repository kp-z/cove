import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { EChartWrapper } from '@/shared/components/charts/EChartWrapper';
import { chartColors } from '@/shared/lib/echarts-theme';
import type { EChartsOption } from 'echarts';
import { useNavigate } from 'react-router';

interface MessageActivity {
  date: string;
  count: number;
}

interface ActiveChannel {
  id: string;
  name: string;
  lastMessageAt: string;
  messageCount: number;
  threadCount: number;
}

// Mock 数据 - 后续替换为 API 调用
const mockMessageActivity: MessageActivity[] = [
  { date: '01/15', count: 120 },
  { date: '01/16', count: 150 },
  { date: '01/17', count: 98 },
  { date: '01/18', count: 175 },
  { date: '01/19', count: 132 },
  { date: '01/20', count: 188 },
  { date: '01/21', count: 165 },
];

const mockActiveChannels: ActiveChannel[] = [
  {
    id: '1',
    name: 'General',
    lastMessageAt: '2024-01-21T10:30:00Z',
    messageCount: 245,
    threadCount: 12,
  },
  {
    id: '2',
    name: 'Development',
    lastMessageAt: '2024-01-21T09:15:00Z',
    messageCount: 189,
    threadCount: 8,
  },
  {
    id: '3',
    name: 'Design',
    lastMessageAt: '2024-01-21T08:45:00Z',
    messageCount: 156,
    threadCount: 6,
  },
];

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export function ChannelActivityCard() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const messageActivity = mockMessageActivity;
  const activeChannels = mockActiveChannels;

  const option: EChartsOption = {
    xAxis: {
      type: 'category',
      data: messageActivity.map((d) => d.date),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Messages',
        type: 'bar',
        data: messageActivity.map((d) => d.count),
        itemStyle: {
          color: chartColors.primary,
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '60%',
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const item = (params as Array<{ name: string; value: number }>)[0];
        return `${item.name}<br/>Messages: ${item.value}`;
      },
    },
  };

  return (
    <GlassCard>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t('channelActivity.title')}</h2>

        {/* 消息活动柱状图 */}
        <div className="mb-6">
          <EChartWrapper option={option} height={200} />
        </div>

        {/* 活跃 Channel 列表 */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t('channelActivity.activeChannels')}</h3>
          <div className="space-y-2">
            {activeChannels.map((channel) => (
              <div
                key={channel.id}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => navigate(`/channel?channelId=${channel.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{channel.name}</div>
                    <div className="text-xs text-gray-400">
                      {channel.messageCount} {t('channelActivity.messages')} · {channel.threadCount} {t('channelActivity.threads')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatRelativeTime(channel.lastMessageAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 空状态提示 */}
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 {t('channelActivity.apiNote')}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
