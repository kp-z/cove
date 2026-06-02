/**
 * Agent 错误处理器
 * 将底层错误转换为用户友好的 AgentError
 */

import { AgentError, AgentErrorCode } from '../../../domain/types/agent-error.types';
import { IMessageRepository } from '../../interfaces/repositories/message.repository.interface';
import { MessageEntity } from '../../../domain/models/message/message.entity';

export class AgentErrorHandler {

  /**
   * 将底层错误转换为 AgentError
   */
  static handleError(error: any): AgentError {
    // Anthropic API 错误
    if (error.type === 'rate_limit_error') {
      return {
        code: AgentErrorCode.LLM_RATE_LIMIT,
        message: '请求过于频繁，请稍后再试',
        details: { retryAfter: error.retryAfter },
        retryable: true,
        retryAfter: error.retryAfter || 60,
      };
    }
    
    if (error.type === 'overloaded_error') {
      return {
        code: AgentErrorCode.DEVICE_BUSY,
        message: 'Agent 处理器繁忙，请稍后再试',
        retryable: true,
        retryAfter: 30,
      };
    }
    
    // Device 离线
    if (error.code === 'DEVICE_NOT_FOUND' || error.code === 'DEVICE_OFFLINE') {
      return {
        code: AgentErrorCode.DEVICE_OFFLINE,
        message: 'Agent 处理服务暂时不可用',
        retryable: true,
        retryAfter: 60,
      };
    }
    
    // API Key 缺失
    if (error.message?.includes('API key') || error.message?.includes('api_key')) {
      return {
        code: AgentErrorCode.MISSING_API_KEY,
        message: 'Agent 配置错误，请联系管理员',
        retryable: false,
      };
    }
    
    // 超时
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return {
        code: AgentErrorCode.LLM_TIMEOUT,
        message: 'Agent 响应超时，请重试',
        retryable: true,
        retryAfter: 10,
      };
    }
    
    // 未知错误
    return {
      code: AgentErrorCode.UNKNOWN_ERROR,
      message: 'Agent 处理失败，请稍后重试',
      details: { originalError: error.message },
      retryable: true,
      retryAfter: 30,
    };
  }
  
  /**
   * 保存错误消息到数据库
   */
  static async saveErrorMessage(
    messageRepository: IMessageRepository,
    context: {
      messageId: string;
      channelId: string;
      realmId: string;
      agentId: string;
      agentName: string;
    },
    error: AgentError
  ): Promise<MessageEntity> {
    const errorMessage = MessageEntity.create({
      realmId: context.realmId,
      messageId: `msg-error-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      msgShortId: Math.random().toString(36).slice(2, 11),
      senderId: context.agentId,
      senderType: 'agent',
      senderName: context.agentName,
      channelId: context.channelId,
      channelName: '',
      threadId: context.messageId,
      isThreadRoot: false,
      content: `❌ ${error.message}`,
      contentType: 'text',
      contentFormat: 'markdown',
      status: 'sent',
      meta: {
        client: 'agent-error-handler',
        isPinned: false,
        isImportant: false,
      } as any, // 使用 any 以支持自定义字段
      attachments: [],
      mentions: [],
      references: [{ refType: 'url', refId: context.messageId, refTitle: 'Reply to' }],
      reactions: [],
      isEdited: false,
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await messageRepository.save(errorMessage, context.realmId);
    return errorMessage;
  }
}
