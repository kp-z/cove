/**
 * ServerConfigRepository - Server 配置文件管理
 *
 * 负责读写 .cove/server.json 配置文件
 * 支持本地模式和云端模式的路径切换
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerEntity, ServerEntityJSON } from '../../domain/models/server/server.entity';

export interface ServerConfigRepositoryOptions {
  /**
   * 存储模式
   * - local: 本地模式，使用 .cove/server.json
   * - cloud: 云端模式，使用 /data/servers/{serverId}/server.json
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
 * ServerConfigRepository
 *
 * 管理 Server 配置文件的读写
 */
export class ServerConfigRepository {
  private readonly mode: 'local' | 'cloud';
  private readonly localRoot: string;
  private readonly cloudRoot: string;

  constructor(options: ServerConfigRepositoryOptions) {
    this.mode = options.mode;
    this.localRoot = options.localRoot || process.cwd();
    this.cloudRoot = options.cloudRoot || '/data/servers';
  }

  /**
   * 获取配置文件路径
   */
  private getConfigPath(serverId?: string): string {
    if (this.mode === 'local') {
      return path.join(this.localRoot, '.cove', 'server.json');
    } else {
      if (!serverId) {
        throw new Error('serverId is required in cloud mode');
      }
      return path.join(this.cloudRoot, serverId, 'server.json');
    }
  }

  /**
   * 读取 Server 配置
   *
   * @param serverId - Server ID（云端模式必需）
   * @returns ServerEntity 或 null（如果配置不存在）
   */
  async load(serverId?: string): Promise<ServerEntity | null> {
    const configPath = this.getConfigPath(serverId);

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const json = JSON.parse(content) as ServerEntityJSON;
      return ServerEntity.fromJSON(json);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load server config: ${error.message}`);
    }
  }

  /**
   * 保存 Server 配置
   *
   * @param server - ServerEntity
   */
  async save(server: ServerEntity): Promise<void> {
    const configPath = this.getConfigPath(server.server_id);
    const json = server.toJSON();

    // 确保目录存在
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });

    // 写入配置文件
    await fs.writeFile(configPath, JSON.stringify(json, null, 2), 'utf-8');
  }

  /**
   * 删除 Server 配置
   *
   * @param serverId - Server ID
   */
  async delete(serverId: string): Promise<void> {
    const configPath = this.getConfigPath(serverId);

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
   * @param serverId - Server ID（云端模式必需）
   */
  async exists(serverId?: string): Promise<boolean> {
    const configPath = this.getConfigPath(serverId);

    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 列出所有 Server 配置（仅云端模式）
   *
   * @returns Server ID 列表
   */
  async listAll(): Promise<string[]> {
    if (this.mode === 'local') {
      throw new Error('listAll() is only available in cloud mode');
    }

    try {
      const entries = await fs.readdir(this.cloudRoot, { withFileTypes: true });
      const serverIds: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(this.cloudRoot, entry.name, 'server.json');
          try {
            await fs.access(configPath);
            serverIds.push(entry.name);
          } catch {
            // 跳过没有 server.json 的目录
          }
        }
      }

      return serverIds;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to list servers: ${error.message}`);
    }
  }
}
