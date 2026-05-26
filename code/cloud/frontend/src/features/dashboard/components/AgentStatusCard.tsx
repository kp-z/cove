import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { EChartWrapper } from '@/shared/components/charts/EChartWrapper';
import type { EChartsOption } from 'echarts';
import { useNavigate } from 'react-router';
import { cn } from '@/shared/lib/utils';
import { useAgents } from '@/lib/trpc/hooks/agent.hooks';

type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';

interface AgentStatusDistribution {
  status: AgentStatus;
  count: number;
}

interface RunningAgent {
  id: string;
  name: string;
  status: 'active' | 'idle';
  category: string;
  uptime: number;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: '#10b981',
  idle: '#9ca3af',
  disabled: '#f59e0b',
  error: '#ef4444',
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  disabled: 'Disabled',
  error: 'Error',
};

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getStatusDotColor(status: 'active' | 'idle'): string {
  return status === 'active' ? 'bg-green-400' : 'bg-gray-400';
}

export function AgentStatusCard() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { data: agentsData, isLoading } = useAgents();

  // Calculate status distribution from real data
  const statusData: AgentStatusDistribution[] = agentsData?.agents
    ? [
        { status: 'active', count: agentsData.agents.filter((a) => a.status === 'active').length },
        { status: 'idle', count: agentsData.agents.filter((a) => a.status === 'idle').length },
        { status: 'disabled', count: agentsData.agents.filter((a) => a.status === 'disabled').length },
        { status: 'error', count: agentsData.agents.filter((a) => a.status === 'error').length },
      ]
    : [];

  // Get running agents (active or idle)
  const runningAgents: RunningAgent[] = agentsData?.agents
    ? agentsData.agents
        .filter((a) => a.status === 'active' || a.status === 'idle')
        .slice(0, 5) // Show top 5
        .map((a) => ({
          id: a.agent_id,
          name: a.display_name || a.name,
          status: a.status as 'active' | 'idle',
          category: a.scope || 'general',
          uptime: 0, // TODO: Add uptime tracking in backend
        }))
    : [];

  const chartData = statusData.map((item) => ({
    name: STATUS_LABELS[item.status],
    value: item.count,
    status: item.status,
  }));

  const option: EChartsOption = {
    series: [
      {
        name: 'Agent Status',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: chartData.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: STATUS_COLORS[item.status],
          },
        })),
        label: {
          formatter: '{b}\n{d}%',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 12,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
  };

  return (
    <GlassCard>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t('agentStatus.title')}</h2>

        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* 状态分布饼图 */}
            <div className="mb-6">
              <EChartWrapper option={option} height={200} />
            </div>

            {/* 运行中的 Agent 列表 */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{t('agentStatus.runningAgents')}</h3>
              {runningAgents.length > 0 ? (
                <div className="space-y-2">
                  {runningAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => navigate(`/agents/${agent.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', getStatusDotColor(agent.status))} />
                          <span className="font-medium text-sm">{agent.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{agent.uptime > 0 ? formatUptime(agent.uptime) : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No running agents
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
