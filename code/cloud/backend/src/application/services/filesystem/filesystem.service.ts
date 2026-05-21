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
  private readonly baseDir: string;

  constructor(
    private readonly logger: ILogger,
    private readonly allowedBasePaths: string[] = []
  ) {
    // Use the first allowed base path as the base directory for relative path resolution
    this.baseDir = allowedBasePaths.length > 0 ? path.resolve(allowedBasePaths[0]!) : process.cwd();
  }

  private validatePath(targetPath: string): string {
    // Resolve relative paths from baseDir, absolute paths as-is
    const resolvedPath = path.isAbsolute(targetPath)
      ? path.normalize(targetPath)
      : path.resolve(this.baseDir, targetPath);

    // Check if path is within allowed base paths
    if (this.allowedBasePaths.length > 0) {
      const isAllowed = this.allowedBasePaths.some(basePath => {
        const resolvedBase = path.resolve(basePath);
        const relativePath = path.relative(resolvedBase, resolvedPath);
        // Path must not escape the base directory
        return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
      });

      if (!isAllowed) {
        throw new Error(`Access denied: path outside allowed directories`);
      }
    }

    return resolvedPath;
  }

  async readDirectory(
    targetPath: string,
    options: ReadDirectoryOptions = {}
  ): Promise<DirectoryEntry[]> {
    const resolvedPath = this.validatePath(targetPath);

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const result: DirectoryEntry[] = [];

      for (const entry of entries) {
        const entryPath = path.join(resolvedPath, entry.name);
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

      this.logger.info('Directory read successfully', { path: resolvedPath, count: result.length });
      return result;
    } catch (error) {
      this.logger.error('Failed to read directory', error as Error, { path: resolvedPath });
      throw new Error(`Failed to read directory: ${(error as Error).message}`);
    }
  }

  async readFile(
    targetPath: string,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<FileContent> {
    const resolvedPath = this.validatePath(targetPath);

    try {
      const content = await fs.readFile(resolvedPath, encoding);
      const stats = await fs.stat(resolvedPath);

      this.logger.info('File read successfully', { path: resolvedPath, size: stats.size });

      return {
        content,
        encoding,
        size: stats.size,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      this.logger.error('Failed to read file', error as Error, { path: resolvedPath });
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  async writeFile(
    targetPath: string,
    content: string,
    options: WriteFileOptions = {}
  ): Promise<void> {
    const resolvedPath = this.validatePath(targetPath);

    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: options.encoding || 'utf-8',
        mode: options.mode,
        flag: options.flag,
      });

      this.logger.info('File written successfully', { path: resolvedPath, size: content.length });
    } catch (error) {
      this.logger.error('Failed to write file', error as Error, { path: resolvedPath });
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  async createDirectory(targetPath: string, recursive = false): Promise<void> {
    const resolvedPath = this.validatePath(targetPath);

    try {
      await fs.mkdir(resolvedPath, { recursive });
      this.logger.info('Directory created successfully', { path: resolvedPath, recursive });
    } catch (error) {
      this.logger.error('Failed to create directory', error as Error, { path: resolvedPath });
      throw new Error(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  async delete(targetPath: string, recursive = false): Promise<void> {
    const resolvedPath = this.validatePath(targetPath);

    try {
      const stats = await fs.stat(resolvedPath);

      if (stats.isDirectory()) {
        await fs.rm(resolvedPath, { recursive, force: true });
        this.logger.info('Directory deleted successfully', { path: resolvedPath, recursive });
      } else {
        await fs.unlink(resolvedPath);
        this.logger.info('File deleted successfully', { path: resolvedPath });
      }
    } catch (error) {
      this.logger.error('Failed to delete', error as Error, { path: resolvedPath });
      throw new Error(`Failed to delete: ${(error as Error).message}`);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const resolvedOldPath = this.validatePath(oldPath);
    const resolvedNewPath = this.validatePath(newPath);

    try {
      await fs.rename(resolvedOldPath, resolvedNewPath);
      this.logger.info('Renamed successfully', { oldPath: resolvedOldPath, newPath: resolvedNewPath });
    } catch (error) {
      this.logger.error('Failed to rename', error as Error, { oldPath: resolvedOldPath, newPath: resolvedNewPath });
      throw new Error(`Failed to rename: ${(error as Error).message}`);
    }
  }

  async exists(targetPath: string): Promise<boolean> {
    const resolvedPath = this.validatePath(targetPath);

    try {
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }
}
