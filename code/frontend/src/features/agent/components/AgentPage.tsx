import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Plus, Layers } from 'lucide-react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { EmptyState } from '@/shared/components/layout/EmptyState';
import { useAgents, useDeleteAgent } from '../hooks/useAgents';
import { AgentCard } from './AgentCard';
import type { Agent, AgentScope } from '../types/agent.types';

type ScopeFilter = AgentScope | 'all';

const scopeFilterItems: { key: ScopeFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'user', label: 'User', icon: '👤' },
  { key: 'project', label: 'Project', icon: '📁' },
  { key: 'builtin', label: 'Built-in', icon: '⚙️' },
  { key: 'plugin', label: 'Plugin', icon: '🔌' },
];

export default function AgentPage() {
  const { t } = useTranslation('agent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<ScopeFilter>('all');
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const navigate = useNavigate();
  const { data: agents, isLoading, error } = useAgents();
  const deleteAgent = useDeleteAgent();

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    let result = agents;

    if (selectedScope !== 'all') {
      result = result.filter(a => a.scope === selectedScope);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(query) || a.description.toLowerCase().includes(query),
      );
    }

    return result;
  }, [agents, selectedScope, searchQuery]);

  const scopeCounts = useMemo(() => {
    if (!agents) return {} as Record<ScopeFilter, number>;
    const counts: Record<string, number> = { all: agents.length };
    for (const agent of agents) {
      counts[agent.scope] = (counts[agent.scope] ?? 0) + 1;
    }
    return counts as Record<ScopeFilter, number>;
  }, [agents]);

  function handleDelete() {
    if (!agentToDelete) return;
    deleteAgent.mutate(agentToDelete.agent_id);
    setAgentToDelete(null);
  }

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message={t('common:error.loadFailed', { message: error.message })} />;

  return (
    <PageShell>
      <PageHeader
        title="Agents"
        subtitle={t('page.subtitle', { count: agents?.length ?? 0 })}
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw size={14} />
              Sync
            </Button>
            <Button size="sm">
              <Plus size={14} />
              New
            </Button>
          </>
        }
      />

      <PageContent>
        {/* Category Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
          {scopeFilterItems.map(item => (
            <GlassCard
              key={item.key}
              onClick={() => setSelectedScope(item.key)}
              className={`p-3 text-center transition-all ${
                selectedScope === item.key
                  ? 'ring-1 ring-primary/50 border-primary/30'
                  : ''
              }`}
            >
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-lg font-bold mt-0.5">{scopeCounts[item.key] ?? 0}</div>
            </GlassCard>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('page.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Agent Cards Grid */}
        {filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.agent_id}
                agent={agent}
                onConfigure={(a) => navigate(`/agents/${a.agent_id}/edit`)}
                onDelete={setAgentToDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Layers}
            title={t('page.emptyTitle')}
            description={searchQuery ? t('page.emptySearchDescription') : t('page.emptyDescription')}
          />
        )}
      </PageContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={!!agentToDelete} onOpenChange={open => { if (!open) setAgentToDelete(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-popover border border-border rounded-2xl p-6 shadow-2xl z-50">
            <AlertDialog.Title className="text-lg font-bold mb-2">
              {t('common:confirm.title')}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete agent <span className="text-foreground font-medium">{agentToDelete?.name}</span>? This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">{t('common:actions.cancel')}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" onClick={handleDelete}>{t('common:actions.delete')}</Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </PageShell>
  );
}
