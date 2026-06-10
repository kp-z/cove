/**
 * Message 领域模型
 * 封装消息的业务逻辑和状态转换
 */

import type { AgentExecutionMetadata } from '@/types/agent-execution';

export type MessageSource = 'local' | 'remote';
export type MessageStatus =
  | 'pending'    // 等待发送
  | 'sending'    // 正在发送中
  | 'sent'       // 已发送成功
  | 'failed'     // 发送失败
  | 'queued'     // 进入队列（离线）
  | 'deleted'    // 已删除
  | 'streaming'; // 流式更新中
export type SenderType = 'user' | 'agent' | 'system';

export type StreamingPhase =
  | 'pending'    // 等待Agent接收（占位状态）
  | 'accepted'   // Agent接收确认
  | 'thinking'   // 思考中
  | 'tool_use'   // 工具调用
  | 'responding' // 正在回复
  | 'completed'  // 完成
  | 'failed';    // 失败

export type MessageError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type StreamingData = {
  thinking?: string;
  currentTool?: {
    name: string;
    params?: any;
  };
  partialContent?: string; // 流式输出的部分内容
};

export type MessageProps = {
  id: string;
  messageId?: string;
  tempId?: string;
  // 关联的「被回复」消息 id。用于把 agent 占位气泡与触发它的用户消息绑定，
  // 便于 accepted 事件到达时精确认领占位（pending → accepted 复用同一气泡）。
  inReplyTo?: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderType: SenderType;
  content: string;
  timestamp: Date;
  source: MessageSource;
  status: MessageStatus;
  error?: MessageError;
  retryCount: number;
  agentMetadata?: AgentExecutionMetadata; // 使用新的类型
  streamingPhase?: StreamingPhase;
  streamingData?: StreamingData;
  skipAnimation?: boolean; // 历史消息不播放动画
};

export class Message {
  readonly id: string;
  readonly messageId?: string;
  readonly tempId?: string;
  readonly inReplyTo?: string;
  readonly channelId: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly senderType: SenderType;
  readonly content: string;
  readonly timestamp: Date;
  readonly source: MessageSource;
  readonly status: MessageStatus;
  readonly error?: MessageError;
  readonly retryCount: number;
  readonly agentMetadata?: any;
  readonly streamingPhase?: StreamingPhase;
  readonly streamingData?: StreamingData;
  readonly skipAnimation?: boolean;

  constructor(props: MessageProps) {
    this.id = props.id;
    this.messageId = props.messageId;
    this.tempId = props.tempId;
    this.inReplyTo = props.inReplyTo;
    this.channelId = props.channelId;
    this.senderId = props.senderId;
    this.senderName = props.senderName;
    this.senderType = props.senderType;
    this.content = props.content;
    this.timestamp = props.timestamp;
    this.source = props.source;
    this.status = props.status;
    this.error = props.error;
    this.retryCount = props.retryCount;
    this.agentMetadata = props.agentMetadata;
    this.streamingPhase = props.streamingPhase;
    this.streamingData = props.streamingData;
    this.skipAnimation = props.skipAnimation;
  }

  // 领域行为：状态判断
  isPending(): boolean {
    return this.status === 'pending';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  isLocal(): boolean {
    return this.source === 'local';
  }

  isQueued(): boolean {
    return this.status === 'queued';
  }

  isStreaming(): boolean {
    return this.status === 'streaming' || !!this.streamingPhase;
  }

  canRetry(): boolean {
    return this.isFailed() && !!this.error?.retryable && this.retryCount < 3;
  }

  canRecall(): boolean {
    return (
      this.status === 'sent' &&
      this.senderType === 'user' &&
      Date.now() - this.timestamp.getTime() < 120000 // 2分钟
    );
  }

  // 状态转换
  markAsSent(messageId: string): Message {
    return new Message({
      ...this,
      messageId,
      status: 'sent',
      source: 'remote',
    });
  }

  markAsFailed(error: MessageError): Message {
    return new Message({
      ...this,
      status: 'failed',
      error,
      retryCount: this.retryCount + 1,
    });
  }

  markAsDeleted(): Message {
    return new Message({
      ...this,
      status: 'deleted',
    });
  }

  markAsQueued(): Message {
    return new Message({
      ...this,
      status: 'queued',
    });
  }

  // 流式更新相关的状态转换
  updateStreamingPhase(phase: StreamingPhase): Message {
    return new Message({
      ...this,
      status: phase === 'completed' ? 'sent' : 'streaming',
      streamingPhase: phase,
    });
  }

  updateStreamingData(data: Partial<StreamingData>): Message {
    return new Message({
      ...this,
      streamingData: {
        ...this.streamingData,
        ...data,
      },
    });
  }

  updatePartialContent(chunk: string): Message {
    const currentContent = this.streamingData?.partialContent || '';
    return new Message({
      ...this,
      content: currentContent + chunk,
      streamingData: {
        ...this.streamingData,
        partialContent: currentContent + chunk,
      },
    });
  }

  // 从远程消息创建
  static fromRemote(remote: any): Message {
    return new Message({
      id: remote.message_id,
      messageId: remote.message_id,
      channelId: remote.channel_id || remote.thread_id,
      senderId: remote.sender_id,
      senderName: remote.sender_name,
      senderType: remote.sender_type === 'human' ? 'user' : remote.sender_type,
      content: remote.content,
      timestamp: new Date(remote.created_at),
      source: 'remote',
      status: 'sent',
      retryCount: 0,
      agentMetadata: remote.agent_execution_metadata,
    });
  }

  // Agent Execution Metadata 辅助方法
  hasThinking(): boolean {
    return !!this.agentMetadata?.thinking;
  }

  hasToolLogs(): boolean {
    return (this.agentMetadata?.tool_logs?.length ?? 0) > 0;
  }

  hasUsageStats(): boolean {
    return !!this.agentMetadata?.usage;
  }
}
