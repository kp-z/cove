/**
 * 测试工具函数
 */

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, timeoutMessage = 'Timeout waiting for condition' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(timeoutMessage);
}

/**
 * 等待消息
 */
export async function waitForMessage<T>(
  messages: T[],
  predicate: (msg: T) => boolean,
  options: {
    timeout?: number;
    timeoutMessage?: string;
  } = {}
): Promise<T> {
  const { timeout = 5000, timeoutMessage = 'Timeout waiting for message' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const message = messages.find(predicate);
    if (message) {
      return message;
    }
    await sleep(100);
  }

  throw new Error(timeoutMessage);
}

/**
 * 生成随机 ID
 */
export function randomId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 测量执行时间
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
}
