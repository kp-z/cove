import fs from 'fs/promises';
import path from 'path';
import { ILogger } from '../../interfaces/logger.interface';

export interface ReadDirectoryOptions {
  withFileTypes?: boolean;
  recursive?: boolean;
}

export interface WriteFileOptions {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size?: number;
  modifiedAt?: Date;
}

export interface FileContent {
  content: string;
  encoding: BufferEncoding;
  size: number;
  modifiedAt: Date;
}

export class FileSystemService {
  constructor(
    private readonly logger: ILogger,
    private readonly allowedBasePaths: string[] = []
  ) {}

  private validatePath(targetPath: string): void {
    const resolvedPath = path.resolve(targetPath);

    // Check if path is within allowed base paths
    if (this.allowedBasePaths.length > 0) {
      const isAllowed = this.allowedBasePaths.some(basePath => {
        const resolvedBase = path.resolve(basePath);
        return resolvedPath.startsWith(resolvedBase);
      });

      if (!isAllowed) {
        throw new Error(`Access denied: path outside allowed directories`);
      }
    }

    // Prevent path traversal attacks
    if (resolvedPath.includes('..')) {
      throw new Error('Invalid path: path traversal detected');
    }
  }

  async readDirectory(
    targetPath: string,
    options: ReadDirectoryOptions = {}
  ): Promise<DirectoryEntry[]> {
    this.validatePath(targetPath);

    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const result: DirectoryEntry[] = [];

      for (const entry of entries) {
        const entryPath = path.join(targetPath, entry.name);
        const stats = await fs.stat(entryPath);

        result.push({
          name: entry.name,
          path: entryPath,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size: stats.size,
          modifiedAt: stats.mtime,
        });

        // Recursive directory reading
        if (options.recursive && entry.isDirectory()) {
          const subEntries = await this.readDirectory(entryPath, options);
          result.push(...subEntries);
        }
      }

      this.logger.info('Directory read successfully', { path: targetPath, count: result.length });
      return result;
    } catch (error) {
      this.logger.error('Failed to read directory', error as Error, { path: targetPath });
      throw new Error(`Failed to read directory: ${(error as Error).message}`);
    }
  }

  async readFile(
    targetPath: string,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<FileContent> {
    this.validatePath(targetPath);

    try {
      const content = await fs.readFile(targetPath, encoding);
      const stats = await fs.stat(targetPath);

      this.logger.info('File read successfully', { path: targetPath, size: stats.size });

      return {
        content,
        encoding,
        size: stats.size,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      this.logger.error('Failed to read file', error as Error, { path: targetPath });
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  async writeFile(
    targetPath: string,
    content: string,
    options: WriteFileOptions = {}
  ): Promise<void> {
    this.validatePath(targetPath);

    try {
      await fs.writeFile(targetPath, content, {
        encoding: options.encoding || 'utf-8',
        mode: options.mode,
        flag: options.flag,
      });

      this.logger.info('File written successfully', { path: targetPath, size: content.length });
    } catch (error) {
      this.logger.error('Failed to write file', error as Error, { path: targetPath });
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  async createDirectory(targetPath: string, recursive = false): Promise<void> {
    this.validatePath(targetPath);

    try {
      await fs.mkdir(targetPath, { recursive });
      this.logger.info('Directory created successfully', { path: targetPath, recursive });
    } catch (error) {
      this.logger.error('Failed to create directory', error as Error, { path: targetPath });
      throw new Error(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  async delete(targetPath: string, recursive = false): Promise<void> {
    this.validatePath(targetPath);

    try {
      const stats = await fs.stat(targetPath);

      if (stats.isDirectory()) {
        await fs.rm(targetPath, { recursive, force: true });
        this.logger.info('Directory deleted successfully', { path: targetPath, recursive });
      } else {
        await fs.unlink(targetPath);
        this.logger.info('File deleted successfully', { path: targetPath });
      }
    } catch (error) {
      this.logger.error('Failed to delete', error as Error, { path: targetPath });
      throw new Error(`Failed to delete: ${(error as Error).message}`);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    this.validatePath(oldPath);
    this.validatePath(newPath);

    try {
      await fs.rename(oldPath, newPath);
      this.logger.info('Renamed successfully', { oldPath, newPath });
    } catch (error) {
      this.logger.error('Failed to rename', error as Error, { oldPath, newPath });
      throw new Error(`Failed to rename: ${(error as Error).message}`);
    }
  }

  async exists(targetPath: string): Promise<boolean> {
    this.validatePath(targetPath);

    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
