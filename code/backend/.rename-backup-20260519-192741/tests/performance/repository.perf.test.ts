/**
 * Repository 性能基准测试
 *
 * 验证优化后的性能指标：
 * - findById < 10ms
 * - findByChannel < 50ms
 * - findByMember < 20ms
 * - 批量查询 100 条 < 100ms
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { HybridMessageRepository } from '../../src/infrastructure/repositories/hybrid-message.repository';
import { HybridChannelRepository } from '../../src/infrastructure/repositories/hybrid-channel.repository';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { ILogger } from '../../src/application/interfaces/logger.interface';
import { MessageEntity } from '../../src/domain/models/message/message.entity';
import { ChannelEntity } from '../../src/domain/models/channel/channel.entity';
import * as path from 'path';

// Simple mock logger for performance tests
class MockLogger implements ILogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
  child() { return this; }
  setLevel() {}
}

describe.skip('Repository Performance Benchmarks', () => {
  let prisma: PrismaClient;
  let storageService: StorageService;
  let logger: ILogger;
  let messageRepository: HybridMessageRepository;
  let channelRepository: HybridChannelRepository;

  const projectRoot = path.resolve(__dirname, '../../../');

  beforeAll(async () => {
    prisma = new PrismaClient();
    storageService = new StorageService(projectRoot);
    logger = new MockLogger();
    messageRepository = new HybridMessageRepository(prisma, storageService, logger);
    channelRepository = new HybridChannelRepository(prisma, storageService, logger);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('MessageRepository Performance', () => {
    it('findById should complete in < 10ms', async () => {
      // 创建测试消息
      const message = MessageEntity.create({
        messageId: 'perf-msg-1',
        msgShortId: 'M001',
        senderId: 'user-1',
        senderType: 'human',
        senderName: 'Test User',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        isThreadRoot: false,
        content: 'Performance test message',
        contentType: 'text',
        contentFormat: 'plain',
        attachments: [],
        mentions: [],
        references: [],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {
          client: 'test',
          isPinned: false,
          isImportant: false,
        },
      });

      await messageRepository.save(message);

      // 性能测试
      const start = Date.now();
      const result = await messageRepository.findById('perf-msg-1');
      const duration = Date.now() - start;

      expect(result).not.toBeNull();
      expect(duration).toBeLessThan(10);

      // 清理
      await messageRepository.delete('perf-msg-1');
    });

    it('findByChannel should complete in < 50ms', async () => {
      // 创建 10 条测试消息
      const messages = Array.from({ length: 10 }, (_, i) =>
        MessageEntity.create({
          messageId: `perf-msg-batch-${i}`,
          msgShortId: `M${String(i).padStart(3, '0')}`,
          senderId: 'user-1',
          senderType: 'human',
          senderName: 'Test User',
          channelId: 'perf-channel-1',
          channelName: 'Performance Channel',
          isThreadRoot: false,
          content: `Message ${i}`,
          contentType: 'text',
          contentFormat: 'plain',
          attachments: [],
          mentions: [],
          references: [],
          status: 'sent',
          isEdited: false,
          editHistory: [],
          reactions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: {
            client: 'test',
            isPinned: false,
            isImportant: false,
          },
        })
      );

      for (const msg of messages) {
        await messageRepository.save(msg);
      }

      // 性能测试
      const start = Date.now();
      const results = await messageRepository.findByChannel('perf-channel-1');
      const duration = Date.now() - start;

      expect(results.length).toBe(10);
      expect(duration).toBeLessThan(50);

      // 清理
      for (const msg of messages) {
        await messageRepository.delete(msg.messageId);
      }
    });

    it('批量查询 100 条应在 < 100ms 内完成', async () => {
      // 创建 100 条测试消息
      const messages = Array.from({ length: 100 }, (_, i) =>
        MessageEntity.create({
          messageId: `perf-msg-large-${i}`,
          msgShortId: `M${String(i).padStart(3, '0')}`,
          senderId: 'user-1',
          senderType: 'human',
          senderName: 'Test User',
          channelId: 'perf-channel-large',
          channelName: 'Large Performance Channel',
          isThreadRoot: false,
          content: `Message ${i}`,
          contentType: 'text',
          contentFormat: 'plain',
          attachments: [],
          mentions: [],
          references: [],
          status: 'sent',
          isEdited: false,
          editHistory: [],
          reactions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: {
            client: 'test',
            isPinned: false,
            isImportant: false,
          },
        })
      );

      for (const msg of messages) {
        await messageRepository.save(msg);
      }

      // 性能测试
      const start = Date.now();
      const results = await messageRepository.findByChannel('perf-channel-large');
      const duration = Date.now() - start;

      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(100);

      console.log(`批量查询 100 条消息耗时: ${duration}ms (平均 ${(duration / 100).toFixed(2)}ms/条)`);

      // 清理
      for (const msg of messages) {
        await messageRepository.delete(msg.messageId);
      }
    }, 30000); // 增加超时时间
  });

  describe('ChannelRepository Performance', () => {
    it('findByMember 应在 < 20ms 内完成（优化后）', async () => {
      // 创建测试频道
      const channel = ChannelEntity.create({
        channelId: 'perf-channel-member',
        name: 'perf-channel',
        displayName: 'Performance Channel',
        type: 'public',
        status: 'active',
        members: [
          {
            memberId: 'user-1',
            memberType: 'human',
            role: 'owner',
            joinedAt: new Date(),
          },
          {
            memberId: 'user-2',
            memberType: 'human',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {
          allowMentions: true,
          allowThreads: true,
          allowAttachments: true,
          maxMessageLength: 10000,
        },
        workspace: {
          root: '/workspace',
          sharedFiles: '/workspace/shared',
          attachments: '/workspace/attachments',
        },
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'user-1',
            type: 'human',
          },
        },
      });

      await channelRepository.save(channel);

      // 性能测试
      const start = Date.now();
      const results = await channelRepository.findByMember('user-1');
      const duration = Date.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(20);

      console.log(`findByMember 耗时: ${duration}ms`);

      // 清理
      await channelRepository.delete('perf-channel-member');
    });
  });
});
