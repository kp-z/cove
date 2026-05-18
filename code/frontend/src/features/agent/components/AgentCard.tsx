import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MoreVertical, Play, Settings2, Zap, Trash2,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { getAgentAvatarUrl, getAgentInitials } from '../utils/avatar';
import type { Agent } from '@/lib/trpc-types';

type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';
type AgentCategory = 'engineering' | 'operations' | 'design' | 'qa' | 'research' | 'platform' | 'collaboration' | 'custom';

interface AgentCardProps {
  agent: Agent;
  onRun?: (agent: Agent) => void;
  onConfigure?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
}

const categoryColors: Record<AgentCategory, string> = {
  engineering: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  operations: 'text-green-400 bg-green-500/20 border-green-500/30',
  design: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  qa: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  research: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
  platform: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  collaboration: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  custom: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
};

export function AgentCard({ agent, onRun, onConfigure, onDelete }: AgentCardProps) {
  const { t } = useTranslation('agent');
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = getAgentAvatarUrl(agent.agent_id, agent.name);
  const initials = getAgentInitials(agent.name);

  const categoryLabels: Record<AgentCategory, string> = {
    engineering: t('category.engineering'),
    operations: t('category.operations'),
    design: t('category.design'),
    qa: t('category.qa'),
    research: t('category.research'),
    platform: t('category.platform'),
    collaboration: t('category.collaboration'),
    custom: t('category.custom'),
  };

  const statusConfig: Record<AgentStatus, { dotColor: string; textColor: string; label: string }> = {
    idle: { dotColor: 'bg-gray-400', textColor: 'text-gray-400', label: t('status.idle') },
    active: { dotColor: 'bg-green-400', textColor: 'text-green-400', label: t('status.active') },
    disabled: { dotColor: 'bg-yellow-400', textColor: 'text-yellow-400', label: t('status.disabled') },
    error: { dotColor: 'bg-red-500', textColor: 'text-red-500', label: t('status.error') },
  };

  const status = statusConfig[agent.status as AgentStatus] || statusConfig.idle;

  return (
    <GlassCard className="flex flex-col h-full p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {avatarError ? (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center text-sm font-bold text-white/80 shrink-0">
            {initials}
          </div>
        ) : (
          <img
            src={avatarUrl}
            alt={agent.name}
            className="w-11 h-11 rounded-full border-2 border-white/20 bg-white/5 shrink-0"
            onError={() => setAvatarError(true)}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold truncate">{agent.display_name || agent.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${categoryColors[agent.category as AgentCategory]}`}>
              {categoryLabels[agent.category as AgentCategory]}
            </span>
          </div>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
              <MoreVertical size={16} className="text-gray-400" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[140px] bg-[#1a1d2e] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50"
              sideOffset={5}
              align="end"
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg cursor-pointer hover:bg-red-500/10 outline-none"
                onSelect={() => onDelete?.(agent)}
              >
                <Trash2 size={14} />
                {t('card.delete')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 line-clamp-2 mb-4 min-h-[40px]">
        {agent.description}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 bg-white/5 rounded-xl text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">{t('card.status')}</div>
          <div className={`flex items-center justify-center gap-1 ${status.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            <span className="text-xs font-medium">{status.label}</span>
          </div>
        </div>
        <div className="p-2 bg-white/5 rounded-xl text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">{t('card.category')}</div>
          <div className="text-xs font-semibold text-gray-400">
            {categoryLabels[agent.category as AgentCategory]}
          </div>
        </div>
      </div>

      {/* Capabilities & Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {agent.capabilities && agent.capabilities.length > 0 ? (
          <>
            {agent.capabilities.slice(0, 3).map((cap: string) => (
              <span key={cap} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                {cap}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500">
            {t('card.empty.noCapabilities')}
          </span>
        )}
        {agent.tags && agent.tags.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center gap-1">
            <Zap size={10} />
            {agent.tags.length}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={() => onRun?.(agent)}
          disabled={agent.status === 'error'}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play size={14} />
          {t('actions.run')}
        </button>
        <button
          onClick={() => onConfigure?.(agent)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          <Settings2 size={14} />
          {t('actions.config')}
        </button>
      </div>
    </GlassCard>
  );
}
