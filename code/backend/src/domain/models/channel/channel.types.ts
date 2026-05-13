export type ChannelType = 'public' | 'private' | 'dm';
export type ChannelStatus = 'active' | 'archived';
export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberType = 'human' | 'agent';

export const VALID_CHANNEL_TYPES: readonly ChannelType[] = ['public', 'private', 'dm'];
export const VALID_CHANNEL_STATUSES: readonly ChannelStatus[] = ['active', 'archived'];
export const VALID_MEMBER_ROLES: readonly MemberRole[] = ['owner', 'admin', 'member'];

export interface ChannelMember {
  readonly memberId: string;
  readonly memberType: MemberType;
  readonly role: MemberRole;
  readonly joinedAt: Date;
}

export interface ConversationRef {
  readonly conversationId: string;
  readonly agentId: string;
  readonly status: 'active' | 'archived';
  readonly messageCount: number;
}

export interface CommunicationRules {
  readonly allowMentions: boolean;
  readonly allowThreads: boolean;
  readonly allowAttachments: boolean;
  readonly maxMessageLength: number;
  readonly maxMembers?: number;
  readonly rateLimit?: {
    readonly messagesPerMinute: number;
    readonly enabled: boolean;
  };
}

export interface ChannelWorkspace {
  readonly root: string;
  readonly sharedFiles: string;
  readonly attachments: string;
}

export interface ChannelEntityProps {
  readonly channelId: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly icon?: string;
  readonly type: ChannelType;
  readonly status: ChannelStatus;
  readonly parentChannelId?: string;
  readonly projectId?: string;
  readonly members: readonly ChannelMember[];
  readonly agentPool: readonly string[];
  readonly taskPool: readonly string[];
  readonly conversationPool: readonly ConversationRef[];
  readonly communicationRules: CommunicationRules;
  readonly workspace: ChannelWorkspace;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly messageCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly createdBy: {
      readonly id: string;
      readonly type: MemberType;
    };
  };
}

export interface ChannelEntityJSON {
  readonly channel_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly type: ChannelType;
  readonly status: ChannelStatus;
  readonly parent_channel_id?: string;
  readonly project_id?: string;
  readonly members: readonly {
    readonly member_id: string;
    readonly member_type: MemberType;
    readonly role: MemberRole;
    readonly joined_at: string;
  }[];
  readonly agent_pool: readonly string[];
  readonly task_pool: readonly string[];
  readonly conversation_pool: readonly {
    readonly conversation_id: string;
    readonly agent_id: string;
    readonly status: 'active' | 'archived';
    readonly message_count: number;
  }[];
  readonly communication_rules: {
    readonly allow_mentions: boolean;
    readonly allow_threads: boolean;
    readonly allow_attachments: boolean;
    readonly max_message_length: number;
    readonly max_members?: number;
    readonly rate_limit?: {
      readonly messages_per_minute: number;
      readonly enabled: boolean;
    };
  };
  readonly workspace: {
    readonly root: string;
    readonly shared_files: string;
    readonly attachments: string;
  };
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly message_count: number;
    readonly created_at: string;
    readonly updated_at: string;
    readonly created_by: {
      readonly id: string;
      readonly type: MemberType;
    };
  };
}

