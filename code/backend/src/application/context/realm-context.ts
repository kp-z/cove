/**
 * RealmContext - Server 上下文
 *
 * 职责：
 * - 封装当前请求的 Server 上下文信息
 * - 提供 realmId 和 userId 给 Service 层使用
 * - 作为依赖注入的上下文对象
 *
 * 设计理念：
 * - 不可变对象（Immutable）
 * - 轻量级，只包含必要的上下文信息
 * - 通过依赖注入传递给 Service 层
 */

/**
 * RealmContext
 *
 * 封装当前请求的 Server 上下文信息
 */
export class RealmContext {
  /**
   * 创建 RealmContext
   *
   * @param realmId - Server ID
   * @param userId - User ID
   */
  constructor(
    public readonly realmId: string,
    public readonly userId: string
  ) {
    if (!realmId) {
      throw new Error('realmId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
  }

  /**
   * 创建新的 RealmContext（工厂方法）
   *
   * @param realmId - Server ID
   * @param userId - User ID
   * @returns RealmContext 实例
   */
  static create(realmId: string, userId: string): RealmContext {
    return new RealmContext(realmId, userId);
  }

  /**
   * 转换为 JSON 对象
   *
   * @returns JSON 对象
   */
  toJSON(): { realmId: string; userId: string } {
    return {
      realmId: this.realmId,
      userId: this.userId,
    };
  }

  /**
   * 转换为字符串（用于日志）
   *
   * @returns 字符串表示
   */
  toString(): string {
    return `RealmContext(realmId=${this.realmId}, userId=${this.userId})`;
  }
}
