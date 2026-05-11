/**
 * ChannelPanel 类型定义
 *
 * 对齐 Slock 和 claude_manager 的命名规范
 */

/**
 * Channel 类型
 * - public: 公开频道（所有人可见）
 * - private: 私有频道（仅成员可见）
 * - dm: 私聊频道（一对一）
 * - thread: Thread 频道（从消息分叉）
 */
export type ChannelType = 'public' | 'private' | 'dm' | 'thread';

/**
 * Channel 数据结构
 *
 * 对应 Slock 的 Channel 概念
 */
export interface Channel {
  /** Channel 唯一标识符 */
  channelId: string;

  /** Channel 类型 */
  type: ChannelType;

  /** Channel 名称（显示用） */
  name: string;

  /** Channel 描述（可选） */
  description?: string;

  /** 未读消息数量 */
  unreadCount: number;

  /** 最后活动时间 */
  lastActivity: Date;

  /** 是否置顶 */
  isPinned: boolean;

  /** 扩展元数据（可关联 Project/Workflow/OKR） */
  metadata?: {
    projectId?: string;
    workflowId?: string;
    okrId?: string;
    agentId?: string;
  };
}

/**
 * Thread 数据结构
 *
 * Thread 是从 Channel 的某个消息分叉出来的子对话
 * 对应 claude_manager 的 Session 概念
 */
export interface Thread {
  /** Thread 唯一标识符（对应 conversation_id） */
  threadId: string;

  /** 所属 Channel ID */
  channelId: string;

  /** Thread 标题（自动生成或用户命名） */
  title: string;

  /** 是否置顶 */
  isPinned: boolean;

  /** 标题是否锁定（锁定后不会自动更新） */
  titleLocked?: boolean;

  /** 最后活动时间 */
  lastActivity: Date;

  /** 消息数量 */
  messageCount: number;

  /** 未读消息数量 */
  unreadCount: number;

  /** Thread 状态（可选） */
  status?: 'active' | 'archived';

  /** 关联的执行 ID（可选） */
  executionId?: number;
}

/**
 * Message 发送者类型
 * - user: 用户消息
 * - agent: Agent 消息
 * - system: 系统消息
 */
export type MessageSender = 'user' | 'agent' | 'system';

/**
 * Message 数据结构
 */
export interface Message {
  /** 消息唯一标识符 */
  messageId: string;

  /** 所属 Thread ID */
  threadId: string;

  /** 发送者类型 */
  sender: MessageSender;

  /** 发送者名称（显示用） */
  senderName: string;

  /** 发送者头像 URL（可选） */
  senderAvatar?: string;

  /** 消息内容（Markdown 格式） */
  content: string;

  /** 发送时间 */
  timestamp: Date;

  /** 是否正在流式输出 */
  isStreaming?: boolean;
}

/**
 * Agent 信息
 */
export interface AgentInfo {
  /** Agent 唯一标识符 */
  agentId: string;

  /** Agent 名称 */
  name: string;

  /** Agent 头像 URL */
  avatar: string;

  /** 使用的模型 */
  model: 'opus' | 'sonnet' | 'haiku';

  /** Agent 状态 */
  status: 'idle' | 'running' | 'error';

  /** Agent 描述（可选） */
  description?: string;

  /** Agent 技能列表（可选） */
  skills?: string[];

  /** Agent 工具列表（可选） */
  tools?: string[];
}

/**
 * ChannelPanel 组件 Props
 */
export interface ChannelPanelProps {
  /** 当前激活的 Channel ID */
  channelId: string;

  /** 当前激活的 Thread ID（可选，null 表示 Channel 级别） */
  threadId?: string | null;

  /** 关闭面板回调 */
  onClose: () => void;

  /** 自定义样式类名（可选） */
  className?: string;
}
