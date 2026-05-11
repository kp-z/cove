/**
 * Agent Channel API Client
 *
 * 对接 Phase 3 Infrastructure Layer 的 REST API
 *
 * API 端点：
 * - POST   /api/channels/:channelId/messages - 发送消息
 * - GET    /api/channels/:channelId/messages - 获取消息列表
 * - GET    /api/messages/:messageId - 获取单条消息
 * - PUT    /api/messages/:messageId - 更新消息
 * - DELETE /api/messages/:messageId - 删除消息
 * - POST   /api/messages/:messageId/reactions - 添加反应
 * - DELETE /api/messages/:messageId/reactions - 移除反应
 * - GET    /api/channels/:channelId - 获取频道详情
 * - GET    /api/channels/:channelId/members - 获取频道成员
 * - GET    /api/channels/:channelId/agents - 获取频道 Agent Pool
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 统一的 API 响应格式
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 发送消息 DTO
 */
export interface SendMessageDTO {
  channelId: string;
  senderId: string;
  senderType: 'human' | 'agent';
  content: string;
  threadId?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  mentions?: string[];
}

/**
 * 更新消息 DTO
 */
export interface UpdateMessageDTO {
  messageId: string;
  content: string;
}

/**
 * 删除消息 DTO
 */
export interface DeleteMessageDTO {
  messageId: string;
  deletedBy: string;
}

/**
 * 添加/移除反应 DTO
 */
export interface ReactionDTO {
  messageId: string;
  userId: string;
  emoji: string;
}

/**
 * 消息实体（后端返回格式）
 */
export interface MessageEntity {
  id: string;
  channelId: string;
  senderId: string;
  senderType: 'human' | 'agent';
  content: string;
  threadId?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  mentions?: string[];
  reactions?: Array<{
    emoji: string;
    userIds: string[];
  }>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

/**
 * 频道实体（后端返回格式）
 */
export interface ChannelEntity {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'dm';
  projectId: string;
  createdBy: string;
  members: Array<{
    memberId: string;
    memberType: 'human' | 'agent';
    role: 'owner' | 'admin' | 'member';
    joinedAt: string;
  }>;
  agentPool: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent 实体（后端返回格式）
 */
export interface AgentEntity {
  id: string;
  name: string;
  description?: string;
  model: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Client 类
// ============================================================================

/**
 * Agent Channel API Client
 *
 * 提供类型安全的 API 调用方法
 */
export class AgentChannelApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // --------------------------------------------------------------------------
  // 消息相关 API
  // --------------------------------------------------------------------------

  /**
   * 发送消息
   * POST /api/channels/:channelId/messages
   */
  async sendMessage(dto: SendMessageDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/channels/${dto.channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        threadId: dto.threadId,
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

  /**
   * 获取频道消息列表
   * GET /api/channels/:channelId/messages
   */
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

  /**
   * 获取单条消息
   * GET /api/messages/:messageId
   */
  async getMessage(messageId: string): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`);

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get message');
    }

    return result.data;
  }

  /**
   * 更新消息内容
   * PUT /api/messages/:messageId
   */
  async updateMessage(dto: UpdateMessageDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.messageId}`, {
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

  /**
   * 删除消息
   * DELETE /api/messages/:messageId
   */
  async deleteMessage(dto: DeleteMessageDTO): Promise<{ messageId: string; deleted: boolean }> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.messageId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deletedBy: dto.deletedBy,
      }),
    });

    const result: ApiResponse<{ messageId: string; deleted: boolean }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to delete message');
    }

    return result.data;
  }

  /**
   * 添加反应
   * POST /api/messages/:messageId/reactions
   */
  async addReaction(dto: ReactionDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: dto.userId,
        emoji: dto.emoji,
      }),
    });

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to add reaction');
    }

    return result.data;
  }

  /**
   * 移除反应
   * DELETE /api/messages/:messageId/reactions
   */
  async removeReaction(dto: ReactionDTO): Promise<MessageEntity> {
    const response = await fetch(`${this.baseUrl}/messages/${dto.messageId}/reactions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: dto.userId,
        emoji: dto.emoji,
      }),
    });

    const result: ApiResponse<MessageEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to remove reaction');
    }

    return result.data;
  }

  // --------------------------------------------------------------------------
  // 频道相关 API
  // --------------------------------------------------------------------------

  /**
   * 获取频道详情
   * GET /api/channels/:channelId
   */
  async getChannel(channelId: string): Promise<ChannelEntity> {
    const response = await fetch(`${this.baseUrl}/channels/${channelId}`);

    const result: ApiResponse<ChannelEntity> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channel');
    }

    return result.data;
  }

  /**
   * 获取频道成员列表
   * GET /api/channels/:channelId/members
   */
  async getChannelMembers(channelId: string): Promise<{
    channelId: string;
    members: Array<{
      memberId: string;
      memberType: 'human' | 'agent';
      role: 'owner' | 'admin' | 'member';
      joinedAt: string;
    }>;
    total: number;
  }> {
    const response = await fetch(`${this.baseUrl}/channels/${channelId}/members`);

    const result: ApiResponse<{
      channelId: string;
      members: Array<{
        memberId: string;
        memberType: 'human' | 'agent';
        role: 'owner' | 'admin' | 'member';
        joinedAt: string;
      }>;
      total: number;
    }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channel members');
    }

    return result.data;
  }

  /**
   * 获取频道 Agent Pool
   * GET /api/channels/:channelId/agents
   */
  async getChannelAgents(channelId: string): Promise<{
    channelId: string;
    agentPool: string[];
    total: number;
  }> {
    const response = await fetch(`${this.baseUrl}/channels/${channelId}/agents`);

    const result: ApiResponse<{
      channelId: string;
      agentPool: string[];
      total: number;
    }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get channel agents');
    }

    return result.data;
  }
}

// ============================================================================
// 导出单例实例
// ============================================================================

/**
 * 默认 API 客户端实例
 */
export const apiClient = new AgentChannelApiClient();
