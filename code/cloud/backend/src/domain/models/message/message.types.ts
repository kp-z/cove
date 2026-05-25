export type SenderType = 'human' | 'agent' | 'system';
export type MessageStatus = 'draft' | 'sending' | 'sent' | 'failed' | 'deleted';
export type ContentType = 'text' | 'markdown' | 'code' | 'image' | 'file' | 'combination';
export type ContentFormat = 'plain' | 'markdown' | 'html';
export type MentionType = 'agent' | 'user' | 'channel' | 'task';
export type ReferenceType = 'task' | 'plan' | 'agent' | 'file' | 'url';

export const VALID_SENDER_TYPES: readonly SenderType[] = ['human', 'agent', 'system'];
export const VALID_MESSAGE_STATUSES: readonly MessageStatus[] = ['draft', 'sending', 'sent', 'failed', 'deleted'];
export const VALID_CONTENT_TYPES: readonly ContentType[] = ['text', 'markdown', 'code', 'image', 'file', 'combination'];
export const VALID_CONTENT_FORMATS: readonly ContentFormat[] = ['plain', 'markdown', 'html'];

export interface MessageAttachment {
  readonly attachmentId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;
  readonly fileUrl: string;
  readonly thumbnailUrl?: string;
}

export interface MessageMention {
  readonly mentionType: MentionType;
  readonly mentionId: string;
  readonly mentionName?: string;
  readonly mentionPosition?: number;
}

export interface MessageReference {
  readonly refType: ReferenceType;
  readonly refId: string;
  readonly refTitle: string;
}

export interface MessageReaction {
  readonly emoji: string;
  readonly userIds: readonly string[];
  readonly count: number;
}

export interface MessageEditHistory {
  readonly editedAt: Date;
  readonly previousContent: string;
  readonly editedBy: string;
}

// Agent 执行元数据类型
export interface ToolLog {
  readonly id: string;
  readonly timestamp: string;
  readonly tool_name: string;
  readonly action: string;
  readonly params?: Record<string, unknown>;
  readonly status: 'pending' | 'running' | 'success' | 'error';
  readonly duration?: number;
  readonly result?: {
    readonly success?: string;
    readonly error?: string;
    readonly output?: string;
  };
  readonly meta?: {
    readonly file_count?: number;
    readonly lines_changed?: number;
    readonly exit_code?: number;
  };
}

export interface TokenUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly total_tokens: number;
  readonly cache?: {
    readonly creation_tokens: number;
    readonly read_tokens: number;
    readonly hit_rate?: number;
  };
  readonly cost?: {
    readonly input_cost: number;
    readonly output_cost: number;
    readonly cache_cost: number;
    readonly total_cost: number;
  };
  readonly model?: string;
  readonly latency?: {
    readonly first_token_ms?: number;
    readonly total_ms?: number;
    readonly tokens_per_second?: number;
  };
}

export interface AgentExecutionMetadata {
  readonly thinking?: string;
  readonly tool_logs?: readonly ToolLog[];
  readonly usage?: TokenUsage;
  readonly execution_mode?: 'API' | 'CLI' | 'SDK';
  readonly streaming_status?: 'thinking' | 'tool_use' | 'responding' | 'completed';
  readonly sequence?: number;
  readonly started_at?: string;
  readonly completed_at?: string;
}

// 文件存储内容类型（用于 Repository 层）
export interface MessageContent {
  content: string;
  senderName: string;
  channelName: string;
  contentFormat: string;
  attachments: Array<{
    attachmentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    thumbnailUrl?: string;
  }>;
  mentions: Array<{
    mentionType: MentionType;
    mentionId: string;
    mentionName?: string;
    mentionPosition?: number;
  }>;
  references: Array<{
    refType: ReferenceType;
    refId: string;
    refTitle: string;
  }>;
  reactions: Array<{
    emoji: string;
    userIds: string[];
    count: number;
  }>;
  editHistory: Array<{
    editedAt: string;
    previousContent: string;
    editedBy: string;
  }>;
  meta: {
    client: string;
    isPinned: boolean;
    isImportant: boolean;
  };
  agentExecutionMetadata?: {
    thinking?: string;
    toolLogs?: Array<{
      id: string;
      timestamp: string;
      toolName: string;
      action: string;
      params?: Record<string, unknown>;
      status: 'pending' | 'running' | 'success' | 'error';
      duration?: number;
      result?: {
        success?: string;
        error?: string;
        output?: string;
      };
      meta?: {
        fileCount?: number;
        linesChanged?: number;
        exitCode?: number;
      };
    }>;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cache?: {
        creationTokens: number;
        readTokens: number;
        hitRate?: number;
      };
      cost?: {
        inputCost: number;
        outputCost: number;
        cacheCost: number;
        totalCost: number;
      };
      model?: string;
      latency?: {
        firstTokenMs?: number;
        totalMs?: number;
        tokensPerSecond?: number;
      };
    };
    executionMode?: 'API' | 'CLI' | 'SDK';
    streamingStatus?: 'thinking' | 'tool_use' | 'responding' | 'completed';
    sequence?: number;
    startedAt?: string;
    completedAt?: string;
  };
}

export interface MessageEntityProps {
  readonly messageId: string;
  readonly msgShortId: string;
  readonly senderId: string;
  readonly senderType: SenderType;
  readonly senderName: string;
  readonly channelId: string;
  readonly channelName: string;
  readonly threadId?: string;
  readonly isThreadRoot: boolean;
  readonly content: string;
  readonly contentType: ContentType;
  readonly contentFormat: ContentFormat;
  readonly attachments: readonly MessageAttachment[];
  readonly mentions: readonly MessageMention[];
  readonly references: readonly MessageReference[];
  readonly status: MessageStatus;
  readonly isEdited: boolean;
  readonly editHistory: readonly MessageEditHistory[];
  readonly reactions: readonly MessageReaction[];
  readonly agentExecutionMetadata?: AgentExecutionMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
  readonly meta: {
    readonly client: string;
    readonly isPinned: boolean;
    readonly isImportant: boolean;
  };
}

export interface MessageEntityJSON {
  readonly message_id: string;
  readonly msg_short_id: string;
  readonly sender_id: string;
  readonly sender_type: SenderType;
  readonly sender_name: string;
  readonly channel_id: string;
  readonly channel_name: string;
  readonly thread_id?: string;
  readonly is_thread_root: boolean;
  readonly content: string;
  readonly content_type: ContentType;
  readonly content_format: ContentFormat;
  readonly attachments: readonly {
    readonly attachment_id: string;
    readonly file_name: string;
    readonly file_type: string;
    readonly file_size: number;
    readonly file_url: string;
    readonly thumbnail_url?: string;
  }[];
  readonly mentions: readonly {
    readonly mention_type: MentionType;
    readonly mention_id: string;
    readonly mention_name?: string;
    readonly mention_position?: number;
  }[];
  readonly references: readonly {
    readonly ref_type: ReferenceType;
    readonly ref_id: string;
    readonly ref_title: string;
  }[];
  readonly status: MessageStatus;
  readonly is_edited: boolean;
  readonly edit_history: readonly {
    readonly edited_at: string;
    readonly previous_content: string;
    readonly edited_by: string;
  }[];
  readonly reactions: readonly {
    readonly emoji: string;
    readonly user_ids: readonly string[];
    readonly count: number;
  }[];
  readonly agent_execution_metadata?: {
    readonly thinking?: string;
    readonly tool_logs?: readonly {
      readonly id: string;
      readonly timestamp: string;
      readonly tool_name: string;
      readonly action: string;
      readonly params?: Record<string, unknown>;
      readonly status: 'pending' | 'running' | 'success' | 'error';
      readonly duration?: number;
      readonly result?: {
        readonly success?: string;
        readonly error?: string;
        readonly output?: string;
      };
      readonly meta?: {
        readonly file_count?: number;
        readonly lines_changed?: number;
        readonly exit_code?: number;
      };
    }[];
    readonly usage?: {
      readonly input_tokens: number;
      readonly output_tokens: number;
      readonly total_tokens: number;
      readonly cache?: {
        readonly creation_tokens: number;
        readonly read_tokens: number;
        readonly hit_rate?: number;
      };
      readonly cost?: {
        readonly input_cost: number;
        readonly output_cost: number;
        readonly cache_cost: number;
        readonly total_cost: number;
      };
      readonly model?: string;
      readonly latency?: {
        readonly first_token_ms?: number;
        readonly total_ms?: number;
        readonly tokens_per_second?: number;
      };
    };
    readonly execution_mode?: 'API' | 'CLI' | 'SDK';
    readonly streaming_status?: 'thinking' | 'tool_use' | 'responding' | 'completed';
    readonly sequence?: number;
    readonly started_at?: string;
    readonly completed_at?: string;
  };
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at?: string;
  readonly meta: {
    readonly client: string;
    readonly is_pinned: boolean;
    readonly is_important: boolean;
  };
}

