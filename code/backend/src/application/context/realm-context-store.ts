/**
 * RealmContextStore - 使用 AsyncLocalStorage 管理请求上下文
 *
 * 职责：
 * - 在异步调用链中自动传播 RealmContext
 * - 提供全局访问器获取当前请求的 RealmContext
 * - 避免在每个方法签名中显式传递 context 参数
 *
 * 使用方式：
 * 1. 在 tRPC middleware 中使用 serverContextStore.run() 注入 context
 * 2. 在 Service 层使用 getRealmContext() 获取 context
 * 3. 在测试中使用 runWithContext() 模拟请求上下文
 */

import { AsyncLocalStorage } from 'async_hooks';
import { RealmContext } from './realm-context';

/**
 * AsyncLocalStorage 实例，用于存储当前请求的 RealmContext
 */
export const serverContextStore = new AsyncLocalStorage<RealmContext>();

/**
 * 获取当前请求的 RealmContext
 *
 * @throws {Error} 如果在没有 RealmContext 的上下文中调用
 * @returns {RealmContext} 当前请求的 RealmContext
 *
 * @example
 * ```typescript
 * async createProject(dto: CreateProjectDTO): Promise<ProjectEntity> {
 *   const context = getRealmContext();
 *   await this.projectRepository.save(project, context.realmId);
 * }
 * ```
 */
export function getRealmContext(): RealmContext {
  const context = serverContextStore.getStore();
  if (!context) {
    throw new Error(
      'RealmContext is not available. ' +
        'Make sure you are calling this function within a request context. ' +
        'In tests, use runWithContext() to provide a context.'
    );
  }
  return context;
}

/**
 * 在指定的 RealmContext 中运行回调函数
 * 主要用于测试场景
 *
 * @param context - RealmContext 实例
 * @param callback - 要执行的回调函数
 * @returns 回调函数的返回值
 *
 * @example
 * ```typescript
 * // 在测试中使用
 * const result = await runWithContext(
 *   RealmContext.create('server-1', 'user-1'),
 *   async () => {
 *     return await projectService.createProject(dto);
 *   }
 * );
 * ```
 */
export function runWithContext<T>(context: RealmContext, callback: () => T): T {
  return serverContextStore.run(context, callback);
}

/**
 * 检查当前是否在 RealmContext 中
 *
 * @returns {boolean} 如果当前在 RealmContext 中返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * if (hasRealmContext()) {
 *   const context = getRealmContext();
 *   // 使用 context
 * }
 * ```
 */
export function hasRealmContext(): boolean {
  return serverContextStore.getStore() !== undefined;
}
