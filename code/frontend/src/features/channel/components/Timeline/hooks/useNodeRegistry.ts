/**
 * useNodeRegistry - 节点注册管理 Hook
 *
 * 管理节点渲染器的注册和获取
 */

import { useEffect } from 'react';
import { nodeRegistry, type NodeRenderer } from '../NodeRegistry';
import { MessageNodeRenderer, ThreadNodeRenderer } from '../nodes';

/**
 * 初始化默认节点渲染器
 */
export function useNodeRegistry() {
  useEffect(() => {
    // 注册默认节点类型
    nodeRegistry.registerAll([
      MessageNodeRenderer,
      ThreadNodeRenderer,
    ]);

    // 清理函数（可选）
    return () => {
      // 如果需要，可以在组件卸载时清理注册
      // nodeRegistry.clear();
    };
  }, []);

  return {
    register: (renderer: NodeRenderer) => nodeRegistry.register(renderer),
    getRenderer: (type: string) => nodeRegistry.getRenderer(type),
    hasRenderer: (type: string) => nodeRegistry.hasRenderer(type),
    getRegisteredTypes: () => nodeRegistry.getRegisteredTypes(),
  };
}

export { useTimelineNodes } from './useTimelineNodes';
