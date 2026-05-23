import { useState } from 'react';
import { useCreateAgent, useUpdateAgent } from '@/lib/trpc/hooks/agent.hooks';
import type { Agent } from '../types/agent.types';
import type { AgentFormData } from '../types/agent-form.types';

interface UseAgentFormSubmitOptions {
  agent?: Agent;
  onSuccess?: () => void;
}

export function useAgentFormSubmit({ agent, onSuccess }: UseAgentFormSubmitOptions) {
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (formData: AgentFormData) => {
    const isCreateMode = !agent;

    if (isCreateMode) {
      createAgent.mutate(
        {
          name: formData.basicInfo.displayName.toLowerCase().replace(/\s+/g, '-'),
          displayName: formData.basicInfo.displayName,
          description: formData.basicInfo.description,
          scope: formData.basicInfo.scope,
          projectIds: formData.projectInfo.projectIds,
          capabilities: formData.capabilities.capabilities,
          tags: formData.capabilities.tags,
          runtimeConfig: {
            adapter_id: formData.runtimeConfig.adapter_id,
            overrides: formData.runtimeConfig.overrides,
          },
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => {
              onSuccess?.();
            }, 600);
          },
        }
      );
    } else {
      updateAgent.mutate(
        {
          agentId: agent.agent_id,
          data: {
            displayName: formData.basicInfo.displayName,
            description: formData.basicInfo.description,
            scope: formData.basicInfo.scope,
            projectIds: formData.projectInfo.projectIds,
            capabilities: formData.capabilities.capabilities,
            tags: formData.capabilities.tags,
            runtimeConfig: {
              adapter_id: formData.runtimeConfig.adapter_id,
              overrides: formData.runtimeConfig.overrides,
            },
            systemPrompt: formData.runtimeConfig.systemPrompt || undefined,
            personaName: formData.persona.name || undefined,
            role: formData.persona.role || undefined,
            tone: formData.persona.tone || undefined,
            instructions: formData.persona.instructions || undefined,
            skillIds: formData.skills.skillIds,
            toolIds: formData.skills.toolIds,
            onMention: formData.triggers.onMention,
            onDirectMessage: formData.triggers.onDirectMessage,
            onSchedule: formData.triggers.onSchedule || undefined,
            customRules: formData.triggers.customRules,
          },
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => {
              onSuccess?.();
            }, 600);
          },
        }
      );
    }
  };

  return {
    handleSubmit,
    isPending: createAgent.isPending || updateAgent.isPending,
    saved,
  };
}
