/**
 * ServerContext - Server 上下文
 *
 * 职责：
 * - 封装当前请求的 Server 上下文信息
 * - 提供 serverId 和 userId 给 Service 层使用
 * - 作为依赖注入的上下文对象
 *
 * 设计理念：
 * - 不可变对象（Immutable）
 * - 轻量级，只包含必要的上下文信息
 * - 通过依赖注入传递给 Service 层
 */

/**
 * ServerContext
 *
 * 封装当前请求的 Server 上下文信息
 */
export class ServerContext {
  /**
   * 创建 ServerContext
   *
   * @param serverId - Server ID
   * @param userId - User ID
   */
  constructor(
    public readonly serverId: string,
    public readonly userId: string
  ) {
    if (!serverId) {
      throw new Error('serverId is required');
    }
    if (!userId) {
      throw new Error('userId is required');
    }
  }

  /**
   * 创建新的 ServerContext（工厂方法）
   *
   * @param serverId - Server ID
   * @param userId - User ID
   * @returns ServerContext 实例
   */
  static create(serverId: string, userId: string): ServerContext {
    return new ServerContext(serverId, userId);
  }

  /**
   * 转换为 JSON 对象
   *
   * @returns JSON 对象
   */
  toJSON(): { serverId: string; userId: string } {
    return {
      serverId: this.serverId,
      userId: this.userId,
    };
  }

  /**
   * 转换为字符串（用于日志）
   *
   * @returns 字符串表示
   */
  toString(): string {
    return `ServerContext(serverId=${this.serverId}, userId=${this.userId})`;
  }
}
