import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileSystemService } from '../../../src/application/services/filesystem/filesystem.service';
import { ILogger } from '../../../src/application/interfaces/logger.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FileSystemService', () => {
  let service: FileSystemService;
  let testDir: string;
  let logger: ILogger;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `fs-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Mock logger
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new FileSystemService(logger, [testDir]);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readDirectory', () => {
    it('should read directory contents', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await fs.mkdir(path.join(testDir, 'subdir'));
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');

      const entries = await service.readDirectory(testDir);

      expect(entries).toHaveLength(3);
      expect(entries.map(e => e.name).sort()).toEqual(['file1.txt', 'file2.txt', 'subdir'].sort());

      const file1 = entries.find(e => e.name === 'file1.txt');
      expect(file1?.isFile).toBe(true);
      expect(file1?.isDirectory).toBe(false);

      const subdir = entries.find(e => e.name === 'subdir');
      expect(subdir?.isDirectory).toBe(true);
      expect(subdir?.isFile).toBe(false);
    });

    it('should read empty directory', async () => {
      const entries = await service.readDirectory(testDir);
      expect(entries).toEqual([]);
    });

    it('should read directory recursively', async () => {
      await fs.mkdir(path.join(testDir, 'subdir'));
      await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'content');

      const entries = await service.readDirectory(testDir, { recursive: true });

      expect(entries.length).toBeGreaterThanOrEqual(2);
      const nested = entries.find(e => e.name === 'nested.txt');
      expect(nested).toBeDefined();
    });

    it('should throw error for non-existent directory', async () => {
      const nonExistent = path.join(testDir, 'non-existent');
      await expect(
        service.readDirectory(nonExistent)
      ).rejects.toThrow('Failed to read directory');
    });

    it('should prevent access outside allowed paths', async () => {
      await expect(
        service.readDirectory('/etc')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'Hello, World!';
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, content);

      const result = await service.readFile(filePath);

      expect(result.content).toBe(content);
      expect(result.encoding).toBe('utf-8');
      expect(result.size).toBe(content.length);
      expect(result.modifiedAt).toBeInstanceOf(Date);
    });

    it('should read file with custom encoding', async () => {
      const content = 'Test content';
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, content);

      const result = await service.readFile(filePath, 'ascii');

      expect(result.content).toBe(content);
      expect(result.encoding).toBe('ascii');
    });

    it('should throw error for non-existent file', async () => {
      const nonExistent = path.join(testDir, 'non-existent.txt');
      await expect(
        service.readFile(nonExistent)
      ).rejects.toThrow('Failed to read file');
    });

    it('should prevent access outside allowed paths', async () => {
      await expect(
        service.readFile('/etc/passwd')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('writeFile', () => {
    it('should write content to new file', async () => {
      const filePath = path.join(testDir, 'new.txt');
      const content = 'new content';

      await service.writeFile(filePath, content);

      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'old content');

      await service.writeFile(filePath, 'new content');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('new content');
    });

    it('should write with custom encoding', async () => {
      const filePath = path.join(testDir, 'test.txt');

      await service.writeFile(filePath, 'content', { encoding: 'ascii' });

      const content = await fs.readFile(filePath, 'ascii');
      expect(content).toBe('content');
    });

    it('should prevent access outside allowed paths', async () => {
      await expect(
        service.writeFile('/tmp/malicious.txt', 'content')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('createDirectory', () => {
    it('should create new directory', async () => {
      const dirPath = path.join(testDir, 'newdir');

      await service.createDirectory(dirPath);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories with recursive option', async () => {
      const dirPath = path.join(testDir, 'parent', 'child', 'grandchild');

      await service.createDirectory(dirPath, true);

      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should throw error if directory already exists without recursive', async () => {
      const dirPath = path.join(testDir, 'existing');
      await fs.mkdir(dirPath);

      await expect(
        service.createDirectory(dirPath, false)
      ).rejects.toThrow('Failed to create directory');
    });

    it('should prevent access outside allowed paths', async () => {
      await expect(
        service.createDirectory('/tmp/malicious')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      const filePath = path.join(testDir, 'delete-me.txt');
      await fs.writeFile(filePath, 'content');

      await service.delete(filePath);

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should delete empty directory', async () => {
      const dirPath = path.join(testDir, 'empty-dir');
      await fs.mkdir(dirPath);

      await service.delete(dirPath, true);

      await expect(fs.access(dirPath)).rejects.toThrow();
    });

    it('should delete directory with contents when recursive', async () => {
      const dirPath = path.join(testDir, 'dir-with-files');
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

      await service.delete(dirPath, true);

      await expect(fs.access(dirPath)).rejects.toThrow();
    });

    it('should throw error for non-existent path', async () => {
      const nonExistent = path.join(testDir, 'non-existent');
      await expect(
        service.delete(nonExistent)
      ).rejects.toThrow('Failed to delete');
    });

    it('should prevent access outside allowed paths', async () => {
      await expect(
        service.delete('/tmp/important.txt')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('rename', () => {
    it('should rename file', async () => {
      const oldPath = path.join(testDir, 'old.txt');
      const newPath = path.join(testDir, 'new.txt');
      await fs.writeFile(oldPath, 'content');

      await service.rename(oldPath, newPath);

      await expect(fs.access(oldPath)).rejects.toThrow();
      const content = await fs.readFile(newPath, 'utf-8');
      expect(content).toBe('content');
    });

    it('should rename directory', async () => {
      const oldPath = path.join(testDir, 'old-dir');
      const newPath = path.join(testDir, 'new-dir');
      await fs.mkdir(oldPath);

      await service.rename(oldPath, newPath);

      await expect(fs.access(oldPath)).rejects.toThrow();
      const stats = await fs.stat(newPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should move file to subdirectory', async () => {
      const oldPath = path.join(testDir, 'file.txt');
      const subdir = path.join(testDir, 'subdir');
      const newPath = path.join(subdir, 'file.txt');
      await fs.writeFile(oldPath, 'content');
      await fs.mkdir(subdir);

      await service.rename(oldPath, newPath);

      await expect(fs.access(oldPath)).rejects.toThrow();
      const content = await fs.readFile(newPath, 'utf-8');
      expect(content).toBe('content');
    });

    it('should throw error if source does not exist', async () => {
      const oldPath = path.join(testDir, 'non-existent.txt');
      const newPath = path.join(testDir, 'new.txt');

      await expect(
        service.rename(oldPath, newPath)
      ).rejects.toThrow('Failed to rename');
    });

    it('should prevent access outside allowed paths for old path', async () => {
      const newPath = path.join(testDir, 'new.txt');

      await expect(
        service.rename('/etc/passwd', newPath)
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });

    it('should prevent access outside allowed paths for new path', async () => {
      const oldPath = path.join(testDir, 'file.txt');
      await fs.writeFile(oldPath, 'content');

      await expect(
        service.rename(oldPath, '/tmp/malicious.txt')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const result = await service.exists(filePath);

      expect(result).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(testDir, 'exists-dir');
      await fs.mkdir(dirPath);

      const result = await service.exists(dirPath);

      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const nonExistent = path.join(testDir, 'non-existent.txt');

      const result = await service.exists(nonExistent);

      expect(result).toBe(false);
    });

    it('should prevent access outside allowed paths', async () => {
      await expect(
        service.exists('/etc/passwd')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });
  });

  describe('path security', () => {
    it('should block absolute paths outside allowed base', async () => {
      await expect(
        service.readFile('/etc/passwd')
      ).rejects.toThrow('Access denied: path outside allowed directories');
    });

    it('should allow paths within allowed base directory', async () => {
      const subdir = path.join(testDir, 'subdir');
      await fs.mkdir(subdir);
      const filePath = path.join(subdir, 'file.txt');
      await fs.writeFile(filePath, 'content');

      const result = await service.readFile(filePath);

      expect(result.content).toBe('content');
    });

    it('should validate all paths in rename operation', async () => {
      const validPath = path.join(testDir, 'file.txt');
      await fs.writeFile(validPath, 'content');

      // Both paths must be validated
      await expect(
        service.rename('/etc/passwd', validPath)
      ).rejects.toThrow('Access denied');

      await expect(
        service.rename(validPath, '/tmp/malicious.txt')
      ).rejects.toThrow('Access denied');
    });
  });
});
