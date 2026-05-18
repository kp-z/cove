/**
 * Agent Type Definitions
 *
 * These types align with the backend tRPC schema and domain models.
 */

import type { Agent as AgentFromAPI } from '@/lib/trpc-types';

// Re-export the API type
export type Agent = AgentFromAPI;

// Agent Framework
export type AgentFramework = 'claude_code' | 'openclaw' | 'hybrid';

// Agent Category
export type AgentCategory =
  | 'engineering'
  | 'operations'
  | 'design'
  | 'qa'
  | 'research'
  | 'platform'
  | 'collaboration'
  | 'custom';

// Agent Priority
export type AgentPriority = 'high' | 'normal' | 'low';

// Agent Scope
export type AgentScope = 'built-in' | 'user' | 'project' | 'admin';

// Agent Permission Mode
export type AgentPermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'plan'
  | 'bypassPermissions';

// Agent Status
export type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';

// Agent Memory Type
export type AgentMemory = 'user' | 'project' | 'local' | null;

// Agent Create Input (for form)
export interface AgentCreateInput {
  name: string;
  displayName?: string;
  description?: string;
  scope?: AgentScope;
  projectIds?: string[];
  capabilities?: string[];
  tags?: string[];

  // Runtime config
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;

  // Persona
  personaName?: string;
  role?: string;
  tone?: string;
  instructions?: string;

  // Skills & Tools
  skillIds?: string[];
  toolIds?: string[];

  // Triggers
  onMention?: boolean;
  onDirectMessage?: boolean;
  onSchedule?: string;
  customRules?: string[];
}

// Agent Update Input (for form)
export interface AgentUpdateInput {
  // Basic info
  displayName?: string;
  description?: string;
  scope?: AgentScope;
  projectIds?: string[];
  capabilities?: string[];
  tags?: string[];

  // Runtime config
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;

  // Persona
  personaName?: string;
  role?: string;
  tone?: string;
  instructions?: string;

  // Skills & Tools
  skillIds?: string[];
  toolIds?: string[];

  // Triggers
  onMention?: boolean;
  onDirectMessage?: boolean;
  onSchedule?: string;
  customRules?: string[];
}

// Form data type (used in AgentEditForm)
export interface AgentFormData {
  name: string;
  description: string;
  category: AgentCategory;
  priority: AgentPriority;
  model: string;
  framework: AgentFramework;
  scope: AgentScope;
  tools: string[];
  skills: string[];
  permission_mode: AgentPermissionMode;
  memory: AgentMemory;
}
