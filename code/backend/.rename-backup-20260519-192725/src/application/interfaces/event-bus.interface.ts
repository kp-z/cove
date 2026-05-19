/**
 * IEventBus - Event Bus 接口
 *
 * Application Layer 通过此接口发布和订阅领域事件。
 * 遵循依赖倒置原则，不直接依赖 Infrastructure 层的具体实现。
 */

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  /**
   * 发布事件
   * @param event - 领域事件
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * 批量发布事件
   * @param events - 领域事件数组
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * 订阅事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @returns 取消订阅的函数
   */
  subscribe(eventType: string, handler: EventHandler): () => void;

  /**
   * 订阅多个事件类型
   * @param eventTypes - 事件类型数组
   * @param handler - 事件处理器
   * @returns 取消订阅的函数
   */
  subscribeMany(eventTypes: string[], handler: EventHandler): () => void;

  /**
   * 取消订阅
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   */
  unsubscribe(eventType: string, handler: EventHandler): void;

  /**
   * 清空所有订阅
   */
  clear(): void;
}
