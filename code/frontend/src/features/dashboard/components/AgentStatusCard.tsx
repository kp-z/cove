import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { EChartWrapper } from '@/shared/components/charts/EChartWrapper';
import { chartColors } from '@/shared/lib/echarts-theme';
import type { EChartsOption } from 'echarts';
import { useNavigate } from 'react-router';
import { cn } from '@/shared/lib/utils';
import type { TimeRange } from './TimeRangeFilter';

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

// Mock 数据 - 后续替换为 API 调用
const mockStatusData: AgentStatusDistribution[] = [
  { status: 'active', count: 5 },
  { status: 'idle', count: 12 },
  { status: 'disabled', count: 2 },
  { status: 'error', count: 1 },
];

const mockRunningAgents: RunningAgent[] = [
  { id: '1', name: 'Code Assistant', status: 'active', category: 'engineering', uptime: 3600 },
  { id: '2', name: 'QA Bot', status: 'active', category: 'qa', uptime: 1800 },
  { id: '3', name: 'Design Helper', status: 'active', category: 'design', uptime: 7200 },
];

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

interface AgentStatusCardProps {
  timeRange: TimeRange;
}

export function AgentStatusCard({ timeRange }: AgentStatusCardProps) {
  const navigate = useNavigate();
  const statusData = mockStatusData;
  const runningAgents = mockRunningAgents;

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
        <h2 className="text-xl font-semibold mb-6">Agent 监控</h2>

        {/* 状态分布饼图 */}
        <div className="mb-6">
          <EChartWrapper option={option} height={200} />
        </div>

        {/* 运行中的 Agent 列表 */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">运行中的 Agent</h3>
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
                  <span className="text-xs text-gray-400">{formatUptime(agent.uptime)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 空状态提示 */}
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 数据将通过 API 提供（GET /api/stats/agent-status?timeRange={timeRange}）
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
