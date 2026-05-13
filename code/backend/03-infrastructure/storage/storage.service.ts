/**
 * StorageService - 文件存储服务
 *
 * 负责将实体内容保存到文件系统，支持 JSON 和二进制文件
 */

import fs from 'fs/promises';
import path from 'path';
import { CovePathResolver } from './cove-path-resolver.js';

export class StorageService {
  constructor(
    private readonly projectRoot: string
  ) {}

  /**
   * 保存 JSON 内容到文件
   * @returns 相对于 .cove 的文件路径
   */
  async saveJson(
    entityType: string,
    entityId: string,
    content: any
  ): Promise<string> {
    const filePath = CovePathResolver.getFilePath(
      this.projectRoot,
      entityType,
      entityId,
      'json'
    );

    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 写入文件（格式化 JSON）
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');

    // 返回相对路径
    return CovePathResolver.getRelativePath(this.projectRoot, filePath);
  }

  /**
   * 从文件加载 JSON 内容
   */
  async loadJson(relativePath: string): Promise<any> {
    const absolutePath = CovePathResolver.getAbsolutePath(
      this.projectRoot,
      relativePath
    );

    const content = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 保存二进制文件
   * @returns 相对于 .cove 的文件路径
   */
  async saveFile(
    entityType: string,
    entityId: string,
    buffer: Buffer,
    ext: string
  ): Promise<string> {
    const filePath = CovePathResolver.getFilePath(
      this.projectRoot,
      entityType,
      entityId,
      ext
    );

    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 写入文件
    await fs.writeFile(filePath, buffer);

    // 返回相对路径
    return CovePathResolver.getRelativePath(this.projectRoot, filePath);
  }

  /**
   * 从文件加载二进制内容
   */
  async loadFile(relativePath: string): Promise<Buffer> {
    const absolutePath = CovePathResolver.getAbsolutePath(
      this.projectRoot,
      relativePath
    );

    return await fs.readFile(absolutePath);
  }

  /**
   * 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = CovePathResolver.getAbsolutePath(
      this.projectRoot,
      relativePath
    );

    try {
      await fs.unlink(absolutePath);
    } catch (error: any) {
      // 忽略文件不存在的错误
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(relativePath: string): Promise<boolean> {
    const absolutePath = CovePathResolver.getAbsolutePath(
      this.projectRoot,
      relativePath
    );

    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(relativePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
  }> {
    const absolutePath = CovePathResolver.getAbsolutePath(
      this.projectRoot,
      relativePath
    );

    const stats = await fs.stat(absolutePath);

    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }

  /**
   * 列出目录中的所有文件
   */
  async listFiles(entityType: string): Promise<string[]> {
    const dirPath = CovePathResolver.getStorageDir(this.projectRoot, entityType);

    try {
      const files = await fs.readdir(dirPath);
      return files.filter(f => f.endsWith('.json'));
    } catch (error: any) {
      // 目录不存在返回空数组
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * 保存附件文件
   */
  async saveAttachment(
    attachmentId: string,
    buffer: Buffer,
    ext: string
  ): Promise<string> {
    const filePath = CovePathResolver.getAttachmentPath(
      this.projectRoot,
      attachmentId,
      ext
    );

    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 写入文件
    await fs.writeFile(filePath, buffer);

    // 返回相对路径
    return CovePathResolver.getRelativePath(this.projectRoot, filePath);
  }

  /**
   * 原子性写入（先写临时文件，再重命名）
   */
  async saveJsonAtomic(
    entityType: string,
    entityId: string,
    content: any
  ): Promise<string> {
    const filePath = CovePathResolver.getFilePath(
      this.projectRoot,
      entityType,
      entityId,
      'json'
    );

    const tempPath = `${filePath}.tmp`;

    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 写入临时文件
    await fs.writeFile(tempPath, JSON.stringify(content, null, 2), 'utf-8');

    // 原子性重命名
    await fs.rename(tempPath, filePath);

    // 返回相对路径
    return CovePathResolver.getRelativePath(this.projectRoot, filePath);
  }
}
