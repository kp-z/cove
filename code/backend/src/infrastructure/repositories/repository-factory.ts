/**
 * RepositoryFactory - Repository 工厂类
 *
 * 职责：
 * - 管理 Repository 实例的创建和缓存
 * - 支持多 Server 数据隔离（为云端部署做准备）
 * - 根据 realmId 动态切换存储路径
 *
 * 设计理念：
 * - 当前（本地）：单 Server，返回同一个 Repository 实例
 * - 未来（云端）：多 Server，每个 realmId 对应独立的 Repository 实例
 */

import { PrismaClient } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';
import { HybridProjectRepository } from './hybrid-project.repository';
import { HybridChannelRepository } from './hybrid-channel.repository';
import { HybridAgentRepository } from './hybrid-agent.repository';
import { HybridMessageRepository } from './hybrid-message.repository';
import { HybridUserRepository } from './hybrid-user.repository';
import { HybridRealmMemberRepository } from './hybrid-realm-member.repository';

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

  // Repository 实例缓存（按 realmId 缓存）
  private projectRepos = new Map<string, HybridProjectRepository>();
  private channelRepos = new Map<string, HybridChannelRepository>();
  private agentRepos = new Map<string, HybridAgentRepository>();
  private messageRepos = new Map<string, HybridMessageRepository>();
  private userRepos = new Map<string, HybridUserRepository>();
  private serverMemberRepos = new Map<string, HybridRealmMemberRepository>();

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
   * @param realmId - Server ID
   * @returns 存储根路径
   *
   * 当前（local 模式）：返回 .cove/storage
   * 未来（cloud 模式）：返回 /data/servers/{realmId}/storage
   */
  private getStorageRoot(realmId: string): string {
    if (this.storageMode === 'local') {
      // 本地模式：一个 .cove 对应一个 Server
      return this.localStoragePath;
    } else {
      // 云端模式：每个 Server 独立的存储路径
      return `${this.storageRootPath}/${realmId}/storage`;
    }
  }

  /**
   * 创建 StorageService 实例
   *
   * @param realmId - Server ID
   * @returns StorageService 实例
   */
  private createStorageService(realmId: string): StorageService {
    const storageRoot = this.getStorageRoot(realmId);
    return new StorageService(storageRoot);
  }

  // ============================================
  // Repository 获取方法
  // ============================================

  /**
   * 获取 ProjectRepository
   *
   * @param realmId - Server ID
   * @returns ProjectRepository 实例
   */
  getProjectRepository(realmId: string): HybridProjectRepository {
    if (!this.projectRepos.has(realmId)) {
      const storage = this.createStorageService(realmId);
      this.projectRepos.set(
        realmId,
        new HybridProjectRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created ProjectRepository', { realmId });
    }
    return this.projectRepos.get(realmId)!;
  }

  /**
   * 获取 ChannelRepository
   *
   * @param realmId - Server ID
   * @returns ChannelRepository 实例
   */
  getChannelRepository(realmId: string): HybridChannelRepository {
    if (!this.channelRepos.has(realmId)) {
      const storage = this.createStorageService(realmId);
      this.channelRepos.set(
        realmId,
        new HybridChannelRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created ChannelRepository', { realmId });
    }
    return this.channelRepos.get(realmId)!;
  }

  /**
   * 获取 AgentRepository
   *
   * @param realmId - Server ID
   * @returns AgentRepository 实例
   */
  getAgentRepository(realmId: string): HybridAgentRepository {
    if (!this.agentRepos.has(realmId)) {
      const storage = this.createStorageService(realmId);
      const storageRoot = this.getStorageRoot(realmId);
      this.agentRepos.set(
        realmId,
        new HybridAgentRepository(this.prisma, storage, this.logger, storageRoot)
      );
      this.logger.debug('Created AgentRepository', { realmId });
    }
    return this.agentRepos.get(realmId)!;
  }

  /**
   * 获取 MessageRepository
   *
   * @param realmId - Server ID
   * @returns MessageRepository 实例
   */
  getMessageRepository(realmId: string): HybridMessageRepository {
    if (!this.messageRepos.has(realmId)) {
      const storage = this.createStorageService(realmId);
      this.messageRepos.set(
        realmId,
        new HybridMessageRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created MessageRepository', { realmId });
    }
    return this.messageRepos.get(realmId)!;
  }

  /**
   * 获取 UserRepository
   *
   * 注意：User 是全局的，不属于某个 Server
   * 但为了统一接口，仍然接受 realmId 参数
   *
   * @param realmId - Server ID（User 不使用此参数）
   * @returns UserRepository 实例
   */
  getUserRepository(realmId: string): HybridUserRepository {
    // User 是全局的，使用固定的 'global' 作为 key
    const key = 'global';
    if (!this.userRepos.has(key)) {
      const storage = this.createStorageService(realmId);
      this.userRepos.set(
        key,
        new HybridUserRepository(this.prisma, storage, this.logger)
      );
      this.logger.debug('Created UserRepository', { realmId });
    }
    return this.userRepos.get(key)!;
  }

  /**
   * 获取 ServerMemberRepository
   *
   * @param realmId - Server ID
   * @returns ServerMemberRepository 实例
   */
  getServerMemberRepository(realmId: string): HybridRealmMemberRepository {
    if (!this.serverMemberRepos.has(realmId)) {
      const storage = this.createStorageService(realmId);
      this.serverMemberRepos.set(
        realmId,
        new HybridRealmMemberRepository(this.prisma, storage, this.logger, realmId)
      );
      this.logger.debug('Created ServerMemberRepository', { realmId });
    }
    return this.serverMemberRepos.get(realmId)!;
  }

  // ============================================
  // 缓存管理
  // ============================================

  /**
   * 清除指定 Server 的 Repository 缓存
   *
   * @param realmId - Server ID，如果不提供则清除所有缓存
   */
  clearCache(realmId?: string): void {
    if (realmId) {
      this.projectRepos.delete(realmId);
      this.channelRepos.delete(realmId);
      this.agentRepos.delete(realmId);
      this.messageRepos.delete(realmId);
      this.serverMemberRepos.delete(realmId);
      this.logger.info('Cleared repository cache', { realmId });
    } else {
      this.projectRepos.clear();
      this.channelRepos.clear();
      this.agentRepos.clear();
      this.messageRepos.clear();
      this.userRepos.clear();
      this.serverMemberRepos.clear();
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
    serverMemberRepos: number;
    total: number;
  } {
    return {
      projectRepos: this.projectRepos.size,
      channelRepos: this.channelRepos.size,
      agentRepos: this.agentRepos.size,
      messageRepos: this.messageRepos.size,
      userRepos: this.userRepos.size,
      serverMemberRepos: this.serverMemberRepos.size,
      total:
        this.projectRepos.size +
        this.channelRepos.size +
        this.agentRepos.size +
        this.messageRepos.size +
        this.userRepos.size +
        this.serverMemberRepos.size,
    };
  }
}
