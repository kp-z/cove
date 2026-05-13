/**
 * Prisma Client 单例
 *
 * 提供全局唯一的 Prisma Client 实例
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * 获取 Prisma Client 实例
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // 监听查询事件（用于性能监控）
    prisma.$on('query' as never, (e: any) => {
      if (e.duration > 100) {
        console.warn(`[Prisma] Slow query detected (${e.duration}ms):`, e.query);
      }
    });
  }

  return prisma;
}

/**
 * 断开 Prisma Client 连接
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * 健康检查
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Prisma] Database health check failed:', error);
    return false;
  }
}
