export interface AgentRuntimeConfig {
  model: {
    provider: string;
    model_name: string;
    temperature: number;
    max_tokens: number;
  };
  api?: {
    base_url?: string;
    timeout_seconds?: number;
  };
  context?: {
    max_context_window?: number;
    compression_threshold?: number;
  };
  retry?: {
    max_retries?: number;
    backoff_strategy?: string;
  };
}

export interface PersonaConfig {
  name: string;
  title?: string;
  description?: string;
  avatar?: string;
  language_style?: {
    formality?: string;
    verbosity?: string;
    preferred_language?: string;
  };
  behavior?: {
    proactive?: boolean;
    ask_before_action?: boolean;
  };
}

export interface SkillsConfig {
  skill_ids: string[];
}

export interface ToolsConfig {
  tool_ids: string[];
}

export interface TriggersConfig {
  on_mention?: boolean;
  on_direct_message?: boolean;
  on_schedule?: string;
  custom_rules?: string[];
}

export interface AgentFilePaths {
  root: string;
  agent_md: string;
  runtime_yaml: string;
  persona_yaml: string;
  permissions_yaml: string | null;
  memory_index: string;
  config_dir: string;
  workspace_dir: string;
  assets_dir: string;
}

export interface IAgentConfigStore {
  getRuntime(agentId: string): Promise<AgentRuntimeConfig>;
  updateRuntime(agentId: string, partial: Record<string, unknown>): Promise<AgentRuntimeConfig>;

  getPersona(agentId: string): Promise<PersonaConfig>;
  updatePersona(agentId: string, partial: Record<string, unknown>): Promise<PersonaConfig>;

  getSkills(agentId: string): Promise<SkillsConfig | null>;
  updateSkills(agentId: string, skills: SkillsConfig): Promise<void>;

  getTools(agentId: string): Promise<ToolsConfig | null>;
  updateTools(agentId: string, tools: ToolsConfig): Promise<void>;

  getTriggers(agentId: string): Promise<TriggersConfig | null>;
  updateTriggers(agentId: string, triggers: TriggersConfig): Promise<void>;

  getFilePaths(agentId: string): Promise<AgentFilePaths>;
}
