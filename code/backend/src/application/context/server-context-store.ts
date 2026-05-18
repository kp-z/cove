/**
 * ServerContextStore - 使用 AsyncLocalStorage 管理请求上下文
 *
 * 职责：
 * - 在异步调用链中自动传播 ServerContext
 * - 提供全局访问器获取当前请求的 ServerContext
 * - 避免在每个方法签名中显式传递 context 参数
 *
 * 使用方式：
 * 1. 在 tRPC middleware 中使用 serverContextStore.run() 注入 context
 * 2. 在 Service 层使用 getServerContext() 获取 context
 * 3. 在测试中使用 runWithContext() 模拟请求上下文
 */

import { AsyncLocalStorage } from 'async_hooks';
import { ServerContext } from './server-context';

/**
 * AsyncLocalStorage 实例，用于存储当前请求的 ServerContext
 */
export const serverContextStore = new AsyncLocalStorage<ServerContext>();

/**
 * 获取当前请求的 ServerContext
 *
 * @throws {Error} 如果在没有 ServerContext 的上下文中调用
 * @returns {ServerContext} 当前请求的 ServerContext
 *
 * @example
 * ```typescript
 * async createProject(dto: CreateProjectDTO): Promise<ProjectEntity> {
 *   const context = getServerContext();
 *   await this.projectRepository.save(project, context.serverId);
 * }
 * ```
 */
export function getServerContext(): ServerContext {
  const context = serverContextStore.getStore();
  if (!context) {
    throw new Error(
      'ServerContext is not available. ' +
        'Make sure you are calling this function within a request context. ' +
        'In tests, use runWithContext() to provide a context.'
    );
  }
  return context;
}

/**
 * 在指定的 ServerContext 中运行回调函数
 * 主要用于测试场景
 *
 * @param context - ServerContext 实例
 * @param callback - 要执行的回调函数
 * @returns 回调函数的返回值
 *
 * @example
 * ```typescript
 * // 在测试中使用
 * const result = await runWithContext(
 *   ServerContext.create('server-1', 'user-1'),
 *   async () => {
 *     return await projectService.createProject(dto);
 *   }
 * );
 * ```
 */
export function runWithContext<T>(context: ServerContext, callback: () => T): T {
  return serverContextStore.run(context, callback);
}

/**
 * 检查当前是否在 ServerContext 中
 *
 * @returns {boolean} 如果当前在 ServerContext 中返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * if (hasServerContext()) {
 *   const context = getServerContext();
 *   // 使用 context
 * }
 * ```
 */
export function hasServerContext(): boolean {
  return serverContextStore.getStore() !== undefined;
}
