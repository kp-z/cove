/**
 * Storage Service - 通用文件存储服务
 *
 * 职责：
 * - 处理所有文件上传（头像、附件、文档等）
 * - 文件验证（大小、类型、安全性）
 * - 文件存储（本地文件系统，后续可迁移到对象存储）
 * - 文件删除
 * - 文件 URL 生成
 */

import { ILogger } from '../../interfaces/logger.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { getRealmContext } from '../../context/realm-context-store';

export interface UploadFileOptions {
  /**
   * 文件分类（avatars, attachments, documents 等）
   */
  category: string;

  /**
   * 子路径（如 users/user-123, agents/agent-456）
   */
  subPath: string;

  /**
   * 文件内容
   */
  fileBuffer: Buffer;

  /**
   * MIME 类型
   */
  mimeType: string;

  /**
   * 文件名（可选，默认自动生成）
   */
  fileName?: string;

  /**
   * 是否覆盖已存在的文件（默认 false）
   */
  overwrite?: boolean;
}

export interface FileInfo {
  /**
   * 相对路径（从 storage root 开始）
   */
  relativePath: string;

  /**
   * 文件大小（字节）
   */
  size: number;

  /**
   * MIME 类型
   */
  mimeType: string;

  /**
   * 文件名
   */
  fileName: string;
}

export interface StorageConfig {
  /**
   * 存储根目录
   */
  storageRoot: string;

  /**
   * 最大文件大小（字节）
   */
  maxFileSize?: number;

  /**
   * 允许的 MIME 类型（为空表示允许所有）
   */
  allowedMimeTypes?: string[];
}

export class StorageService {
  private readonly storageRoot: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[] | null;

  constructor(
    config: StorageConfig,
    private readonly logger: ILogger
  ) {
    this.storageRoot = config.storageRoot;
    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 默认 10MB
    this.allowedMimeTypes = config.allowedMimeTypes || null;
  }

  /**
   * 上传文件
   */
  async upload(options: UploadFileOptions): Promise<FileInfo> {
    const { category, subPath, fileBuffer, mimeType, fileName, overwrite = false } = options;

    // 验证文件大小
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(
        `File size (${fileBuffer.length} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`
      );
    }

    // 验证 MIME 类型
    if (this.allowedMimeTypes && !this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(
        `Invalid MIME type: ${mimeType}. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    // 生成文件名
    const finalFileName = fileName || this.generateFileName(mimeType);
    const sanitizedFileName = this.sanitizeFileName(finalFileName);

    // 构建存储路径
    const targetDir = path.join(this.storageRoot, 'storage', category, subPath);
    await fs.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, sanitizedFileName);

    // 检查文件是否已存在
    if (!overwrite) {
      try {
        await fs.access(targetPath);
        throw new Error(`File already exists: ${sanitizedFileName}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // 文件不存在，继续
      }
    }

    // 保存文件
    await fs.writeFile(targetPath, fileBuffer);

    // 计算相对路径
    const relativePath = path.relative(this.storageRoot, targetPath);

    this.logger.info('File uploaded successfully', {
      category,
      subPath,
      fileName: sanitizedFileName,
      size: fileBuffer.length,
      mimeType,
    });

    return {
      relativePath,
      size: fileBuffer.length,
      mimeType,
      fileName: sanitizedFileName,
    };
  }

  /**
   * 删除文件
   */
  async delete(relativePath: string): Promise<void> {
    const absolutePath = path.join(this.storageRoot, relativePath);

    // 安全检查：确保路径在 storage root 内
    const normalizedPath = path.normalize(absolutePath);
    if (!normalizedPath.startsWith(this.storageRoot)) {
      throw new Error('Invalid file path: outside storage root');
    }

    try {
      await fs.unlink(absolutePath);
      this.logger.info('File deleted successfully', { relativePath });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logger.warn('File not found for deletion', { relativePath });
        return;
      }
      throw error;
    }
  }

  /**
   * 删除目录及其所有内容
   */
  async deleteDirectory(relativePath: string): Promise<void> {
    const absolutePath = path.join(this.storageRoot, relativePath);

    // 安全检查
    const normalizedPath = path.normalize(absolutePath);
    if (!normalizedPath.startsWith(this.storageRoot)) {
      throw new Error('Invalid directory path: outside storage root');
    }

    try {
      await fs.rm(absolutePath, { recursive: true, force: true });
      this.logger.info('Directory deleted successfully', { relativePath });
    } catch (error: any) {
      this.logger.error('Failed to delete directory', error as Error, { relativePath });
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(relativePath: string): Promise<boolean> {
    const absolutePath = path.join(this.storageRoot, relativePath);

    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件 URL（用于前端访问）
   */
  getUrl(relativePath: string): string {
    // 返回相对 URL，前端通过静态文件服务访问
    return `/${relativePath}`;
  }

  /**
   * 生成随机文件名
   */
  private generateFileName(mimeType: string): string {
    const ext = this.getExtensionFromMimeType(mimeType);
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}.${ext}`;
  }

  /**
   * 根据 MIME 类型获取文件扩展名
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/json': 'json',
    };

    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * 清理文件名（防止路径遍历攻击）
   */
  private sanitizeFileName(fileName: string): string {
    // 移除路径分隔符和危险字符
    return fileName
      .replace(/[\/\\]/g, '_') // 移除路径分隔符
      .replace(/\.\./g, '_') // 移除 ..
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // 只保留安全字符
  }
}
