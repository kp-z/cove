/**
 * ChannelPanel 类型定义
 *
 * 定义 Agent Channel 对话面板的核心数据结构
 */

/**
 * Channel 类型
 * - team: 团队频道（#dev-team）
 * - agent: Agent 频道（@agent-name）
 * - dm: 私聊频道（@user-name）
 */
export type ChannelType = 'team' | 'agent' | 'dm';

/**
 * Channel 数据结构
 *
 * @property channelId - Channel 唯一标识符
 * @property type - Channel 类型
 * @property name - Channel 名称（显示用）
 * @property description - Channel 描述（可选）
 * @property unreadCount - 未读消息数量
 * @property lastActivity - 最后活动时间
 * @property isPinned - 是否置顶
 * @property metadata - 扩展元数据（可关联 Project/Workflow/OKR）
 */
export interface Channel {
  channelId: string;
  type: ChannelType;
  name: string;
  description?: string;
  unreadCount: number;
  lastActivity: Date;
  isPinned: boolean;
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
 * Thread 是 Channel 内的子对话，类似 Slack 的 Thread
 *
 * @property threadId - Thread 唯一标识符
 * @property channelId - 所属 Channel ID
 * @property title - Thread 标题（自动生成或用户命名）
 * @property isPinned - 是否置顶
 * @property lastActivity - 最后活动时间
 * @property messageCount - 消息数量
 * @property unreadCount - 未读消息数量
 */
export interface Thread {
  threadId: string;
  channelId: string;
  title: string;
  isPinned: boolean;
  lastActivity: Date;
  messageCount: number;
  unreadCount: number;
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
 *
 * @property messageId - 消息唯一标识符
 * @property threadId - 所属 Thread ID
 * @property sender - 发送者类型
 * @property senderName - 发送者名称（显示用）
 * @property senderAvatar - 发送者头像 URL（可选）
 * @property content - 消息内容（Markdown 格式）
 * @property timestamp - 发送时间
 * @property isStreaming - 是否正在流式输出
 */
export interface Message {
  messageId: string;
  threadId: string;
  sender: MessageSender;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * Agent 信息
 *
 * @property agentId - Agent 唯一标识符
 * @property name - Agent 名称
 * @property avatar - Agent 头像 URL
 * @property model - 使用的模型（Opus/Sonnet/Haiku）
 * @property status - Agent 状态（idle/running/error）
 * @property description - Agent 描述（可选）
 */
export interface AgentInfo {
  agentId: string;
  name: string;
  avatar: string;
  model: 'opus' | 'sonnet' | 'haiku';
  status: 'idle' | 'running' | 'error';
  description?: string;
}

/**
 * ChannelPanel 组件 Props
 *
 * @property channelId - 当前激活的 Channel ID
 * @property threadId - 当前激活的 Thread ID（可选，默认显示 Channel 级别）
 * @property onClose - 关闭面板回调
 * @property className - 自定义样式类名（可选）
 */
export interface ChannelPanelProps {
  channelId: string;
  threadId?: string;
  onClose: () => void;
  className?: string;
}
