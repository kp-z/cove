import type { AgentScope } from './agent.types';
import type { AdapterConfig } from './adapter.types';

export interface AgentBasicInfo {
  displayName: string;
  description: string;
  scope: AgentScope;
}

export interface AgentProjectInfo {
  projectIds: string[];
}

export interface AgentCapabilitiesInfo {
  capabilities: string[];
  tags: string[];
}

export interface AgentRuntimeConfigInfo {
  adapter_id?: string;
  overrides?: Partial<AdapterConfig['config']>;
  systemPrompt?: string;
}

export interface AgentPersonaInfo {
  name: string;
  role: string;
  tone?: string;
  instructions?: string;
}

export interface AgentSkillsInfo {
  skillIds: string[];
  toolIds: string[];
}

export interface AgentTriggersInfo {
  onMention: boolean;
  onDirectMessage: boolean;
  onSchedule: string;
  customRules: string[];
}

export interface AgentFormData {
  basicInfo: AgentBasicInfo;
  projectInfo: AgentProjectInfo;
  capabilities: AgentCapabilitiesInfo;
  runtimeConfig: AgentRuntimeConfigInfo;
  persona: AgentPersonaInfo;
  skills: AgentSkillsInfo;
  triggers: AgentTriggersInfo;
}

export interface AgentFormActions {
  updateBasicInfo: (info: Partial<AgentBasicInfo>) => void;
  updateProjectInfo: (info: Partial<AgentProjectInfo>) => void;
  updateCapabilities: (info: Partial<AgentCapabilitiesInfo>) => void;
  updateRuntimeConfig: (info: Partial<AgentRuntimeConfigInfo>) => void;
  updatePersona: (info: Partial<AgentPersonaInfo>) => void;
  updateSkills: (info: Partial<AgentSkillsInfo>) => void;
  updateTriggers: (info: Partial<AgentTriggersInfo>) => void;
}
