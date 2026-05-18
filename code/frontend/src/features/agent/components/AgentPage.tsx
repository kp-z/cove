import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Plus, Layers, Settings, User, FolderOpen, Shield } from 'lucide-react';
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
import { useAgents, useDeleteAgent } from '@/lib/trpc/hooks/agent.hooks';
import { AgentCard } from './AgentCard';
import type { Agent } from '@/lib/trpc-types';

type ScopeFilter = 'built-in' | 'user' | 'project' | 'admin';

export default function AgentPage() {
  const { t } = useTranslation('agent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<ScopeFilter>('built-in');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const navigate = useNavigate();
  const { data: agents, isLoading, error } = useAgents();
  const deleteAgent = useDeleteAgent();

  const scopeFilterItems: { key: ScopeFilter; label: string; icon: JSX.Element }[] = [
    { key: 'built-in', label: t('scope.builtIn'), icon: <Settings size={20} /> },
    { key: 'user', label: t('scope.user'), icon: <User size={20} /> },
    { key: 'project', label: t('scope.project'), icon: <FolderOpen size={20} /> },
    { key: 'admin', label: t('scope.admin'), icon: <Shield size={20} /> },
  ];

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    let result = agents.filter(a => a.scope === selectedScope);

    if (selectedTag !== 'all') {
      result = result.filter(a => a.tags?.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(query) || (a.description && a.description.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [agents, selectedScope, selectedTag, searchQuery]);

  const scopeCounts = useMemo(() => {
    if (!agents) return {} as Record<ScopeFilter, number>;
    const counts: Record<string, number> = {};
    for (const agent of agents) {
      const scope = agent.scope as ScopeFilter;
      counts[scope] = (counts[scope] ?? 0) + 1;
    }
    return counts as Record<ScopeFilter, number>;
  }, [agents]);

  const availableTags = useMemo(() => {
    if (!agents) return [];
    const scopeAgents = agents.filter(a => a.scope === selectedScope);

    const tagSet = new Set<string>();
    scopeAgents.forEach(agent => {
      agent.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [agents, selectedScope]);

  const tagCounts = useMemo(() => {
    if (!agents) return {} as Record<string, number>;
    const scopeAgents = agents.filter(a => a.scope === selectedScope);

    const counts: Record<string, number> = { all: scopeAgents.length };
    scopeAgents.forEach(agent => {
      agent.tags?.forEach(tag => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });
    return counts;
  }, [agents, selectedScope]);

  function handleScopeChange(scope: ScopeFilter) {
    setSelectedScope(scope);
    setSelectedTag('all');
  }

  function handleDelete() {
    if (!agentToDelete) return;
    deleteAgent.mutate({ agentId: agentToDelete.agent_id });
    setAgentToDelete(null);
  }

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message={t('common:error.loadFailed', { message: error.message })} />;

  return (
    <PageShell>
      <PageHeader
        title={t('page.title')}
        subtitle={t('page.subtitle', { count: agents?.length ?? 0 })}
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw size={14} />
              {t('actions.sync')}
            </Button>
            <Button size="sm" onClick={() => navigate('/agents/new')}>
              <Plus size={14} />
              {t('actions.new')}
            </Button>
          </>
        }
      />

      <PageContent>
        {/* Scope Filters (First Layer) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {scopeFilterItems.map(item => (
            <GlassCard
              key={item.key}
              onClick={() => handleScopeChange(item.key)}
              className={`p-3 text-center transition-all cursor-pointer ${
                selectedScope === item.key
                  ? 'ring-1 ring-primary/50 border-primary/30'
                  : ''
              }`}
            >
              <div className="flex justify-center mb-2 text-muted-foreground">
                {item.icon}
              </div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-lg font-bold mt-0.5">{scopeCounts[item.key] ?? 0}</div>
            </GlassCard>
          ))}
        </div>

        {/* Tag Filters (Second Layer) */}
        {availableTags.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-muted-foreground mb-2 px-1">{t('filter.byTag')}</div>
            <div className="flex flex-wrap gap-2">
              <GlassCard
                onClick={() => setSelectedTag('all')}
                className={`px-3 py-2 text-center transition-all cursor-pointer ${
                  selectedTag === 'all'
                    ? 'ring-1 ring-primary/50 border-primary/30'
                    : ''
                }`}
              >
                <div className="text-xs font-medium">{t('filter.allTags')}</div>
                <div className="text-sm font-bold mt-0.5">{tagCounts.all ?? 0}</div>
              </GlassCard>
              {availableTags.map(tag => (
                <GlassCard
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-2 text-center transition-all cursor-pointer ${
                    selectedTag === tag
                      ? 'ring-1 ring-primary/50 border-primary/30'
                      : ''
                  }`}
                >
                  <div className="text-xs font-medium">{tag}</div>
                  <div className="text-sm font-bold mt-0.5">{tagCounts[tag] ?? 0}</div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

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
