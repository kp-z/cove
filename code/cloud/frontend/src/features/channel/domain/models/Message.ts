/**
 * Message 领域模型
 * 封装消息的业务逻辑和状态转换
 */

export type MessageSource = 'local' | 'remote';
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'deleted';
export type SenderType = 'user' | 'agent' | 'system';

export type MessageError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type MessageProps = {
  id: string;
  messageId?: string;
  tempId?: string;
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
  agentMetadata?: any;
};

export class Message {
  readonly id: string;
  readonly messageId?: string;
  readonly tempId?: string;
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

  constructor(props: MessageProps) {
    this.id = props.id;
    this.messageId = props.messageId;
    this.tempId = props.tempId;
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
}
