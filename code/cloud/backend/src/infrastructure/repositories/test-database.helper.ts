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
        "status" TEXT NOT NULL DEFAULT 'active',
        "profilePath" TEXT NOT NULL,
        "passwordHash" TEXT,
        "avatarUrl" TEXT,
        "avatarType" TEXT NOT NULL DEFAULT 'dicebear',
        "avatarSeed" TEXT,
        "avatarStyle" TEXT DEFAULT 'avataaars',
        "lastLoginAt" DATETIME,
        "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
        "lockedUntil" DATETIME,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    // 创建 Project 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Project" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL,
        "ownerId" TEXT NOT NULL,
        "metadataPath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id"),
        FOREIGN KEY ("ownerId") REFERENCES "User"("id")
      )
    `);

    // 创建 Channel 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Channel" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "projectId" TEXT,
        "parentChannelId" TEXT,
        "description" TEXT,
        "icon" TEXT,
        "avatarUrl" TEXT,
        "avatarType" TEXT NOT NULL DEFAULT 'dicebear',
        "avatarSeed" TEXT,
        "avatarStyle" TEXT DEFAULT 'initials',
        "membersData" TEXT NOT NULL DEFAULT '[]',
        "agentPool" TEXT NOT NULL DEFAULT '[]',
        "taskPool" TEXT NOT NULL DEFAULT '[]',
        "conversationPool" TEXT NOT NULL DEFAULT '[]',
        "communicationRules" TEXT NOT NULL DEFAULT '{}',
        "workspace" TEXT NOT NULL DEFAULT '{}',
        "metaTags" TEXT NOT NULL DEFAULT '[]',
        "metaCategory" TEXT,
        "createdById" TEXT NOT NULL DEFAULT 'system',
        "createdByType" TEXT NOT NULL DEFAULT 'system',
        "messageCount" INTEGER NOT NULL DEFAULT 0,
        "memberCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id"),
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
        "realmId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL,
        "priority" TEXT NOT NULL,
        "projectId" TEXT NOT NULL,
        "channelId" TEXT,
        "assigneeId" TEXT,
        "detailsPath" TEXT NOT NULL,
        "dueDate" DATETIME,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id"),
        FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      )
    `);

    // 创建 Workflow 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Workflow" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "projectId" TEXT NOT NULL,
        "definitionPath" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id"),
        FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      )
    `);

    // 创建 Thread 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Thread" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "channelId" TEXT NOT NULL,
        "rootMessageId" TEXT NOT NULL UNIQUE,
        "participants" TEXT NOT NULL,
        "replyCount" INTEGER NOT NULL DEFAULT 0,
        "detailsPath" TEXT NOT NULL,
        "lastReplyAt" DATETIME,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id"),
        FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE
      )
    `);

    // 创建 Agent 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Agent" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "scope" TEXT NOT NULL DEFAULT 'user',
        "projectIds" TEXT NOT NULL DEFAULT '[]',
        "configPath" TEXT NOT NULL,
        "avatarUrl" TEXT,
        "avatarType" TEXT NOT NULL DEFAULT 'dicebear',
        "avatarSeed" TEXT,
        "avatarStyle" TEXT DEFAULT 'bottts',
        "createdBy" TEXT NOT NULL DEFAULT 'system',
        "createdAt" DATETIME NOT NULL,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id")
      )
    `);

    // 创建 Realm 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Realm" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "displayName" TEXT NOT NULL,
        "description" TEXT,
        "ownerId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "visibility" TEXT NOT NULL,
        "settings" TEXT NOT NULL,
        "limits" TEXT NOT NULL,
        "meta" TEXT,
        "logoUrl" TEXT,
        "logoType" TEXT NOT NULL DEFAULT 'dicebear',
        "logoSeed" TEXT,
        "logoStyle" TEXT DEFAULT 'shapes',
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("ownerId") REFERENCES "User"("id")
      )
    `);

    // 创建 Message 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "shortId" TEXT NOT NULL UNIQUE,
        "channelId" TEXT NOT NULL,
        "threadId" TEXT,
        "senderId" TEXT NOT NULL,
        "senderType" TEXT NOT NULL,
        "isThreadRoot" INTEGER NOT NULL DEFAULT 0,
        "contentPath" TEXT NOT NULL,
        "contentType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "isEdited" INTEGER NOT NULL DEFAULT 0,
        "reactionCount" INTEGER NOT NULL DEFAULT 0,
        "replyCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        "deletedAt" DATETIME,
        FOREIGN KEY ("realmId") REFERENCES "Realm"("id"),
        FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("threadId") REFERENCES "Message"("id")
      )
    `);

    // 创建 AuditLog 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "resourceType" TEXT NOT NULL,
        "resourceId" TEXT,
        "details" TEXT,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" DATETIME NOT NULL
      )
    `);

    // 创建 AuditLog 索引
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_idx" ON "AuditLog"("resourceType")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_resourceId_idx" ON "AuditLog"("resourceId")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")
    `);

    // 创建 Attachment 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Attachment" (
        "id" TEXT PRIMARY KEY,
        "messageId" TEXT,
        "fileName" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "mimeType" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "uploadedBy" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL
      )
    `);

    // 创建 Attachment 索引
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Attachment_messageId_idx" ON "Attachment"("messageId")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Attachment_uploadedBy_idx" ON "Attachment"("uploadedBy")
    `);

    // 创建 RealmMember 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "realm_members" (
        "id" TEXT PRIMARY KEY,
        "realm_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "custom_permissions" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "joined_at" DATETIME NOT NULL,
        "updated_at" DATETIME NOT NULL,
        "meta" TEXT,
        FOREIGN KEY ("realm_id") REFERENCES "Realm"("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
        UNIQUE("realm_id", "user_id")
      )
    `);

    // 创建 RealmMember 索引
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "realm_members_realm_id_idx" ON "realm_members"("realm_id")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "realm_members_user_id_idx" ON "realm_members"("user_id")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "realm_members_role_idx" ON "realm_members"("role")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "realm_members_status_idx" ON "realm_members"("status")
    `);

    // 创建 Device 表
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Device" (
        "id" TEXT PRIMARY KEY,
        "realmId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "displayName" TEXT,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "platform" TEXT,
        "configPath" TEXT NOT NULL,
        "lastSeenAt" DATETIME,
        "createdAt" DATETIME NOT NULL,
        "updatedAt" DATETIME NOT NULL,
        "apiKeyHash" TEXT,
        "activeTaskCount" INTEGER NOT NULL DEFAULT 0,
        "totalTasksExecuted" INTEGER NOT NULL DEFAULT 0,
        "averageTaskDuration" REAL,
        "lastExecutedAgentId" TEXT,
        "region" TEXT,
        "tags" TEXT NOT NULL DEFAULT '[]',
        "cpuUsage" REAL,
        "memoryUsage" REAL,
        UNIQUE("realmId", "name")
      )
    `);

    // 创建 Device 索引
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Device_realmId_idx" ON "Device"("realmId")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Device_name_idx" ON "Device"("name")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Device_status_idx" ON "Device"("status")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Device_type_idx" ON "Device"("type")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Device_apiKeyHash_idx" ON "Device"("apiKeyHash")
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Device_realmId_status_idx" ON "Device"("realmId", "status")
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
      await this.prisma.attachment.deleteMany();
    } catch (e) {
      // Table might not exist
    }

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
      await this.prisma.agent.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.project.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.device.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.$executeRawUnsafe('DELETE FROM "realm_members"');
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.realm.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.user.deleteMany();
    } catch (e) {
      // Table might not exist
    }

    try {
      await this.prisma.auditLog.deleteMany();
    } catch (e) {
      // Table might not exist
    }
  }

  /**
   * 创建测试用的 Realm（包括必需的 User）
   */
  async createTestRealm(realmId: string = 'test-realm', userId: string = 'user-1'): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }

    // Create test user first (skip if already exists)
    try {
      await this.prisma.user.create({
        data: {
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'user',
          status: 'active',
          profilePath: '/metadata/user-1.json',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      // User already exists, skip
      if (error.code !== 'P2002') {
        throw error;
      }
    }

    // Create test realm
    await this.prisma.realm.create({
      data: {
        id: realmId,
        name: realmId,
        displayName: 'Test Realm',
        ownerId: userId,
        status: 'active',
        visibility: 'public',
        settings: '{}',
        limits: '{}',
        meta: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
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
