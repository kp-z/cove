import { Users, Bot, FolderKanban, Zap } from 'lucide-react';
import type { RealmStats } from './types';

interface RealmStatsCardProps {
  stats: RealmStats;
}

export function RealmStatsCard({ stats }: RealmStatsCardProps) {
  const statItems = [
    { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-400' },
    { label: 'Agents', value: stats.agents, icon: Bot, color: 'text-purple-400' },
    { label: 'Projects', value: stats.projects, icon: FolderKanban, color: 'text-green-400' },
    { label: 'Adapters', value: stats.adapters, icon: Zap, color: 'text-yellow-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/[0.05] ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <div className="text-xs text-white/60">{item.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
