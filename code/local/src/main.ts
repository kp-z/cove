#!/usr/bin/env node
/**
 * Cove Local Device Agent
 *
 * 本地设备代理的主入口：创建 root logger、加载配置、启动 DeviceClient
 */

import { DeviceClient } from './device-client';
import { loadConfig } from './config';
import { ConsoleLogger } from './infrastructure/logger';
import type { ILogger } from './infrastructure/logger';

class ShutdownManager {
  private isShuttingDown = false;
  private forceExitTimer: NodeJS.Timeout | null = null;

  constructor(
    private client: DeviceClient,
    private logger: ILogger
  ) {}

  async shutdown(signal: string, exitCode: number): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    this.logger.info(`🛑 Shutting down gracefully... (signal: ${signal})`);

    this.forceExitTimer = setTimeout(() => {
      this.logger.warn('⚠️  Shutdown timeout reached, forcing exit...');
      process.exit(1);
    }, 30000);

    try {
      await this.client.stop();

      if (this.forceExitTimer) {
        clearTimeout(this.forceExitTimer);
      }

      this.logger.info('✅ Shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      this.logger.error('❌ Error during shutdown', error as Error);
      process.exit(1);
    }
  }
}

async function main() {
  // 创建全局 root logger（日志级别由 LOG_LEVEL 环境变量控制）
  const logLevel = (process.env.LOG_LEVEL as any) || 'info';
  const logger = new ConsoleLogger(logLevel);

  // 加载配置
  const config = await loadConfig();

  // 创建 DeviceClient（注入 root logger）
  const client = new DeviceClient(
    {
      ...config,
      logLevel,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    },
    logger
  );

  // 注册优雅停机
  const shutdownManager = new ShutdownManager(client, logger);

  process.on('SIGTERM', () => shutdownManager.shutdown('SIGTERM', 0));
  process.on('SIGINT',  () => shutdownManager.shutdown('SIGINT', 0));
  process.on('SIGHUP',  () => shutdownManager.shutdown('SIGHUP', 0));

  process.on('unhandledRejection', (reason) => {
    logger.error('❌ Unhandled rejection', reason as Error);
    shutdownManager.shutdown('unhandledRejection', 1);
  });

  process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught exception', error as Error);
    shutdownManager.shutdown('uncaughtException', 1);
  });

  // 启动
  await client.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
