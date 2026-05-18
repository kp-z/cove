/**
 * NodeRegistry - 节点注册中心
 *
 * 插件化架构的核心，负责管理所有节点类型的渲染器。
 * 支持动态注册新的节点类型，实现高内聚低耦合。
 */

import type { ReactNode } from 'react';

/**
 * 时间轴节点基础接口
 */
export interface TimelineNode<T = any> {
  type: string;           // 节点类型：'message' | 'thread' | 'event' | ...
  id: string;             // 唯一标识
  timestamp: string;      // ISO 8601 时间戳
  data: T;                // 节点特定数据
}

/**
 * 节点上下文 - 提供给节点渲染器的环境信息
 */
export interface NodeContext {
  channelId: string;
  currentUserId?: string;
  onNodeClick: (node: TimelineNode) => void;
  navigateToMessage?: (messageId: string) => void;
  openThread?: (threadId: string) => void;
}

/**
 * 节点渲染器接口
 */
export interface NodeRenderer<T = any> {
  type: string;
  render: (node: TimelineNode<T>, context: NodeContext) => ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}

/**
 * 节点注册中心类
 */
export class NodeRegistry {
  private renderers = new Map<string, NodeRenderer>();

  /**
   * 注册节点渲染器
   */
  register(renderer: NodeRenderer): void {
    if (this.renderers.has(renderer.type)) {
      console.warn(`NodeRenderer for type "${renderer.type}" is already registered. Overwriting.`);
    }
    this.renderers.set(renderer.type, renderer);
  }

  /**
   * 批量注册节点渲染器
   */
  registerAll(renderers: NodeRenderer[]): void {
    renderers.forEach(renderer => this.register(renderer));
  }

  /**
   * 获取节点渲染器
   */
  getRenderer(type: string): NodeRenderer | undefined {
    return this.renderers.get(type);
  }

  /**
   * 检查节点类型是否已注册
   */
  hasRenderer(type: string): boolean {
    return this.renderers.has(type);
  }

  /**
   * 获取所有已注册的节点类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * 取消注册节点渲染器
   */
  unregister(type: string): boolean {
    return this.renderers.delete(type);
  }

  /**
   * 清空所有注册的渲染器
   */
  clear(): void {
    this.renderers.clear();
  }
}

/**
 * 全局节点注册中心实例
 */
export const nodeRegistry = new NodeRegistry();
