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
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at?: string;
  readonly meta: {
    readonly client: string;
    readonly is_pinned: boolean;
    readonly is_important: boolean;
  };
}

