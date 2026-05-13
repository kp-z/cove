interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface SendMessageDTO {
  channel_id: string;
  sender_id: string;
  sender_type: 'human' | 'agent';
  content: string;
  thread_id?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  mentions?: string[];
}

export interface UpdateMessageDTO {
  message_id: string;
  content: string;
}

export interface DeleteMessageDTO {
  message_id: string;
  deleted_by: string;
}

export interface ReactionDTO {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface MessageEntity {
  message_id: string;
  channel_id: string;
  sender_id: string;
  sender_type: 'human' | 'agent';
  content: string;
  thread_id?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  mentions?: string[];
  reactions?: Array<{
    emoji: string;
    user_ids: string[];
  }>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface ChannelEntity {
  channel_id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'dm';
  project_id: string;
  created_by: string;
  members: Array<{
    member_id: string;
    member_type: 'human' | 'agent';
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
  }>;
  agent_pool: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentEntity {
  agent_id: string;
  name: string;
  description?: string;
  model: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class AgentChannelApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async sendMessage(dto: SendMessageDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/channels/${dto.channel_id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_id: dto.sender_id,
        sender_type: dto.sender_type,
        content: dto.content,
        thread_id: dto.thread_id,
        attachments: dto.attachments,
        mentions: dto.mentions,
      }),
    });

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to send message');
    }

    return result.data;
  }

  async getMessages(
    channelId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ messages: MessageEntity[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const url = `${this.baseUrl}/channels/${channelId}/messages${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);

    const result: ApiResponse<{ messages: MessageEntity[]; total: number }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get messages');
    }

    return result.data;
  }

  async getMessage(messageId: string): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`);

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get message');
    }

    return result.data;
  }

  async updateMessage(dto: UpdateMessageDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.message_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: dto.content,
      }),
    });

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to update message');
    }

    return result.data;
  }

  async deleteMessage(dto: DeleteMessageDTO): Promise<{ message_id: string; deleted: boolean }> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.message_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deleted_by: dto.deleted_by,
      }),
    });

    const result: ApiResponse<{ message_id: string; deleted: boolean }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to delete message');
    }

    return result.data;
  }

  async addReaction(dto: ReactionDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.message_id}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: dto.user_id,
        emoji: dto.emoji,
      }),
    });

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to add reaction');
    }

    return result.data;
  }

  async removeReaction(dto: ReactionDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.message_id}/reactions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: dto.user_id,
        emoji: dto.emoji,
      }),
    });

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to remove reaction');
    }

    return result.data;
  }

  async getChannels(): Promise<{ channels: ChannelEntity[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/channels`);

    const result: ApiResponse<{ channels: ChannelEntity[]; total: number }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channels');
    }

    return result.data;
  }

  async getChannel(channelId: string): Promise<ChannelEntity> {
    const response = await fetch(`${this.baseUrl}/channels/${channelId}`);

    const result: ApiResponse<ChannelEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channel');
    }

    return result.data;
  }

  async getChannelMembers(channelId: string): Promise<{
    channel_id: string;
    members: Array<{
      member_id: string;
      member_type: 'human' | 'agent';
      role: 'owner' | 'admin' | 'member';
      joined_at: string;
    }>;
    total: number;
  }> {
    const response = await fetch(`${this.baseUrl}/channels/${channelId}/members`);

    const result: ApiResponse<{
      channel_id: string;
      members: Array<{
        member_id: string;
        member_type: 'human' | 'agent';
        role: 'owner' | 'admin' | 'member';
        joined_at: string;
      }>;
      total: number;
    }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channel members');
    }

    return result.data;
  }

  async getChannelAgents(channelId: string): Promise<{
    channel_id: string;
    agent_pool: string[];
    total: number;
  }> {
    const response = await fetch(`${this.baseUrl}/channels/${channelId}/agents`);

    const result: ApiResponse<{
      channel_id: string;
      agent_pool: string[];
      total: number;
    }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channel agents');
    }

    return result.data;
  }
}

export const apiClient = new AgentChannelApiClient();
