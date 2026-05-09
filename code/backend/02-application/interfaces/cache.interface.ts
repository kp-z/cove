/**
 * ICache - Cache 接口
 *
 * Application Layer 通过此接口访问缓存。
 * 遵循依赖倒置原则，不直接依赖 Infrastructure 层的具体实现。
 */

export interface CacheOptions {
  /**
   * 过期时间（秒）
   */
  readonly ttl?: number;

  /**
   * 是否允许过期后返回旧值
   */
  readonly allowStale?: boolean;
}

export interface ICache {
  /**
   * 获取缓存值
   * @param key - 缓存键
   * @returns 缓存值，不存在返回 null
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置缓存值
   * @param key - 缓存键
   * @param value - 缓存值
   * @param options - 缓存选项
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * 删除缓存值
   * @param key - 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 批量删除缓存值
   * @param keys - 缓存键数组
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * 检查缓存键是否存在
   * @param key - 缓存键
   * @returns 是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 获取或设置缓存值（如果不存在则调用 factory 函数）
   * @param key - 缓存键
   * @param factory - 工厂函数
   * @param options - 缓存选项
   * @returns 缓存值
   */
  getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>;

  /**
   * 设置缓存过期时间
   * @param key - 缓存键
   * @param ttl - 过期时间（秒）
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * 获取缓存剩余过期时间
   * @param key - 缓存键
   * @returns 剩余时间（秒），-1 表示永不过期，-2 表示不存在
   */
  ttl(key: string): Promise<number>;
}
