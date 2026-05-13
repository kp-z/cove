export type AgentScope = 'builtin' | 'user' | 'project' | 'plugin';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error';

export type AgentPermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

export type AgentFramework = 'claude_code' | 'openclaw' | 'hybrid';

export type AgentCategory = 'engineering' | 'operations' | 'design' | 'qa' | 'research' | 'platform' | 'collaboration' | 'custom';

export type AgentPriority = 'high' | 'normal' | 'low';

export interface Agent {
  agent_id: string;
  name: string;
  description: string;
  model: string;
  framework: AgentFramework;
  category: AgentCategory | string;
  priority: AgentPriority;
  status: AgentStatus;
  scope: AgentScope;
  tools: string[];
  permission_mode: AgentPermissionMode;
  is_active: boolean;
  call_count: number;
  health_score: number;
  skills: string[];
  memory: 'user' | 'project' | 'local' | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateAgentDto {
  name?: string;
  description?: string;
  model?: string;
  framework?: AgentFramework;
  category?: AgentCategory | string;
  priority?: AgentPriority;
  scope?: AgentScope;
  tools?: string[];
  permission_mode?: AgentPermissionMode;
  skills?: string[];
  memory?: 'user' | 'project' | 'local' | null;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
}

export interface AgentFilters {
  scope?: AgentScope;
  search?: string;
}
