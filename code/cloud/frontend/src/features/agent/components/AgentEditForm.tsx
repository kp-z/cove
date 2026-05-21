import { useState, useMemo } from 'react';
import { Save, Check, Settings, Code } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ButtonGroup } from '@/shared/components/ui/ButtonGroup';
import { Badge } from '@/shared/components/ui/badge';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { InfoField } from '@/shared/components/display';
import { useRealm } from '@/lib/trpc/hooks/realm.hooks';
import { trpcVanillaClient } from '@/lib/trpc/client';
import { FileEditorWorkspace } from '@/features/file-editor';
import { FileSystemClient } from '@/features/file-editor/clients/FileSystemClient';
import { useAgentFormState, useAgentFormSubmit } from '../hooks';
import {
  AgentBasicInfoSection,
  AgentProjectSection,
  AgentCapabilitiesSection,
  AgentRuntimeSection,
  AgentPersonaSection,
  AgentSkillsToolsSection,
  AgentTriggersSection,
} from './sections';
import type { Agent } from '../types/agent.types';

type TabType = 'config' | 'files';

interface AgentEditFormProps {
  agent?: Agent;
  onSaved: () => void;
}

export function AgentEditForm({ agent, onSaved }: AgentEditFormProps) {
  const isCreateMode = !agent;
  const [activeTab, setActiveTab] = useState<TabType>('config');

  // Fetch realm settings to get default adapter
  const { data: realm } = useRealm('default-server', { enabled: isCreateMode });
  const defaultAdapterId = realm?.settings?.default_adapter_id;

  // File system client for file editor
  const fileSystemAdapter = useMemo(() => new FileSystemClient(trpcVanillaClient), []);
  const agentFilesPath = agent?.repository_path || (agent ? `agents/${agent.agent_id}` : '');

  // Form state management
  const formState = useAgentFormState(agent, defaultAdapterId);
  const { handleSubmit, isPending, saved } = useAgentFormSubmit({
    agent,
    onSuccess: onSaved,
  });

  const onSave = () => {
    handleSubmit({
      basicInfo: formState.basicInfo,
      projectInfo: formState.projectInfo,
      capabilities: formState.capabilities,
      runtimeConfig: formState.runtimeConfig,
      persona: formState.persona,
      skills: formState.skills,
      triggers: formState.triggers,
    });
  };

  const canSave = formState.basicInfo.displayName.trim() && !isPending && !saved;

  return (
    <PageShell>
      <PageHeader
        title={isCreateMode ? 'Create Agent' : (agent?.display_name || agent?.name || 'Edit Agent')}
        subtitle={isCreateMode ? 'Create a new AI agent' : `Agent ID: ${agent?.agent_id}`}
        actions={
          <div className="flex items-center gap-3">
            {!isCreateMode && (
              <div className="mr-4">
                <ButtonGroup
                  options={[
                    {
                      label: 'Configuration',
                      value: 'config',
                      icon: <Settings size={16} />,
                    },
                    {
                      label: 'Editor',
                      value: 'files',
                      icon: <Code size={16} />,
                    },
                  ]}
                  value={activeTab}
                  onChange={(value) => setActiveTab(value as TabType)}
                />
              </div>
            )}
            <Button onClick={onSave} disabled={!canSave}>
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        }
      />

      <PageContent>
        {activeTab === 'config' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1400px] mx-auto">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* System Information (Edit Mode Only) */}
              {!isCreateMode && agent && (
                <SectionCard title="System Information" icon={<Settings size={20} />}>
                  <div className="space-y-3">
                    <InfoField label="Agent ID" value={agent.agent_id} mono />
                    <InfoField label="Name" value={agent.name} mono />
                    <div>
                      <label className="text-xs text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                    <InfoField label="Created By" value={agent.created_by} />
                    <InfoField label="Created At" value={new Date(agent.created_at).toLocaleString()} />
                  </div>
                </SectionCard>
              )}

              <AgentBasicInfoSection
                value={formState.basicInfo}
                onChange={formState.actions.updateBasicInfo}
              />

              <AgentProjectSection
                value={formState.projectInfo}
                onChange={formState.actions.updateProjectInfo}
              />

              <AgentCapabilitiesSection
                value={formState.capabilities}
                onChange={formState.actions.updateCapabilities}
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              <AgentRuntimeSection
                value={formState.runtimeConfig}
                onChange={formState.actions.updateRuntimeConfig}
              />

              <AgentPersonaSection
                value={formState.persona}
                onChange={formState.actions.updatePersona}
              />

              <AgentSkillsToolsSection
                value={formState.skills}
                onChange={formState.actions.updateSkills}
              />

              <AgentTriggersSection
                value={formState.triggers}
                onChange={formState.actions.updateTriggers}
              />
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            {!isCreateMode && agent && agentFilesPath ? (
              <FileEditorWorkspace
                adapter={fileSystemAdapter}
                rootPath={agentFilesPath}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Save the agent first to access files</p>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </PageShell>
  );
}
