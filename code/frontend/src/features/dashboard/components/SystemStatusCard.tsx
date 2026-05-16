import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';

type SystemStatus = 'healthy' | 'degraded' | 'down';

interface SystemComponent {
  name: string;
  status: SystemStatus;
  uptime?: number;
  lastCheck?: string;
  message?: string;
}

// Mock 数据 - 后续替换为 API 调用
const mockComponents: SystemComponent[] = [
  { name: 'API Service', status: 'healthy', uptime: 86400 },
  { name: 'Claude Code CLI', status: 'healthy', uptime: 43200 },
  { name: 'OpenClaw', status: 'healthy', uptime: 21600 },
  { name: 'Database', status: 'healthy', uptime: 172800 },
];

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function getStatusColor(status: SystemStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-400';
    case 'degraded':
      return 'bg-yellow-400';
    case 'down':
      return 'bg-red-500';
  }
}

function getOverallStatus(components: SystemComponent[]): SystemStatus {
  if (components.some((c) => c.status === 'down')) return 'down';
  if (components.some((c) => c.status === 'degraded')) return 'degraded';
  return 'healthy';
}

function getOverallStatusText(status: SystemStatus): string {
  switch (status) {
    case 'healthy':
      return 'All Systems Operational';
    case 'degraded':
      return 'Partial System Outage';
    case 'down':
      return 'System Outage';
  }
}

export function SystemStatusCard() {
  const { t } = useTranslation('dashboard');
  const components = mockComponents;
  const overallStatus = getOverallStatus(components);

  return (
    <GlassCard>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{t('systemStatus.title')}</h2>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', getStatusColor(overallStatus))} />
            <span className="text-sm text-gray-400">{getOverallStatusText(overallStatus)}</span>
          </div>
        </div>

        <div className="space-y-3">
          {components.map((component) => (
            <div
              key={component.name}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full', getStatusColor(component.status))} />
                <span className="font-medium">{component.name}</span>
              </div>
              <div className="text-sm text-gray-400">
                {component.uptime ? `Uptime: ${formatUptime(component.uptime)}` : 'N/A'}
              </div>
            </div>
          ))}
        </div>

        {/* 空状态提示 */}
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-400">
            💡 {t('systemStatus.apiNote')}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
