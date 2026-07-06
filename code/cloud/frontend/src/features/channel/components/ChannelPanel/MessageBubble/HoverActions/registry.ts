/**
 * 消息操作注册系统
 */

import { Brain, Wrench, Coins, FileCode, Copy, Edit, Trash2, Reply } from 'lucide-react';
import type { ActionFactory, ActionType, MessageAction } from './types';

/**
 * 默认操作注册表
 * 使用 Record 类型映射确保类型安全
 */
const defaultActionRegistry: Record<ActionType, ActionFactory> = {
  // 合并后的「详情」入口：思考过程 + 工具调用 + 用量统计统一在详情面板中查看
  details: (config) => ({
    id: 'details',
    label: '详情',
    icon: Brain,
    priority: 10,
    tooltip: '查看思考过程、工具调用与用量详情',
    variant: 'ghost',
    // 只要该消息存在执行元数据即显示：详情面板始终有 Stats 标签兜底展示执行模式/耗时等信息，
    // 不应仅因为没有 thinking/tool_logs 就把入口整个隐藏（例如纯文本回复、无工具调用的场景）。
    // 注意：不要收窄为 !!thinking || tool_logs.length > 0 —— Claude CLI 流式适配器不会
    // 上报独立的 thinking chunk（onThinking 从未被调用），纯文本回复的 thinking 字段恒为
    // undefined，若仍按旧条件收窄会导致该按钮对大多数正常回复不可见。
    shouldShow: (message) => !!message.agentMetadata,
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  thinking: (config) => ({
    id: 'thinking',
    label: 'Thinking',
    icon: Brain,
    priority: 10,
    tooltip: 'View AI thinking process',
    variant: 'ghost',
    shouldShow: (message) => !!message.agentMetadata?.thinking,
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  tools: (config) => ({
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    priority: 20,
    tooltip: 'View tool usage logs',
    variant: 'ghost',
    shouldShow: (message) => (message.agentMetadata?.tool_logs?.length || 0) > 0,
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  usage: (config) => ({
    id: 'usage',
    label: 'Usage',
    icon: Coins,
    priority: 30,
    tooltip: 'View token usage and cost',
    variant: 'ghost',
    shouldShow: (message) => !!message.agentMetadata?.usage,
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  diff: (config) => ({
    id: 'diff',
    label: 'Diff',
    icon: FileCode,
    priority: 40,
    tooltip: 'View file changes',
    variant: 'ghost',
    shouldShow: (message) => {
      const logs = (message.agentMetadata?.tool_logs ?? []) as Array<{
        tool_name?: string;
      }>;
      return logs.some((log) => log.tool_name === 'Edit' || log.tool_name === 'Write');
    },
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  copy: (config) => ({
    id: 'copy',
    label: 'Copy',
    icon: Copy,
    priority: 50,
    tooltip: 'Copy message content',
    variant: 'ghost',
    shouldShow: () => true,
    onClick: (message) => {
      navigator.clipboard.writeText(message.content);
    },
    ...config,
  }),

  edit: (config) => ({
    id: 'edit',
    label: 'Edit',
    icon: Edit,
    priority: 60,
    tooltip: 'Edit message',
    variant: 'ghost',
    shouldShow: (message) => message.senderType === 'user' && message.canRecall(),
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  delete: (config) => ({
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    priority: 70,
    tooltip: 'Delete message',
    variant: 'danger',
    shouldShow: (message) => message.senderType === 'user' && message.canRecall(),
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  reply: (config) => ({
    id: 'reply',
    label: 'Reply',
    icon: Reply,
    priority: 80,
    tooltip: 'Reply to message',
    variant: 'ghost',
    shouldShow: () => true,
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  react: (config) => ({
    id: 'react',
    label: 'React',
    icon: Reply,
    priority: 90,
    tooltip: 'Add reaction',
    variant: 'ghost',
    shouldShow: () => false, // 暂不实现
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),

  share: (config) => ({
    id: 'share',
    label: 'Share',
    icon: Reply,
    priority: 100,
    tooltip: 'Share message',
    variant: 'ghost',
    shouldShow: () => false, // 暂不实现
    onClick: () => {
      // 由外部配置提供具体实现
    },
    ...config,
  }),
};

/**
 * 操作注册管理器
 */
class MessageActionManager {
  private registry: Map<string, ActionFactory> = new Map();

  constructor() {
    Object.entries(defaultActionRegistry).forEach(([key, factory]) => {
      this.registry.set(key, factory);
    });
  }

  register(id: string, factory: ActionFactory): void {
    this.registry.set(id, factory);
  }

  unregister(id: string): void {
    this.registry.delete(id);
  }

  get(id: string, config?: Partial<MessageAction>): MessageAction | undefined {
    const factory = this.registry.get(id);
    return factory ? factory(config) : undefined;
  }

  getAll(config?: Record<string, Partial<MessageAction>>): MessageAction[] {
    return Array.from(this.registry.entries()).map(([id, factory]) => factory(config?.[id]));
  }
}

export const messageActionManager = new MessageActionManager();
