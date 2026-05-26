/**
 * RealmConfigRepository - Realm 配置文件管理
 *
 * 负责读写 .cove/server.json 配置文件
 * 支持本地模式和云端模式的路径切换
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { RealmEntity, RealmEntityJSON } from '../../domain/models/realm/realm.entity';

export interface RealmConfigRepositoryOptions {
  /**
   * 存储模式
   * - local: 本地模式，使用 .cove/server.json
   * - cloud: 云端模式，使用 /data/servers/{realmId}/server.json
   */
  readonly mode: 'local' | 'cloud';

  /**
   * 本地模式的根目录（默认：项目根目录）
   */
  readonly localRoot?: string;

  /**
   * 云端模式的根目录（默认：/data/servers）
   */
  readonly cloudRoot?: string;
}

/**
 * RealmConfigRepository
 *
 * 管理 Realm 配置文件的读写
 */
export class RealmConfigRepository {
  private readonly mode: 'local' | 'cloud';
  private readonly localRoot: string;
  private readonly cloudRoot: string;

  constructor(options: RealmConfigRepositoryOptions) {
    this.mode = options.mode;
    this.localRoot = options.localRoot || process.cwd();
    this.cloudRoot = options.cloudRoot || '/data/servers';
  }

  /**
   * 获取配置文件路径
   */
  private getConfigPath(realmId?: string): string {
    if (this.mode === 'local') {
      return path.join(this.localRoot, '.cove', 'server.json');
    } else {
      if (!realmId) {
        throw new Error('realmId is required in cloud mode');
      }
      return path.join(this.cloudRoot, realmId, 'server.json');
    }
  }

  /**
   * 读取 Realm 配置
   *
   * @param realmId - Server ID（云端模式必需）
   * @returns RealmEntity 或 null（如果配置不存在）
   */
  async load(realmId?: string): Promise<RealmEntity | null> {
    const configPath = this.getConfigPath(realmId);

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const json = JSON.parse(content) as RealmEntityJSON;
      return RealmEntity.fromJSON(json);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load server config: ${error.message}`);
    }
  }

  /**
   * 保存 Realm 配置
   *
   * @param server - RealmEntity
   */
  async save(server: RealmEntity): Promise<void> {
    const configPath = this.getConfigPath(server.realm_id);
    const json = server.toJSON();

    // 确保目录存在
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });

    // 写入配置文件
    await fs.writeFile(configPath, JSON.stringify(json, null, 2), 'utf-8');
  }

  /**
   * 删除 Realm 配置
   *
   * @param realmId - Server ID
   */
  async delete(realmId: string): Promise<void> {
    const configPath = this.getConfigPath(realmId);

    try {
      await fs.unlink(configPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete server config: ${error.message}`);
      }
    }
  }

  /**
   * 检查配置是否存在
   *
   * @param realmId - Server ID（云端模式必需）
   */
  async exists(realmId?: string): Promise<boolean> {
    const configPath = this.getConfigPath(realmId);

    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 列出所有 Realm 配置（仅云端模式）
   *
   * @returns Server ID 列表
   */
  async listAll(): Promise<string[]> {
    if (this.mode === 'local') {
      throw new Error('listAll() is only available in cloud mode');
    }

    try {
      const entries = await fs.readdir(this.cloudRoot, { withFileTypes: true });
      const realmIds: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(this.cloudRoot, entry.name, 'server.json');
          try {
            await fs.access(configPath);
            realmIds.push(entry.name);
          } catch {
            // 跳过没有 server.json 的目录
          }
        }
      }

      return realmIds;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to list realms: ${error.message}`);
    }
  }
}
