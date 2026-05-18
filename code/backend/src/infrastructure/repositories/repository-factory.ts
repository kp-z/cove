/**
 * RepositoryFactory - Repository 工厂类
 *
 * 职责：
 * - 管理 Repository 实例的创建和缓存
 * - 支持多 Server 数据隔离（为云端部署做准备）
 * - 根据 serverId 动态切换存储路径
 *
 * 设计理念：
 * - 当前（本地）：单 Server，返回同一个 Repository 实例
 * - 未来（云端）：多 Server，每个 serverId 对应独立的 Repository 实例
 */

import { PrismaClient } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';
import { HybridProjectRepository } from './hybrid-project.repository';
import { HybridChannelRepository } from './hybrid-channel.repository';
import { HybridAgentRepository } from './hybrid-agent.repository';
import { HybridMessageRepository } from './hybrid-message.repository';
import { HybridUserRepository } from './hybrid-user.repository';

/**
 * 存储模式
 * - local: 本地模式，一个 .cove 对应一个 Server
 * - cloud: 云端模式，多个 Server 数据隔离
 */
export type StorageMode = 'local' | 'cloud';

/**
 * RepositoryFactory 配置
 */
export interface RepositoryFactoryConfig {
  /**
   * 存储模式
   * @default 'local'
   */
  storageMode?: StorageMode;

  /**
   * 存储根路径（仅在 cloud 模式下使用）
   * @default '/data/servers'
   */
  storageRootPath?: string;

  /**
   * 本地存储路径（仅在 local 模式下使用）
   * @default '.cove/storage'
   */
  localStoragePath?: string;
}

/**
 * RepositoryFactory
 *
 * 工厂模式管理 Repository 实例，支持多 Server 数据隔离
 */
export class RepositoryFactory {
  private readonly storageMode: StorageMode;
  private readonly storageRootPath: string;
  private readonly localStoragePath: string;

  // Repository 实例缓存（按 serverId 缓存）
  private projectRepos = new Map<string, HybridProjectRepository>();
  private channelRepos = new Map<string, HybridChannelRepository>();
  private agentRepos = new Map<string, HybridAgentRepository>();
  private messageRepos = new Map<string, HybridMessageRepository>();
  private userRepos = new Map<string, HybridUserRepository>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger,
    config: RepositoryFactoryConfig = {}
  ) {
    this.storageMode = config.storageMode || 'local';
    this.storageRootPath = config.storageRootPath || '/data/servers';
    this.localStoragePath = config.localStoragePath || '.cove/storage';

    this.logger.info('RepositoryFactory initialized', {
      storageMode: this.storageMode,
      storageRootPath: this.storageRootPath,
      localStoragePath: this.localStoragePath,
    });
  }

  /**
   * 获取存储根路径
   *
   * @param serverId - Server ID
   * @returns 存储根路径
   *
   * 当前（local 模式）：返回 .cove/storage
   * 未来（cloud 模式）：返回 /data/servers/{serverId}/storage
   */
  private getStorageRoot(serverId: string): string {
    if (this.storageMode === 'local') {
      // 本地模式：一个 .cove 对应一个 Server
      return this.localStoragePath;
    } else {
      // 云端模式：每个 Server 独立的存储路径
      return `${this.storageRootPath}/${serverId}/storage`;
    }
  }

  /**
   * 创建 StorageService 实例
   *
   * @param serverId - Server ID
   * @returns StorageService 实例
   */
  private createStorageService(serverId: string): StorageService {
    const storageRoot = this.getStorageRoot(serverId);
    return new StorageService(storageRoot);
  }

  // ============================================
  // Repository 获取方法
  // ============================================

  /**
   * 获取 ProjectRepository
   *
   * @param serverId - Server ID
   * @returns ProjectRepository 实例
   */
  getProjectRepository(serverId: string): HybridProjectRepository {
    if (!this.projectRepos.has(serverId)) {
      const storage = this.createStorageService(serverId);
      this.projectRepos.set(
        serverId,
        new HybridProjectRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created ProjectRepository', { serverId });
    }
    return this.projectRepos.get(serverId)!;
  }

  /**
   * 获取 ChannelRepository
   *
   * @param serverId - Server ID
   * @returns ChannelRepository 实例
   */
  getChannelRepository(serverId: string): HybridChannelRepository {
    if (!this.channelRepos.has(serverId)) {
      const storage = this.createStorageService(serverId);
      this.channelRepos.set(
        serverId,
        new HybridChannelRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created ChannelRepository', { serverId });
    }
    return this.channelRepos.get(serverId)!;
  }

  /**
   * 获取 AgentRepository
   *
   * @param serverId - Server ID
   * @returns AgentRepository 实例
   */
  getAgentRepository(serverId: string): HybridAgentRepository {
    if (!this.agentRepos.has(serverId)) {
      const storage = this.createStorageService(serverId);
      const storageRoot = this.getStorageRoot(serverId);
      this.agentRepos.set(
        serverId,
        new HybridAgentRepository(this.prisma, storage, this.logger, storageRoot)
      );
      this.logger.debug('Created AgentRepository', { serverId });
    }
    return this.agentRepos.get(serverId)!;
  }

  /**
   * 获取 MessageRepository
   *
   * @param serverId - Server ID
   * @returns MessageRepository 实例
   */
  getMessageRepository(serverId: string): HybridMessageRepository {
    if (!this.messageRepos.has(serverId)) {
      const storage = this.createStorageService(serverId);
      this.messageRepos.set(
        serverId,
        new HybridMessageRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created MessageRepository', { serverId });
    }
    return this.messageRepos.get(serverId)!;
  }

  /**
   * 获取 UserRepository
   *
   * 注意：User 是全局的，不属于某个 Server
   * 但为了统一接口，仍然接受 serverId 参数
   *
   * @param serverId - Server ID（User 不使用此参数）
   * @returns UserRepository 实例
   */
  getUserRepository(serverId: string): HybridUserRepository {
    // User 是全局的，使用固定的 'global' 作为 key
    const key = 'global';
    if (!this.userRepos.has(key)) {
      const storage = this.createStorageService(serverId);
      this.userRepos.set(
        key,
        new HybridUserRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created UserRepository', { serverId });
    }
    return this.userRepos.get(key)!;
  }

  // ============================================
  // 缓存管理
  // ============================================

  /**
   * 清除指定 Server 的 Repository 缓存
   *
   * @param serverId - Server ID，如果不提供则清除所有缓存
   */
  clearCache(serverId?: string): void {
    if (serverId) {
      this.projectRepos.delete(serverId);
      this.channelRepos.delete(serverId);
      this.agentRepos.delete(serverId);
      this.messageRepos.delete(serverId);
      this.logger.info('Cleared repository cache', { serverId });
    } else {
      this.projectRepos.clear();
      this.channelRepos.clear();
      this.agentRepos.clear();
      this.messageRepos.clear();
      this.userRepos.clear();
      this.logger.info('Cleared all repository caches');
    }
  }

  /**
   * 获取缓存统计信息
   *
   * @returns 缓存统计信息
   */
  getCacheStats(): {
    projectRepos: number;
    channelRepos: number;
    agentRepos: number;
    messageRepos: number;
    userRepos: number;
    total: number;
  } {
    return {
      projectRepos: this.projectRepos.size,
      channelRepos: this.channelRepos.size,
      agentRepos: this.agentRepos.size,
      messageRepos: this.messageRepos.size,
      userRepos: this.userRepos.size,
      total:
        this.projectRepos.size +
        this.channelRepos.size +
        this.agentRepos.size +
        this.messageRepos.size +
        this.userRepos.size,
    };
  }
}
