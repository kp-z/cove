/**
 * IMessageRepository - Message Repository 接口
 *
 * Application Layer 通过此接口访问 Message 数据。
 */

import { MessageEntity, MessageStatus } from '../../../01-domain/models/message/message.entity';

export interface IMessageRepository {
  /**
   * 根据 ID 查找 Message
   * @param messageId - Message ID
   * @returns Message 实体，不存在返回 null
   */
  findById(messageId: string): Promise<MessageEntity | null>;

  /**
   * 根据频道查找 Messages
   * @param channelId - Channel ID
   * @param limit - 限制数量
   * @param offset - 偏移量
   * @returns Message 实体数组
   */
  findByChannel(channelId: string, limit?: number, offset?: number): Promise<MessageEntity[]>;

  /**
   * 根据发送者查找 Messages
   * @param senderId - 发送者 ID
   * @returns Message 实体数组
   */
  findBySender(senderId: string): Promise<MessageEntity[]>;

  /**
   * 根据线程查找 Messages
   * @param threadId - Thread ID
   * @returns Message 实体数组
   */
  findByThread(threadId: string): Promise<MessageEntity[]>;

  /**
   * 根据状态查找 Messages
   * @param status - Message 状态
   * @returns Message 实体数组
   */
  findByStatus(status: MessageStatus): Promise<MessageEntity[]>;

  /**
   * 保存新 Message
   * @param message - Message 实体
   */
  save(message: MessageEntity): Promise<void>;

  /**
   * 更新 Message
   * @param message - Message 实体
   */
  update(message: MessageEntity): Promise<void>;

  /**
   * 删除 Message（软删除）
   * @param messageId - Message ID
   */
  delete(messageId: string): Promise<void>;

  /**
   * 检查 Message 是否存在
   * @param messageId - Message ID
   * @returns 是否存在
   */
  exists(messageId: string): Promise<boolean>;
}
