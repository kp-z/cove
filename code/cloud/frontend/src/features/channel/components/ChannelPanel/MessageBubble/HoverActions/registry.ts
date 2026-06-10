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
    // 只要有思考内容或工具调用记录即显示（用量数值已在气泡下方常驻展示）
    shouldShow: (message) =>
      !!message.agentMetadata?.thinking || (message.agentMetadata?.tool_logs?.length ?? 0) > 0,
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
    shouldShow: (message) => (message.agentMetadata?.toolLogs?.length || 0) > 0,
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
      const logs = (message.agentMetadata?.tool_logs ?? message.agentMetadata?.toolLogs ?? []) as Array<{
        toolName?: string;
      }>;
      return logs.some((log) => log.toolName === 'Edit' || log.toolName === 'Write');
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
