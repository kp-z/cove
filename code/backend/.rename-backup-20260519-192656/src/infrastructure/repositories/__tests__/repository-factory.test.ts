/**
 * RepositoryFactory 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { RepositoryFactory } from '../repository-factory';
import { ILogger } from '../../../application/interfaces/logger.interface';

// Mock logger
const mockLogger: ILogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock PrismaClient
const mockPrisma = {} as PrismaClient;

describe('RepositoryFactory', () => {
  let factory: RepositoryFactory;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建工厂', () => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'RepositoryFactory initialized',
        expect.objectContaining({
          storageMode: 'local',
          localStoragePath: '.cove/storage',
        })
      );
    });

    it('应该使用自定义配置创建工厂', () => {
      factory = new RepositoryFactory(mockPrisma, mockLogger, {
        storageMode: 'cloud',
        storageRootPath: '/custom/path',
        localStoragePath: '/custom/local',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'RepositoryFactory initialized',
        expect.objectContaining({
          storageMode: 'cloud',
          storageRootPath: '/custom/path',
          localStoragePath: '/custom/local',
        })
      );
    });
  });

  describe('getProjectRepository', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该创建并缓存 ProjectRepository', () => {
      const serverId = 'server-001';
      const repo1 = factory.getProjectRepository(serverId);
      const repo2 = factory.getProjectRepository(serverId);

      expect(repo1).toBeDefined();
      expect(repo1).toBe(repo2); // 应该返回同一个实例
      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // 只创建一次
      expect(mockLogger.debug).toHaveBeenCalledWith('Created ProjectRepository', {
        serverId,
      });
    });

    it('应该为不同的 serverId 创建不同的实例', () => {
      const repo1 = factory.getProjectRepository('server-001');
      const repo2 = factory.getProjectRepository('server-002');

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).not.toBe(repo2); // 应该是不同的实例
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });
  });

  describe('getChannelRepository', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该创建并缓存 ChannelRepository', () => {
      const serverId = 'server-001';
      const repo1 = factory.getChannelRepository(serverId);
      const repo2 = factory.getChannelRepository(serverId);

      expect(repo1).toBeDefined();
      expect(repo1).toBe(repo2);
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAgentRepository', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该创建并缓存 AgentRepository', () => {
      const serverId = 'server-001';
      const repo1 = factory.getAgentRepository(serverId);
      const repo2 = factory.getAgentRepository(serverId);

      expect(repo1).toBeDefined();
      expect(repo1).toBe(repo2);
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMessageRepository', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该创建并缓存 MessageRepository', () => {
      const serverId = 'server-001';
      const repo1 = factory.getMessageRepository(serverId);
      const repo2 = factory.getMessageRepository(serverId);

      expect(repo1).toBeDefined();
      expect(repo1).toBe(repo2);
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserRepository', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该创建并缓存 UserRepository（全局单例）', () => {
      const repo1 = factory.getUserRepository('server-001');
      const repo2 = factory.getUserRepository('server-002');

      expect(repo1).toBeDefined();
      expect(repo1).toBe(repo2); // User 是全局的，应该返回同一个实例
      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // 只创建一次
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该清除指定 Server 的缓存', () => {
      const serverId = 'server-001';

      // 创建一些 Repository
      factory.getProjectRepository(serverId);
      factory.getChannelRepository(serverId);

      // 清除缓存
      factory.clearCache(serverId);

      expect(mockLogger.info).toHaveBeenCalledWith('Cleared repository cache', {
        serverId,
      });

      // 再次获取应该创建新实例
      factory.getProjectRepository(serverId);
      expect(mockLogger.debug).toHaveBeenCalledWith('Created ProjectRepository', {
        serverId,
      });
    });

    it('应该清除所有缓存', () => {
      // 创建多个 Server 的 Repository
      factory.getProjectRepository('server-001');
      factory.getProjectRepository('server-002');
      factory.getChannelRepository('server-001');

      // 清除所有缓存
      factory.clearCache();

      expect(mockLogger.info).toHaveBeenCalledWith('Cleared all repository caches');

      // 验证缓存已清空
      const stats = factory.getCacheStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger);
    });

    it('应该返回正确的缓存统计信息', () => {
      // 初始状态
      let stats = factory.getCacheStats();
      expect(stats.total).toBe(0);

      // 创建一些 Repository
      factory.getProjectRepository('server-001');
      factory.getProjectRepository('server-002');
      factory.getChannelRepository('server-001');
      factory.getAgentRepository('server-001');
      factory.getUserRepository('server-001');

      stats = factory.getCacheStats();
      expect(stats.projectRepos).toBe(2);
      expect(stats.channelRepos).toBe(1);
      expect(stats.agentRepos).toBe(1);
      expect(stats.messageRepos).toBe(0);
      expect(stats.userRepos).toBe(1);
      expect(stats.total).toBe(5);
    });
  });

  describe('存储模式', () => {
    it('local 模式应该使用本地存储路径', () => {
      factory = new RepositoryFactory(mockPrisma, mockLogger, {
        storageMode: 'local',
        localStoragePath: '/custom/local',
      });

      // 通过创建 Repository 来验证存储路径
      factory.getProjectRepository('server-001');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'RepositoryFactory initialized',
        expect.objectContaining({
          storageMode: 'local',
          localStoragePath: '/custom/local',
        })
      );
    });

    it('cloud 模式应该使用云端存储路径', () => {
      factory = new RepositoryFactory(mockPrisma, mockLogger, {
        storageMode: 'cloud',
        storageRootPath: '/data/servers',
      });

      factory.getProjectRepository('server-001');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'RepositoryFactory initialized',
        expect.objectContaining({
          storageMode: 'cloud',
          storageRootPath: '/data/servers',
        })
      );
    });
  });

  describe('多 Server 场景', () => {
    beforeEach(() => {
      factory = new RepositoryFactory(mockPrisma, mockLogger, {
        storageMode: 'cloud',
      });
    });

    it('应该为每个 Server 创建独立的 Repository 实例', () => {
      const repo1 = factory.getProjectRepository('server-001');
      const repo2 = factory.getProjectRepository('server-002');
      const repo3 = factory.getProjectRepository('server-003');

      expect(repo1).not.toBe(repo2);
      expect(repo2).not.toBe(repo3);
      expect(repo1).not.toBe(repo3);

      const stats = factory.getCacheStats();
      expect(stats.projectRepos).toBe(3);
    });

    it('应该能够独立清除每个 Server 的缓存', () => {
      factory.getProjectRepository('server-001');
      factory.getProjectRepository('server-002');
      factory.getProjectRepository('server-003');

      // 清除 server-002 的缓存
      factory.clearCache('server-002');

      const stats = factory.getCacheStats();
      expect(stats.projectRepos).toBe(2); // server-001 和 server-003 仍在缓存中
    });
  });
});
