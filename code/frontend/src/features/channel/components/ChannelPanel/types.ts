export type ChannelType = 'public' | 'private' | 'dm' | 'thread';

export interface Channel {
  channel_id: string;
  type: ChannelType;
  name: string;
  description?: string;
  unread_count: number;
  last_activity: Date;
  is_pinned: boolean;
  metadata?: {
    project_id?: string;
    workflow_id?: string;
    okr_id?: string;
    agent_id?: string;
  };
}

export interface Thread {
  thread_id: string;
  channel_id: string;
  title: string;
  is_pinned: boolean;
  title_locked?: boolean;
  last_activity: Date;
  message_count: number;
  unread_count: number;
  status?: 'active' | 'archived';
  execution_id?: number;
}

export type MessageSender = 'user' | 'agent' | 'system';

export interface Message {
  message_id: string;
  thread_id: string;
  sender: MessageSender;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  timestamp: Date;
  is_streaming?: boolean;
}

export interface AgentInfo {
  agent_id: string;
  name: string;
  avatar: string;
  model: 'opus' | 'sonnet' | 'haiku';
  status: 'idle' | 'running' | 'error';
  description?: string;
  skills?: string[];
  tools?: string[];
}

export interface ChannelPanelProps {
  channel_id: string;
  thread_id?: string | null;
  onClose?: () => void;
  className?: string;
}
