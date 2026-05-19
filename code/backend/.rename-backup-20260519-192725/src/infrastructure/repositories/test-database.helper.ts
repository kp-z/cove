/**
 * Test Database Helper
 *
 * 为集成测试提供独立的测试数据库环境
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class TestDatabaseHelper {
  private prisma: PrismaClient | null = null;
  private testDbPath: string = '';
  private testDir: string = '';

  /**
   * 初始化测试数据库
   */
  async setup(): Promise<PrismaClient> {
    // 创建临时目录
    this.testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cove-test-db-'));
    this.testDbPath = path.join(this.testDir, 'test.db');

    // 设置数据库 URL
    const databaseUrl = `file:${this.testDbPath}`;

    // 创建 Prisma Client
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // 连接数据库
    await this.prisma.$connect();

    // 手动创建必要的表（简化版，仅用于测试）
    await this.createTables();

    return this.prisma;
  }

  /**
   * 创建测试所需的表
   */
  private async createTables(): Promise<void> {
    if (!this.prisma) return;

    // 创建 User 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "email" TEXT NOT NULL UNIQUE,
        "displayName" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "profilePath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    // 创建 Project 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Project" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL,
        "ownerId" TEXT NOT NULL,
        "metadataPath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("ownerId") REFERENCES "User"("id")
      )
    `);

    // 创建 Channel 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Channel" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "projectId" TEXT,
        "parentChannelId" TEXT,
        "metadataPath" TEXT NOT NULL,
        "memberIds" TEXT NOT NULL DEFAULT '[]',
        "messageCount" INTEGER NOT NULL DEFAULT 0,
        "memberCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id"),
        FOREIGN KEY ("parentChannelId") REFERENCES "Channel"("id")
      )
    `);

    // 创建 Member 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Member" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "channelId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "joinedAt" DATETIME NOT NULL,
        "leftAt" DATETIME,
        FOREIGN KEY ("userId") REFERENCES "User"("id"),
        FOREIGN KEY ("channelId") REFERENCES "Channel"("id"),
        UNIQUE("userId", "channelId")
      )
    `);

    // 创建 Task 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Task" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "priority" TEXT NOT NULL,
        "projectId" TEXT,
        "assigneeId" TEXT,
        "metadataPath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      )
    `);

    // 创建 Workflow 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Workflow" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "projectId" TEXT,
        "metadataPath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      )
    `);

    // 创建 Thread 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Thread" (
        "id" TEXT PRIMARY KEY,
        "channelId" TEXT NOT NULL,
        "rootMessageId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "replyCount" INTEGER NOT NULL DEFAULT 0,
        "participants" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
      )
    `);

    // 创建 Message 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT PRIMARY KEY,
        "channelId" TEXT NOT NULL,
        "threadId" TEXT,
        "senderId" TEXT NOT NULL,
        "senderType" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "contentPath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("channelId") REFERENCES "Channel"("id"),
        FOREIGN KEY ("threadId") REFERENCES "Thread"("id")
      )
    `);
  }

  /**
   * 清理测试数据库
   */
  async teardown(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    // 删除测试目录
    if (this.testDir) {
      try {
        await fs.rm(this.testDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to cleanup test directory:', error);
      }
    }
  }

  /**
   * 清空所有表数据（保留表结构）
   */
  async clearAllTables(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }

    // 按照依赖关系的逆序删除数据
    // 使用 try-catch 来处理表不存在的情况
    try {
      await this.prisma.message.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.thread.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.task.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.member.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.channel.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.workflow.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.project.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.user.deleteMany();
    } catch (e) {
      // Table might not exist
    }
  }

  /**
   * 获取 Prisma Client
   */
  getPrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not initialized. Call setup() first.');
    }
    return this.prisma;
  }

  /**
   * 获取测试数据库路径
   */
  getDbPath(): string {
    return this.testDbPath;
  }
}
