import { channelFixtures, messageFixtures, agentFixtures } from '../fixtures';
import { fullAgentFixtures } from '../fixtures/agent.fixtures';
import type { MessageEntity, ChannelEntity, AgentEntity } from '@/features/channel/api/client';
import type { Agent } from '@/features/agent/types/agent.types';

interface DatabaseState {
  messages: Map<string, MessageEntity>;
  channels: Map<string, ChannelEntity>;
  channelAgents: Map<string, AgentEntity>;
  agents: Map<string, Agent>;
}

class Database {
  private state: DatabaseState;
  private initialState: DatabaseState;

  constructor() {
    this.state = this.createInitialState();
    this.initialState = this.cloneState(this.state);
  }

  private createInitialState(): DatabaseState {
    return {
      messages: new Map(
        messageFixtures.map(msg => [msg.message_id, msg])
      ),
      channels: new Map(
        channelFixtures.map(ch => [ch.channel_id, ch])
      ),
      channelAgents: new Map(
        agentFixtures.map(agent => [agent.agent_id, agent])
      ),
      agents: new Map(
        fullAgentFixtures.map(agent => [agent.agent_id, agent])
      ),
    };
  }

  private cloneState(state: DatabaseState): DatabaseState {
    return {
      messages: new Map(
        Array.from(state.messages.entries()).map(([k, v]) => [k, { ...v }])
      ),
      channels: new Map(
        Array.from(state.channels.entries()).map(([k, v]) => [k, { ...v }])
      ),
      channelAgents: new Map(
        Array.from(state.channelAgents.entries()).map(([k, v]) => [k, { ...v }])
      ),
      agents: new Map(
        Array.from(state.agents.entries()).map(([k, v]) => [k, { ...v }])
      ),
    };
  }

  reset(): void {
    this.state = this.cloneState(this.initialState);
  }

  clear(): void {
    this.state.messages.clear();
    this.state.channels.clear();
    this.state.channelAgents.clear();
    this.state.agents.clear();
  }

  // ── Messages ──

  getMessage(id: string): MessageEntity | undefined {
    return this.state.messages.get(id);
  }

  getMessages(channelId: string, options?: { limit?: number; offset?: number }): {
    messages: MessageEntity[];
    total: number;
  } {
    const allMessages = Array.from(this.state.messages.values())
      .filter(msg => msg.channel_id === channelId && !msg.deleted_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return {
      messages: allMessages.slice(offset, offset + limit),
      total: allMessages.length,
    };
  }

  createMessage(message: MessageEntity): MessageEntity {
    this.state.messages.set(message.message_id, message);
    return message;
  }

  updateMessage(id: string, updates: Partial<MessageEntity>): MessageEntity | undefined {
    const message = this.state.messages.get(id);
    if (!message) return undefined;

    const updated = {
      ...message,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.state.messages.set(id, updated);
    return updated;
  }

  deleteMessage(id: string, deletedBy: string): boolean {
    const message = this.state.messages.get(id);
    if (!message) return false;

    message.deleted_at = new Date().toISOString();
    message.deleted_by = deletedBy;
    return true;
  }

  // ── Channels ──

  getChannel(id: string): ChannelEntity | undefined {
    return this.state.channels.get(id);
  }

  getChannels(): ChannelEntity[] {
    return Array.from(this.state.channels.values());
  }

  // ── Channel Agents (backward-compatible for channel handlers) ──

  getAgent(id: string): AgentEntity | undefined {
    return this.state.channelAgents.get(id);
  }

  getAgentsByIds(ids: string[]): AgentEntity[] {
    return ids
      .map(id => this.state.channelAgents.get(id))
      .filter((agent): agent is AgentEntity => agent !== undefined);
  }

  // ── Full Agents (agent management feature) ──

  getFullAgent(id: string): Agent | undefined {
    return this.state.agents.get(id);
  }

  getAgents(filters?: { scope?: string; search?: string }): {
    agents: Agent[];
    total: number;
  } {
    let agents = Array.from(this.state.agents.values());

    if (filters?.scope) {
      agents = agents.filter(a => a.scope === filters.scope);
    }

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      agents = agents.filter(
        a => a.name.toLowerCase().includes(query) || a.description.toLowerCase().includes(query),
      );
    }

    agents.sort((a, b) => a.name.localeCompare(b.name));

    return { agents, total: agents.length };
  }

  deleteAgent(id: string): boolean {
    return this.state.agents.delete(id);
  }

  createAgent(data: Partial<Agent>): Agent {
    const newAgent: Agent = {
      agent_id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name || 'New Agent',
      description: data.description || '',
      model: data.model || 'claude-3-sonnet',
      framework: data.framework || 'claude_code',
      category: data.category || 'custom',
      priority: data.priority || 'normal',
      status: data.status || 'idle',
      scope: data.scope || 'user',
      tools: data.tools || [],
      permission_mode: data.permission_mode || 'default',
      is_active: data.is_active ?? true,
      call_count: data.call_count || 0,
      health_score: data.health_score || 50,
      skills: data.skills || [],
      memory: data.memory || null,
      created_by: data.created_by || 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.agents.set(newAgent.agent_id, newAgent);
    return newAgent;
  }

  updateAgent(id: string, updates: Partial<Agent>): Agent | undefined {
    const agent = this.state.agents.get(id);
    if (!agent) return undefined;
    const updated = { ...agent, ...updates, updated_at: new Date().toISOString() };
    this.state.agents.set(id, updated);
    return updated;
  }
}

export const db = new Database();
