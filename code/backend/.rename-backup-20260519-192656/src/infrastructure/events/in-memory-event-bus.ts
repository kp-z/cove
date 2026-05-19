/**
 * InMemoryEventBus - Event Bus 的内存实现
 *
 * MVP 阶段使用 Map 存储事件订阅，后续可替换为 Redis/RabbitMQ 等消息队列。
 * 实现 IEventBus 接口，遵循依赖倒置原则。
 *
 * 特性：
 * - 支持单个事件类型订阅
 * - 支持多个事件类型订阅
 * - 支持批量发布事件
 * - 异步事件处理
 * - 错误隔离（一个 handler 失败不影响其他 handler）
 */

import { IEventBus, DomainEvent, EventHandler } from '../../application/interfaces/event-bus.interface';

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * 发布事件
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType);

    if (!handlers || handlers.size === 0) {
      // 没有订阅者，直接返回
      return;
    }

    // 并行执行所有 handlers，错误隔离
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        // 记录错误但不中断其他 handlers
        console.error(`Error in event handler for ${event.eventType}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 批量发布事件
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    // 串行发布事件，保证顺序
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * 订阅事件
   * @returns 取消订阅的函数
   */
  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler);

    // 返回取消订阅函数
    return () => {
      this.unsubscribe(eventType, handler);
    };
  }

  /**
   * 订阅多个事件类型
   * @returns 取消订阅的函数
   */
  subscribeMany(eventTypes: string[], handler: EventHandler): () => void {
    const unsubscribeFns: Array<() => void> = [];

    for (const eventType of eventTypes) {
      const unsubscribe = this.subscribe(eventType, handler);
      unsubscribeFns.push(unsubscribe);
    }

    // 返回取消所有订阅的函数
    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);

    if (handlers) {
      handlers.delete(handler);

      // 如果没有订阅者了，删除整个 Set
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 获取事件类型的订阅者数量（仅用于测试/调试）
   */
  getHandlerCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * 获取所有事件类型（仅用于测试/调试）
   */
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
