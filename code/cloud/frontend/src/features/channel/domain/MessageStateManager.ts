/**
 * MessageStateManager
 * 统一管理所有消息状态（local + remote）
 * 负责消息合并、去重、排序、流式更新
 */

import { Message, type MessageStatus, type MessageError, type StreamingPhase, type StreamingData } from './models';
import { systemLog } from '../stores/systemEventStore';

export class MessageStateManager {
  private localMessages: Map<string, Message> = new Map();
  private remoteMessages: Map<string, Message> = new Map();
  private subscribers: Map<string, Set<(messages: Message[]) => void>> = new Map();

  // 添加本地消息（optimistic）
  addLocalMessage(message: Message): void {
    if (!message.isLocal()) {
      throw new Error('Only local messages can be added');
    }

    systemLog.info(
      message.channelId,
      'message.created_local',
      `Created local message: ${message.content.substring(0, 50)}...`,
      { messageId: message.id, localMessagesCount: this.localMessages.size }
    );

    this.localMessages.set(message.id, message);
    this.notifySubscribers(message.channelId);
  }

  // 更新消息状态
  updateMessageStatus(id: string, status: MessageStatus, error?: MessageError): void {
    const message = this.localMessages.get(id) || this.remoteMessages.get(id);
    if (!message) return;

    let updated: Message;
    if (status === 'failed') {
      const failed = message.markAsFailed(error!);
      // 契约2：流式中的 agent 消息失败时，同步将 streamingPhase 置为 'failed'，
      // 使 StreamingStatusIndicator 正确显示失败态（修复旧 F4）。
      updated = message.streamingPhase
        ? new Message({ ...failed, streamingPhase: 'failed' })
        : failed;
    } else if (status === 'queued') {
      updated = message.markAsQueued();
    } else {
      updated = new Message({ ...message, status });
    }

    const isLocal = message.isLocal();

    if (isLocal) {
      this.localMessages.set(id, updated);
    } else {
      this.remoteMessages.set(id, updated);
    }

    // 记录状态变化
    if (status === 'failed') {
      systemLog.error(
        message.channelId,
        'message.failed',
        `Message failed: ${error?.message || 'Unknown error'}`,
        { messageId: id, error }
      );
    } else if (status === 'queued') {
      systemLog.info(message.channelId, 'message.queued', `Message queued`, { messageId: id });
    } else if (status === 'sending') {
      systemLog.info(message.channelId, 'message.sending', `Message sending...`, { messageId: id });
    } else if (status === 'sent') {
      systemLog.info(message.channelId, 'message.sent', `Message sent successfully`, { messageId: id });

      // 如果是本地消息且标记为 sent，保留它直到远程消息到达
      // 不再使用定时器，而是在 syncRemoteMessages 时删除
    }

    this.notifySubscribers(message.channelId);
  }

  // 更新流式阶段
  updateStreamingPhase(id: string, phase: StreamingPhase): void {
    const message = this.remoteMessages.get(id) || this.localMessages.get(id);
    if (!message) return;

    const updated = message.updateStreamingPhase(phase);

    if (message.isLocal()) {
      this.localMessages.set(id, updated);
    } else {
      this.remoteMessages.set(id, updated);
    }

    // 记录流式阶段变化
    if (phase === 'thinking' || phase === 'responding') {
      systemLog.info(
        message.channelId,
        'message.streaming_phase',
        `Streaming phase: ${phase}`,
        { messageId: id, phase }
      );
    } else if (phase === 'completed') {
      systemLog.info(
        message.channelId,
        'message.streaming_complete',
        `Streaming completed`,
        { messageId: id }
      );
    }

    this.notifySubscribers(message.channelId);
  }

  // 更新流式数据
  updateStreamingData(id: string, data: Partial<StreamingData>): void {
    const message = this.remoteMessages.get(id) || this.localMessages.get(id);
    if (!message) return;

    const updated = message.updateStreamingData(data);

    if (message.isLocal()) {
      this.localMessages.set(id, updated);
    } else {
      this.remoteMessages.set(id, updated);
    }
    this.notifySubscribers(message.channelId);
  }

  // 追加流式内容
  appendStreamingContent(id: string, chunk: string): void {
    const message = this.remoteMessages.get(id) || this.localMessages.get(id);
    if (!message) return;

    const updated = message.updatePartialContent(chunk);

    if (message.isLocal()) {
      this.localMessages.set(id, updated);
    } else {
      this.remoteMessages.set(id, updated);
    }
    this.notifySubscribers(message.channelId);
  }

  // 契约1：将服务端返回的权威消息 id 关联到本地乐观消息。
  // 用户消息发送成功后调用，使 syncRemoteMessages 能通过 id 精确去重，
  // 不再依赖脆弱的「内容 + 时间戳」模糊匹配。
  attachServerId(localId: string, messageId: string): void {
    const message = this.localMessages.get(localId);
    if (!message) return;

    const updated = new Message({ ...message, messageId });
    this.localMessages.set(localId, updated);
  }

  // 同步远程消息
  syncRemoteMessages(channelId: string, messages: Message[]): void {
    let syncedCount = 0;
    const messagesToSync = messages.filter(msg => !this.remoteMessages.has(msg.id));

    messagesToSync.forEach((msg) => {
      this.remoteMessages.set(msg.id, msg);

      // 契约1：占位/最终消息共享同一权威 id，按 id 精确匹配即可，无需模糊匹配。
      const localMsg = Array.from(this.localMessages.values()).find((m) => {
        // 方案1: 权威 id 直接命中（agent 占位 id == 最终 id；用户消息已 attachServerId）
        if (m.id === msg.id) {
          return true;
        }

        // 方案2: tempId 匹配（若后端回传了 tempId）
        if (m.tempId && msg.tempId && m.tempId === msg.tempId) {
          return true;
        }

        // 方案3: 本地已关联的 messageId 匹配
        if (m.messageId && m.messageId === msg.id) {
          return true;
        }

        return false;
      });

      if (localMsg) {
        // 找到了对应的本地消息，立即删除
        this.localMessages.delete(localMsg.id);
        syncedCount++;

        systemLog.info(
          channelId,
          'message.synced',
          `Synced message: ${localMsg.id} → ${msg.id}`,
          { localId: localMsg.id, remoteId: msg.id, tempId: localMsg.tempId }
        );
      }
    });

    systemLog.info(
      channelId,
      'message.synced',
      `Synced ${messagesToSync.length} remote messages (${syncedCount} matched local)`,
      { totalMessages: messagesToSync.length, syncedCount }
    );

    this.notifySubscribers(channelId);
  }

  // 获取频道的所有消息（合并 + 去重 + 排序）
  getMessages(channelId: string): Message[] {
    const local = Array.from(this.localMessages.values()).filter(
      (m) => m.channelId === channelId
    );

    const remote = Array.from(this.remoteMessages.values()).filter(
      (m) => m.channelId === channelId
    );

    // 合并并去重
    const messageMap = new Map<string, Message>();

    // 先添加远程消息
    remote.forEach((msg) => messageMap.set(msg.messageId!, msg));

    // 再添加本地消息（不与远程消息重复）
    local.forEach((msg) => {
      // 如果本地消息还在 pending 状态，总是显示它
      if (msg.status === 'pending' || msg.status === 'queued') {
        messageMap.set(msg.id, msg);
        return;
      }

      // 否则检查是否与远程消息重复
      const isDuplicate = remote.some(
        (r) =>
          r.content === msg.content &&
          Math.abs(r.timestamp.getTime() - msg.timestamp.getTime()) < 5000
      );
      if (!isDuplicate) {
        messageMap.set(msg.id, msg);
      }
    });

    // 按时间排序（最旧在前）
    return Array.from(messageMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  // 订阅消息变化
  subscribe(channelId: string, callback: (messages: Message[]) => void): () => void {
    if (!this.subscribers.has(channelId)) {
      this.subscribers.set(channelId, new Set());
    }
    this.subscribers.get(channelId)!.add(callback);

    // 立即触发一次
    callback(this.getMessages(channelId));

    // 返回取消订阅函数
    return () => {
      this.subscribers.get(channelId)?.delete(callback);
    };
  }

  private notifySubscribers(channelId: string): void {
    const callbacks = this.subscribers.get(channelId);

    if (!callbacks) {
      systemLog.warn(
        channelId,
        'state.subscribers_notified',
        'No subscribers found',
        { channelId }
      );
      return;
    }

    const messages = this.getMessages(channelId);
    systemLog.info(
      channelId,
      'state.subscribers_notified',
      `Notified ${callbacks.size} subscribers with ${messages.length} messages`,
      { subscribersCount: callbacks.size, messagesCount: messages.length }
    );
    callbacks.forEach((cb) => cb(messages));
  }

  // 清理已完成的本地消息（5秒后）
  cleanupCompletedMessages(): void {
    const now = Date.now();
    Array.from(this.localMessages.entries()).forEach(([id, msg]) => {
      if (msg.status === 'sent' && now - msg.timestamp.getTime() > 5000) {
        this.localMessages.delete(id);
        this.notifySubscribers(msg.channelId);
      }
    });
  }
}

// 单例实例
export const messageStateManager = new MessageStateManager();

// 不再使用定时器清理，改为在 syncRemoteMessages 时清理
