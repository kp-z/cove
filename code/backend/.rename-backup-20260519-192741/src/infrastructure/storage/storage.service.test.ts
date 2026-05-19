import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from './storage.service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('StorageService', () => {
  let storageService: StorageService;
  let testProjectRoot: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testProjectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cove-storage-test-'));
    storageService = new StorageService(testProjectRoot);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testProjectRoot, { recursive: true, force: true });
  });

  describe('saveJson', () => {
    it('should save JSON content to file', async () => {
      const content = { id: 'test-1', name: 'Test Entity' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      expect(relativePath).toContain('storage/users/test-1.json');

      // Verify file exists and content is correct
      const savedContent = await storageService.loadJson(relativePath);
      expect(savedContent).toEqual(content);
    });

    it('should create directories if they do not exist', async () => {
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJson('deeply/nested/path', 'test-1', content);

      expect(relativePath).toContain('storage/deeply/nested/path/test-1.json');
      const savedContent = await storageService.loadJson(relativePath);
      expect(savedContent).toEqual(content);
    });

    it('should format JSON with indentation', async () => {
      const content = { id: 'test-1', nested: { key: 'value' } };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      const absolutePath = path.join(testProjectRoot, '.cove', relativePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');

      expect(fileContent).toContain('  '); // Check for indentation
      expect(fileContent).toContain('\n'); // Check for newlines
    });

    it('should overwrite existing file', async () => {
      const content1 = { version: 1 };
      const content2 = { version: 2 };

      await storageService.saveJson('users', 'test-1', content1);
      const relativePath = await storageService.saveJson('users', 'test-1', content2);

      const savedContent = await storageService.loadJson(relativePath);
      expect(savedContent).toEqual(content2);
    });
  });

  describe('loadJson', () => {
    it('should load JSON content from file', async () => {
      const content = { id: 'test-1', data: 'test data' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      const loadedContent = await storageService.loadJson(relativePath);
      expect(loadedContent).toEqual(content);
    });

    it('should throw error when file does not exist', async () => {
      await expect(
        storageService.loadJson('storage/users/non-existent.json')
      ).rejects.toThrow();
    });

    it('should throw error when JSON is invalid', async () => {
      const relativePath = 'storage/users/invalid.json';
      const absolutePath = path.join(testProjectRoot, '.cove', relativePath);

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, 'invalid json content', 'utf-8');

      await expect(storageService.loadJson(relativePath)).rejects.toThrow();
    });
  });

  describe('saveFile', () => {
    it('should save binary file', async () => {
      const buffer = Buffer.from('test binary content');
      const relativePath = await storageService.saveFile('attachments', 'file-1', buffer, 'bin');

      expect(relativePath).toContain('storage/attachments/file-1.bin');

      const loadedBuffer = await storageService.loadFile(relativePath);
      expect(loadedBuffer.toString()).toBe('test binary content');
    });

    it('should create directories if they do not exist', async () => {
      const buffer = Buffer.from('test');
      const relativePath = await storageService.saveFile('deep/nested', 'file-1', buffer, 'txt');

      expect(relativePath).toContain('storage/deep/nested/file-1.txt');
      const exists = await storageService.exists(relativePath);
      expect(exists).toBe(true);
    });

    it('should handle different file extensions', async () => {
      const buffer = Buffer.from('image data');
      const relativePath = await storageService.saveFile('images', 'img-1', buffer, 'png');

      expect(relativePath).toContain('storage/images/img-1.png');
    });
  });

  describe('loadFile', () => {
    it('should load binary file', async () => {
      const buffer = Buffer.from('test binary content');
      const relativePath = await storageService.saveFile('attachments', 'file-1', buffer, 'bin');

      const loadedBuffer = await storageService.loadFile(relativePath);
      expect(loadedBuffer).toEqual(buffer);
    });

    it('should throw error when file does not exist', async () => {
      await expect(
        storageService.loadFile('storage/attachments/non-existent.bin')
      ).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      let exists = await storageService.exists(relativePath);
      expect(exists).toBe(true);

      await storageService.deleteFile(relativePath);

      exists = await storageService.exists(relativePath);
      expect(exists).toBe(false);
    });

    it('should not throw error when file does not exist', async () => {
      await expect(
        storageService.deleteFile('storage/users/non-existent.json')
      ).resolves.not.toThrow();
    });

    it('should throw error for other file system errors', async () => {
      // Create a file with restricted permissions (if possible)
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);
      const absolutePath = path.join(testProjectRoot, '.cove', relativePath);

      // Make parent directory read-only
      const parentDir = path.dirname(absolutePath);
      await fs.chmod(parentDir, 0o444);

      try {
        await expect(storageService.deleteFile(relativePath)).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(parentDir, 0o755);
      }
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      const exists = await storageService.exists(relativePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await storageService.exists('storage/users/non-existent.json');
      expect(exists).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      const fileInfo = await storageService.getFileInfo(relativePath);

      expect(fileInfo.size).toBeGreaterThan(0);
      expect(fileInfo.createdAt).toBeInstanceOf(Date);
      expect(fileInfo.modifiedAt).toBeInstanceOf(Date);
    });

    it('should throw error when file does not exist', async () => {
      await expect(
        storageService.getFileInfo('storage/users/non-existent.json')
      ).rejects.toThrow();
    });

    it('should reflect correct file size', async () => {
      const content = { id: 'test-1', data: 'x'.repeat(1000) };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      const fileInfo = await storageService.getFileInfo(relativePath);
      expect(fileInfo.size).toBeGreaterThan(1000);
    });
  });

  describe('listFiles', () => {
    it('should list all JSON files in entity directory', async () => {
      await storageService.saveJson('users', 'user-1', { id: 'user-1' });
      await storageService.saveJson('users', 'user-2', { id: 'user-2' });
      await storageService.saveJson('users', 'user-3', { id: 'user-3' });

      const files = await storageService.listFiles('users');

      expect(files).toHaveLength(3);
      expect(files).toContain('user-1.json');
      expect(files).toContain('user-2.json');
      expect(files).toContain('user-3.json');
    });

    it('should return empty array when directory does not exist', async () => {
      const files = await storageService.listFiles('non-existent');
      expect(files).toEqual([]);
    });

    it('should only return JSON files', async () => {
      await storageService.saveJson('users', 'user-1', { id: 'user-1' });
      await storageService.saveFile('users', 'file-1', Buffer.from('test'), 'txt');

      const files = await storageService.listFiles('users');

      expect(files).toHaveLength(1);
      expect(files).toContain('user-1.json');
      expect(files).not.toContain('file-1.txt');
    });

    it('should return empty array for empty directory', async () => {
      // Create directory but don't add files
      const dirPath = path.join(testProjectRoot, '.cove', 'storage', 'empty');
      await fs.mkdir(dirPath, { recursive: true });

      const files = await storageService.listFiles('empty');
      expect(files).toEqual([]);
    });
  });

  describe('saveAttachment', () => {
    it('should save attachment file', async () => {
      const buffer = Buffer.from('attachment content');
      const relativePath = await storageService.saveAttachment('attach-1', buffer, 'pdf');

      expect(relativePath).toContain('storage/attachments/attach-1.pdf');

      const loadedBuffer = await storageService.loadFile(relativePath);
      expect(loadedBuffer.toString()).toBe('attachment content');
    });

    it('should create attachments directory if it does not exist', async () => {
      const buffer = Buffer.from('test');
      const relativePath = await storageService.saveAttachment('attach-1', buffer, 'txt');

      const exists = await storageService.exists(relativePath);
      expect(exists).toBe(true);
    });

    it('should handle different attachment types', async () => {
      const pdfBuffer = Buffer.from('pdf content');
      const imageBuffer = Buffer.from('image content');

      const pdfPath = await storageService.saveAttachment('doc-1', pdfBuffer, 'pdf');
      const imagePath = await storageService.saveAttachment('img-1', imageBuffer, 'png');

      expect(pdfPath).toContain('doc-1.pdf');
      expect(imagePath).toContain('img-1.png');
    });
  });

  describe('saveJsonAtomic', () => {
    it('should save JSON content atomically', async () => {
      const content = { id: 'test-1', name: 'Atomic Test' };
      const relativePath = await storageService.saveJsonAtomic('users', 'test-1', content);

      expect(relativePath).toContain('storage/users/test-1.json');

      const savedContent = await storageService.loadJson(relativePath);
      expect(savedContent).toEqual(content);
    });

    it('should not leave temporary file after save', async () => {
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJsonAtomic('users', 'test-1', content);

      const absolutePath = path.join(testProjectRoot, '.cove', relativePath);
      const tempPath = `${absolutePath}.tmp`;

      const tempExists = await fs.access(tempPath).then(() => true).catch(() => false);
      expect(tempExists).toBe(false);
    });

    it('should overwrite existing file atomically', async () => {
      const content1 = { version: 1 };
      const content2 = { version: 2 };

      await storageService.saveJsonAtomic('users', 'test-1', content1);
      const relativePath = await storageService.saveJsonAtomic('users', 'test-1', content2);

      const savedContent = await storageService.loadJson(relativePath);
      expect(savedContent).toEqual(content2);
    });

    it('should create directories if they do not exist', async () => {
      const content = { id: 'test-1' };
      const relativePath = await storageService.saveJsonAtomic('new/entity/type', 'test-1', content);

      expect(relativePath).toContain('storage/new/entity/type/test-1.json');
      const savedContent = await storageService.loadJson(relativePath);
      expect(savedContent).toEqual(content);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete file lifecycle', async () => {
      // Create
      const content = { id: 'test-1', name: 'Test' };
      const relativePath = await storageService.saveJson('users', 'test-1', content);

      // Read
      let loadedContent = await storageService.loadJson(relativePath);
      expect(loadedContent).toEqual(content);

      // Update
      const updatedContent = { ...content, name: 'Updated' };
      await storageService.saveJson('users', 'test-1', updatedContent);
      loadedContent = await storageService.loadJson(relativePath);
      expect(loadedContent).toEqual(updatedContent);

      // Check existence
      let exists = await storageService.exists(relativePath);
      expect(exists).toBe(true);

      // Delete
      await storageService.deleteFile(relativePath);
      exists = await storageService.exists(relativePath);
      expect(exists).toBe(false);
    });

    it('should handle multiple entity types', async () => {
      await storageService.saveJson('users', 'user-1', { type: 'user' });
      await storageService.saveJson('projects', 'proj-1', { type: 'project' });
      await storageService.saveJson('tasks', 'task-1', { type: 'task' });

      const userFiles = await storageService.listFiles('users');
      const projectFiles = await storageService.listFiles('projects');
      const taskFiles = await storageService.listFiles('tasks');

      expect(userFiles).toHaveLength(1);
      expect(projectFiles).toHaveLength(1);
      expect(taskFiles).toHaveLength(1);
    });

    it('should handle concurrent file operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        storageService.saveJson('users', `user-${i}`, { id: `user-${i}` })
      );

      await Promise.all(operations);

      const files = await storageService.listFiles('users');
      expect(files).toHaveLength(10);
    });
  });
});
