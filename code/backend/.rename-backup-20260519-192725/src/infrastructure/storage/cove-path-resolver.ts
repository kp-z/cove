/**
 * CovePathResolver - .cove 目录路径解析工具
 *
 * 提供统一的路径解析方法，用于访问 .cove 目录中的各种资源
 */

import path from 'path';
import os from 'os';

export class CovePathResolver {
  /**
   * 获取项目的 .cove 根目录
   */
  static getCoveRoot(projectRoot: string): string {
    return path.join(projectRoot, '.cove');
  }

  /**
   * 获取全局 .cove 目录（用户主目录）
   */
  static getGlobalCoveRoot(): string {
    return path.join(os.homedir(), '.cove');
  }

  static getAgentRoot(): string {
    return path.join(this.getGlobalCoveRoot(), 'agents');
  }

  static getAgentDir(agentId: string): string {
    return path.join(this.getAgentRoot(), agentId);
  }

  /**
   * 获取数据库文件路径
   */
  static getDatabasePath(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'database', 'cove.db');
  }

  /**
   * 获取全局数据库路径
   */
  static getGlobalDatabasePath(): string {
    return path.join(this.getGlobalCoveRoot(), 'database', 'global.db');
  }

  /**
   * 获取存储根目录
   */
  static getStorageRoot(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'storage');
  }

  /**
   * 获取特定实体类型的存储目录
   */
  static getStorageDir(projectRoot: string, entityType: string): string {
    return path.join(this.getStorageRoot(projectRoot), entityType);
  }

  /**
   * 获取文件路径
   * @param projectRoot 项目根目录
   * @param entityType 实体类型（messages, channels, users 等）
   * @param entityId 实体 ID
   * @param ext 文件扩展名（默认 json）
   */
  static getFilePath(
    projectRoot: string,
    entityType: string,
    entityId: string,
    ext: string = 'json'
  ): string {
    return path.join(
      this.getStorageDir(projectRoot, entityType),
      `${entityId}.${ext}`
    );
  }

  /**
   * 获取附件路径
   */
  static getAttachmentPath(
    projectRoot: string,
    attachmentId: string,
    ext: string
  ): string {
    return path.join(
      this.getStorageDir(projectRoot, 'attachments'),
      `${attachmentId}.${ext}`
    );
  }

  /**
   * 获取 Agent 工作目录
   */
  static getAgentWorkspace(projectRoot: string, agentId: string): string {
    return path.join(
      this.getStorageDir(projectRoot, 'agents'),
      agentId
    );
  }

  /**
   * 获取缓存目录
   */
  static getCacheDir(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'cache');
  }

  /**
   * 获取日志目录
   */
  static getLogsDir(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'logs');
  }

  /**
   * 获取临时目录
   */
  static getTempDir(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'temp');
  }

  /**
   * 获取配置目录
   */
  static getConfigDir(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'config');
  }

  /**
   * 获取元数据目录
   */
  static getMetadataDir(projectRoot: string): string {
    return path.join(this.getCoveRoot(projectRoot), 'metadata');
  }

  /**
   * 从文件路径提取实体 ID
   */
  static extractEntityId(filePath: string): string {
    const basename = path.basename(filePath);
    return basename.substring(0, basename.lastIndexOf('.'));
  }

  /**
   * 获取相对于 .cove 的路径（用于存储在数据库中）
   */
  static getRelativePath(projectRoot: string, absolutePath: string): string {
    const coveRoot = this.getCoveRoot(projectRoot);
    return path.relative(coveRoot, absolutePath);
  }

  /**
   * 从相对路径获取绝对路径
   */
  static getAbsolutePath(projectRoot: string, relativePath: string): string {
    const coveRoot = this.getCoveRoot(projectRoot);
    return path.join(coveRoot, relativePath);
  }
}
