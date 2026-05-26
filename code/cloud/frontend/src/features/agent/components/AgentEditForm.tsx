import { useState, useMemo } from 'react';
import { Save, Check, Settings, Code } from 'lucide-react';
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
import { cn } from '@/shared/utils/cn';
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
                      label: 'Explore',
                      value: 'files',
                      icon: <Code size={16} />,
                    },
                  ]}
                  value={activeTab}
                  onChange={(value) => setActiveTab(value as TabType)}
                />
              </div>
            )}
            <button
              onClick={onSave}
              disabled={!canSave}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                'flex items-center gap-2',
                canSave
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-white/[0.04] text-gray-500 cursor-not-allowed border border-white/[0.08]'
              )}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        }
      />

      <PageContent>
        {activeTab === 'config' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* Persona Configuration - Most Important */}
              <AgentPersonaSection
                value={formState.persona}
                onChange={formState.actions.updatePersona}
                agentId={agent?.agent_id}
                agentName={agent?.name}
              />

              {/* Runtime Configuration - Frequently Used */}
              <AgentRuntimeSection
                value={formState.runtimeConfig}
                onChange={formState.actions.updateRuntimeConfig}
              />

              {/* Capabilities & Tags */}
              <AgentCapabilitiesSection
                value={formState.capabilities}
                onChange={formState.actions.updateCapabilities}
              />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              {/* Basic Information */}
              <AgentBasicInfoSection
                value={formState.basicInfo}
                onChange={formState.actions.updateBasicInfo}
                agentId={agent?.agent_id}
                agentName={agent?.name}
                agent={agent}
              />

              {/* Skills & Tools */}
              <AgentSkillsToolsSection
                value={formState.skills}
                onChange={formState.actions.updateSkills}
              />

              {/* Project Association */}
              <AgentProjectSection
                value={formState.projectInfo}
                onChange={formState.actions.updateProjectInfo}
              />

              {/* Triggers */}
              <AgentTriggersSection
                value={formState.triggers}
                onChange={formState.actions.updateTriggers}
              />
            </div>
          </div>
        ) : (
          <>
            {!isCreateMode && agent && agentFilesPath ? (
              <FileEditorWorkspace
                adapter={fileSystemAdapter}
                rootPath={agentFilesPath}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Save the agent first to access files</p>
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageShell>
  );
}
