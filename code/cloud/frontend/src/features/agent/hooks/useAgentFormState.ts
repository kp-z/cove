import { useState, useCallback } from 'react';
import type { Agent } from '../types/agent.types';
import type {
  AgentBasicInfo,
  AgentProjectInfo,
  AgentCapabilitiesInfo,
  AgentRuntimeConfigInfo,
  AgentPersonaInfo,
  AgentSkillsInfo,
  AgentTriggersInfo,
  AgentFormActions,
} from '../types/agent-form.types';

interface UseAgentFormStateReturn {
  basicInfo: AgentBasicInfo;
  projectInfo: AgentProjectInfo;
  capabilities: AgentCapabilitiesInfo;
  runtimeConfig: AgentRuntimeConfigInfo;
  persona: AgentPersonaInfo;
  skills: AgentSkillsInfo;
  triggers: AgentTriggersInfo;
  actions: AgentFormActions;
}

export function useAgentFormState(
  agent?: Agent,
  defaultAdapterId?: string
): UseAgentFormStateReturn {
  // Basic Info
  const [basicInfo, setBasicInfo] = useState<AgentBasicInfo>({
    displayName: agent?.display_name ?? '',
    description: agent?.description ?? '',
    scope: agent?.scope ?? 'user',
  });

  // Project Info
  const [projectInfo, setProjectInfo] = useState<AgentProjectInfo>({
    projectIds: agent?.project_ids ? [...agent.project_ids] : [],
  });

  // Capabilities
  const [capabilities, setCapabilities] = useState<AgentCapabilitiesInfo>({
    capabilities: agent?.capabilities ? [...agent.capabilities] : [],
    tags: agent?.tags ? [...agent.tags] : [],
  });

  // Runtime Config
  const [runtimeConfig, setRuntimeConfig] = useState<AgentRuntimeConfigInfo>({
    adapter_id: agent?.runtime_config?.adapter_id ?? defaultAdapterId,
    overrides: agent?.runtime_config?.overrides,
    systemPrompt: agent?.runtime_config?.systemPrompt ?? '',
  });

  // Persona
  const [persona, setPersona] = useState<AgentPersonaInfo>({
    name: agent?.persona?.name ?? '',
    role: agent?.persona?.role ?? '',
    tone: agent?.persona?.tone ?? '',
    instructions: agent?.persona?.instructions ?? '',
  });

  // Skills
  const [skills, setSkills] = useState<AgentSkillsInfo>({
    skillIds: agent?.skills?.skillIds ? [...agent.skills.skillIds] : [],
    toolIds: agent?.tools?.toolIds ? [...agent.tools.toolIds] : [],
  });

  // Triggers
  const [triggers, setTriggers] = useState<AgentTriggersInfo>({
    onMention: agent?.triggers?.onMention ?? false,
    onDirectMessage: agent?.triggers?.onDirectMessage ?? false,
    onSchedule: agent?.triggers?.onSchedule ?? '',
    customRules: agent?.triggers?.customRules ? [...agent.triggers.customRules] : [],
  });

  // Actions
  const updateBasicInfo = useCallback((info: Partial<AgentBasicInfo>) => {
    setBasicInfo(prev => ({ ...prev, ...info }));
  }, []);

  const updateProjectInfo = useCallback((info: Partial<AgentProjectInfo>) => {
    setProjectInfo(prev => ({ ...prev, ...info }));
  }, []);

  const updateCapabilities = useCallback((info: Partial<AgentCapabilitiesInfo>) => {
    setCapabilities(prev => ({ ...prev, ...info }));
  }, []);

  const updateRuntimeConfig = useCallback((info: Partial<AgentRuntimeConfigInfo>) => {
    setRuntimeConfig(prev => ({ ...prev, ...info }));
  }, []);

  const updatePersona = useCallback((info: Partial<AgentPersonaInfo>) => {
    setPersona(prev => ({ ...prev, ...info }));
  }, []);

  const updateSkills = useCallback((info: Partial<AgentSkillsInfo>) => {
    setSkills(prev => ({ ...prev, ...info }));
  }, []);

  const updateTriggers = useCallback((info: Partial<AgentTriggersInfo>) => {
    setTriggers(prev => ({ ...prev, ...info }));
  }, []);

  return {
    basicInfo,
    projectInfo,
    capabilities,
    runtimeConfig,
    persona,
    skills,
    triggers,
    actions: {
      updateBasicInfo,
      updateProjectInfo,
      updateCapabilities,
      updateRuntimeConfig,
      updatePersona,
      updateSkills,
      updateTriggers,
    },
  };
}
