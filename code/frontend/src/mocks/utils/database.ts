/**
 * MSW 内存数据库
 */

import { channelFixtures, messageFixtures, agentFixtures } from '../fixtures';
import type { MessageEntity, ChannelEntity, AgentEntity } from '@/features/channel/api/client';

interface DatabaseState {
  messages: Map<string, MessageEntity>;
  channels: Map<string, ChannelEntity>;
  agents: Map<string, AgentEntity>;
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
        messageFixtures.map(msg => [msg.id, msg])
      ),
      channels: new Map(
        channelFixtures.map(ch => [ch.id, ch])
      ),
      agents: new Map(
        agentFixtures.map(agent => [agent.id, agent])
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
    this.state.agents.clear();
  }

  getMessage(id: string): MessageEntity | undefined {
    return this.state.messages.get(id);
  }

  getMessages(channelId: string, options?: { limit?: number; offset?: number }): {
    messages: MessageEntity[];
    total: number;
  } {
    const allMessages = Array.from(this.state.messages.values())
      .filter(msg => msg.channelId === channelId && !msg.deletedAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return {
      messages: allMessages.slice(offset, offset + limit),
      total: allMessages.length,
    };
  }

  createMessage(message: MessageEntity): MessageEntity {
    this.state.messages.set(message.id, message);
    return message;
  }

  updateMessage(id: string, updates: Partial<MessageEntity>): MessageEntity | undefined {
    const message = this.state.messages.get(id);
    if (!message) return undefined;

    const updated = {
      ...message,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.state.messages.set(id, updated);
    return updated;
  }

  deleteMessage(id: string, deletedBy: string): boolean {
    const message = this.state.messages.get(id);
    if (!message) return false;

    message.deletedAt = new Date().toISOString();
    message.deletedBy = deletedBy;
    return true;
  }

  getChannel(id: string): ChannelEntity | undefined {
    return this.state.channels.get(id);
  }

  getAgent(id: string): AgentEntity | undefined {
    return this.state.agents.get(id);
  }

  getAgentsByIds(ids: string[]): AgentEntity[] {
    return ids
      .map(id => this.state.agents.get(id))
      .filter((agent): agent is AgentEntity => agent !== undefined);
  }
}

export const db = new Database();
