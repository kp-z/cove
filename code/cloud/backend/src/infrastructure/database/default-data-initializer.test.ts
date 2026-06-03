/**
 * DefaultDataInitializer 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultDataInitializer } from './default-data-initializer';
import { PrismaClient } from '../../../generated/client';
import { ILogger } from '../../application/interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises');

describe('DefaultDataInitializer', () => {
  let initializer: DefaultDataInitializer;
  let mockPrisma: any;
  let mockLogger: ILogger;
  const testStorageRoot = '/test/storage';

  beforeEach(() => {
    // Mock Prisma Client
    mockPrisma = {
      realm: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      realmMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      agent: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      channel: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      message: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      device: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    // Mock fs functions
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    initializer = new DefaultDataInitializer({
      prisma: mockPrisma as unknown as PrismaClient,
      logger: mockLogger,
      storageRoot: testStorageRoot,
    });
  });

  describe('initialize', () => {
    it('should skip initialization if Nexus realm already exists', async () => {
      // Arrange
      mockPrisma.realm.upsert.mockResolvedValue({
        id: 'realm-nexus',
        name: 'nexus',
      });
      mockPrisma.device.findUnique.mockResolvedValue({
        id: 'device-realm-nexus',
        realmId: 'realm-nexus',
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-admin',
        role: 'owner',
      });
      mockPrisma.realmMember.findUnique.mockResolvedValue({
        id: 'member-nexus-user-admin',
        realmId: 'realm-nexus',
        userId: 'user-admin',
      });
      mockPrisma.channel.findUnique.mockResolvedValue({
        id: 'channel-nexus-general',
        name: 'general',
      });
      mockPrisma.channel.update.mockResolvedValue({
        id: 'channel-nexus-general',
        name: 'general',
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', content: 'Welcome' }
      ]);
      mockPrisma.realmMember.findMany.mockResolvedValue([]);

      // Act
      await initializer.initialize();

      // Assert
      expect(mockPrisma.realm.upsert).toHaveBeenCalledWith({
        where: { id: 'realm-nexus' },
        update: expect.any(Object),
        create: expect.any(Object),
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting default data initialization...'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Default realm already exists',
        { realmId: 'realm-nexus' }
      );
    });

    it('should create Nexus realm with default channels and members', async () => {
      // Arrange
      mockPrisma.realm.findUnique.mockResolvedValue(null);
      mockPrisma.realm.upsert.mockResolvedValue({
        id: 'realm-nexus',
        name: 'nexus',
      });
      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'device-realm-nexus',
        realmId: 'realm-nexus',
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-admin',
        role: 'owner',
      });
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: 'agent-zhang',
        name: 'zhang',
      });
      mockPrisma.agent.findMany.mockResolvedValue([]);
      mockPrisma.channel.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      // Act
      await initializer.initialize();

      // Assert
      // 1. Should upsert Nexus realm
      expect(mockPrisma.realm.upsert).toHaveBeenCalledWith({
        where: { id: 'realm-nexus' },
        update: expect.objectContaining({
          displayName: 'Nexus',
          description: 'The central hub connecting all realms',
        }),
        create: expect.objectContaining({
          id: 'realm-nexus',
          name: 'nexus',
          displayName: 'Nexus',
          description: 'The central hub connecting all realms',
          visibility: 'public',
          status: 'active',
        }),
      });

      // 2. Should create device for Nexus realm
      expect(mockPrisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'device-realm-nexus',
          realmId: 'realm-nexus',
          name: 'nexus-device',
          type: 'virtual',
          status: 'provisioning',
        }),
      });

      // 3. Should add only admin as member (agents are not realm members)
      expect(mockPrisma.realmMember.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.realmMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          realmId: 'realm-nexus',
          userId: 'user-admin',
          role: 'owner',
          status: 'active',
        }),
      });

      // 4. Should create default channels (#general, #welcome)
      expect(mockPrisma.channel.create).toHaveBeenCalledTimes(2);

      // 5. Should send welcome message
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channelId: 'channel-nexus-welcome',
          senderId: 'agent-zhang',
          senderType: 'agent',
          contentType: 'text',
          status: 'sent',
        }),
      });
    });

    it('should create message content file for welcome message', async () => {
      // Arrange
      mockPrisma.realm.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-admin',
        role: 'owner',
      });
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: 'agent-zhang',
        name: 'zhang',
      });
      mockPrisma.agent.findMany.mockResolvedValue([]);
      mockPrisma.channel.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      // Act
      await initializer.initialize();

      // Assert
      // Should create welcome message content file
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('messages/msg-welcome-'),
        expect.stringContaining('欢迎来到 Cove'),
        'utf-8'
      );

      // Should create message directory
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('messages'),
        { recursive: true }
      );
    });

    it('should create message directory', async () => {
      // Arrange
      mockPrisma.realm.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-admin',
        role: 'owner',
      });
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: 'agent-zhang',
        name: 'zhang',
      });
      mockPrisma.agent.findMany.mockResolvedValue([]);
      mockPrisma.channel.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      // Act
      await initializer.initialize();

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('messages'),
        { recursive: true }
      );
    });

    it('should handle missing admin user gracefully', async () => {
      // Arrange
      mockPrisma.realm.findUnique.mockResolvedValue(null);
      mockPrisma.realm.upsert.mockResolvedValue({
        id: 'realm-nexus',
        name: 'nexus',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null); // No admin user
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: 'agent-zhang',
        name: 'zhang',
      });
      mockPrisma.agent.findMany.mockResolvedValue([]);
      mockPrisma.channel.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findUnique.mockResolvedValue(null);
      mockPrisma.realmMember.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      // Act
      await initializer.initialize();

      // Assert
      // Should still upsert realm and create channels
      expect(mockPrisma.realm.upsert).toHaveBeenCalled();
      expect(mockPrisma.channel.create).toHaveBeenCalledTimes(2);

      // Should NOT add any members (no admin, agents are not realm members)
      expect(mockPrisma.realmMember.create).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Admin user not found, skipping admin member creation'
      );
    });

    it('should log errors if initialization fails', async () => {
      // Arrange
      const testError = new Error('Database error');
      mockPrisma.realm.upsert.mockRejectedValue(testError);

      // Act & Assert
      await expect(initializer.initialize()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize default data',
        testError
      );
    });
  });

  describe('ensureNexusDevice', () => {
    it('should create device for Nexus realm if not exists', async () => {
      // Arrange
      mockPrisma.realm.upsert.mockResolvedValue({
        id: 'realm-nexus',
        name: 'nexus',
      });
      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'device-realm-nexus',
        realmId: 'realm-nexus',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.agent.findMany.mockResolvedValue([]);
      mockPrisma.channel.findUnique.mockResolvedValue({
        id: 'channel-nexus-general',
        name: 'general',
      });
      mockPrisma.channel.update.mockResolvedValue({
        id: 'channel-nexus-general',
        name: 'general',
      });
      mockPrisma.realmMember.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', content: 'Welcome' }
      ]);

      // Act
      await initializer.initialize();

      // Assert
      expect(mockPrisma.device.findUnique).toHaveBeenCalledWith({
        where: { realmId: 'realm-nexus' },
      });

      expect(mockPrisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'device-realm-nexus',
          realmId: 'realm-nexus',
          name: 'nexus-device',
          displayName: 'Device for Nexus',
          type: 'virtual',
          status: 'provisioning',
          platform: null,
          apiKeyHash: null,
          activeTaskCount: 0,
          totalTasksExecuted: 0,
        }),
      });

      // Should create device config file
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('devices/device-realm-nexus.json'),
        expect.stringContaining('Auto-generated device for Nexus realm'),
        'utf-8'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Nexus device created successfully',
        expect.objectContaining({
          deviceId: 'device-realm-nexus',
          realmId: 'realm-nexus',
        })
      );
    });

    it('should skip device creation if already exists', async () => {
      // Arrange
      mockPrisma.realm.upsert.mockResolvedValue({
        id: 'realm-nexus',
        name: 'nexus',
      });
      mockPrisma.device.findUnique.mockResolvedValue({
        id: 'device-realm-nexus',
        realmId: 'realm-nexus',
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.agent.findMany.mockResolvedValue([]);
      mockPrisma.channel.findUnique.mockResolvedValue({
        id: 'channel-nexus-general',
        name: 'general',
      });
      mockPrisma.channel.update.mockResolvedValue({
        id: 'channel-nexus-general',
        name: 'general',
      });
      mockPrisma.realmMember.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', content: 'Welcome' }
      ]);

      // Act
      await initializer.initialize();

      // Assert
      expect(mockPrisma.device.create).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Nexus device already exists',
        expect.objectContaining({
          deviceId: 'device-realm-nexus',
          realmId: 'realm-nexus',
        })
      );
    });

    it('should handle device creation errors', async () => {
      // Arrange
      mockPrisma.realm.upsert.mockResolvedValue({
        id: 'realm-nexus',
        name: 'nexus',
      });
      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.create.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(initializer.initialize()).rejects.toThrow('DB error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize default data',
        expect.any(Error)
      );
    });
  });
});
