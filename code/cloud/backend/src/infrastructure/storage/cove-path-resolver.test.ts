import { describe, it, expect } from 'vitest';
import { CovePathResolver } from './cove-path-resolver';
import path from 'path';
import os from 'os';

describe('CovePathResolver', () => {
  const testProjectRoot = '/test/project';

  describe('getCoveRoot', () => {
    it('should return .cove directory path', () => {
      const coveRoot = CovePathResolver.getCoveRoot(testProjectRoot);
      expect(coveRoot).toBe(path.join(testProjectRoot, '.cove'));
    });

    it('should handle different project roots', () => {
      const root1 = CovePathResolver.getCoveRoot('/project1');
      const root2 = CovePathResolver.getCoveRoot('/project2');

      expect(root1).toBe('/project1/.cove');
      expect(root2).toBe('/project2/.cove');
    });
  });

  describe('getGlobalCoveRoot', () => {
    it('should return global .cove directory in home directory', () => {
      const globalRoot = CovePathResolver.getGlobalCoveRoot();
      expect(globalRoot).toBe(path.join(os.homedir(), '.cove'));
    });
  });

  describe('getAgentRoot', () => {
    it('should return agents directory in global .cove', () => {
      const agentRoot = CovePathResolver.getAgentRoot();
      expect(agentRoot).toBe(path.join(os.homedir(), '.cove', 'agents'));
    });
  });

  describe('getAgentDir', () => {
    it('should return agent-specific directory', () => {
      const agentDir = CovePathResolver.getAgentDir('agent-123');
      expect(agentDir).toBe(path.join(os.homedir(), '.cove', 'agents', 'agent-123'));
    });

    it('should handle different agent IDs', () => {
      const dir1 = CovePathResolver.getAgentDir('agent-1');
      const dir2 = CovePathResolver.getAgentDir('agent-2');

      expect(dir1).toContain('agent-1');
      expect(dir2).toContain('agent-2');
      expect(dir1).not.toBe(dir2);
    });
  });

  describe('getDatabasePath', () => {
    it('should return database file path', () => {
      const dbPath = CovePathResolver.getDatabasePath(testProjectRoot);
      expect(dbPath).toBe(path.join(testProjectRoot, '.cove', 'database', 'cove.db'));
    });
  });

  describe('getGlobalDatabasePath', () => {
    it('should return global database path', () => {
      const globalDbPath = CovePathResolver.getGlobalDatabasePath();
      expect(globalDbPath).toBe(path.join(os.homedir(), '.cove', 'database', 'global.db'));
    });
  });

  describe('getStorageRoot', () => {
    it('should return storage root directory', () => {
      const storageRoot = CovePathResolver.getStorageRoot(testProjectRoot);
      expect(storageRoot).toBe(path.join(testProjectRoot, '.cove', 'storage'));
    });
  });

  describe('getStorageDir', () => {
    it('should return entity-specific storage directory', () => {
      const storageDir = CovePathResolver.getStorageDir(testProjectRoot, 'users');
      expect(storageDir).toBe(path.join(testProjectRoot, '.cove', 'storage', 'users'));
    });

    it('should handle different entity types', () => {
      const usersDir = CovePathResolver.getStorageDir(testProjectRoot, 'users');
      const projectsDir = CovePathResolver.getStorageDir(testProjectRoot, 'projects');

      expect(usersDir).toContain('users');
      expect(projectsDir).toContain('projects');
      expect(usersDir).not.toBe(projectsDir);
    });

    it('should handle nested entity types', () => {
      const nestedDir = CovePathResolver.getStorageDir(testProjectRoot, 'deeply/nested/type');
      expect(nestedDir).toBe(path.join(testProjectRoot, '.cove', 'storage', 'deeply/nested/type'));
    });
  });

  describe('getFilePath', () => {
    it('should return file path with default json extension', () => {
      const filePath = CovePathResolver.getFilePath(testProjectRoot, 'users', 'user-123');
      expect(filePath).toBe(path.join(testProjectRoot, '.cove', 'storage', 'users', 'user-123.json'));
    });

    it('should return file path with custom extension', () => {
      const filePath = CovePathResolver.getFilePath(testProjectRoot, 'images', 'img-1', 'png');
      expect(filePath).toBe(path.join(testProjectRoot, '.cove', 'storage', 'images', 'img-1.png'));
    });

    it('should handle different entity IDs', () => {
      const file1 = CovePathResolver.getFilePath(testProjectRoot, 'users', 'user-1');
      const file2 = CovePathResolver.getFilePath(testProjectRoot, 'users', 'user-2');

      expect(file1).toContain('user-1.json');
      expect(file2).toContain('user-2.json');
      expect(file1).not.toBe(file2);
    });
  });

  describe('getAttachmentPath', () => {
    it('should return attachment file path', () => {
      const attachmentPath = CovePathResolver.getAttachmentPath(testProjectRoot, 'attach-1', 'pdf');
      expect(attachmentPath).toBe(path.join(testProjectRoot, '.cove', 'storage', 'attachments', 'attach-1.pdf'));
    });

    it('should handle different attachment types', () => {
      const pdfPath = CovePathResolver.getAttachmentPath(testProjectRoot, 'doc-1', 'pdf');
      const imagePath = CovePathResolver.getAttachmentPath(testProjectRoot, 'img-1', 'png');

      expect(pdfPath).toContain('doc-1.pdf');
      expect(imagePath).toContain('img-1.png');
    });
  });

  describe('getAgentWorkspace', () => {
    it('should return agent workspace directory', () => {
      const workspace = CovePathResolver.getAgentWorkspace(testProjectRoot, 'agent-123');
      expect(workspace).toBe(path.join(testProjectRoot, '.cove', 'storage', 'agents', 'agent-123'));
    });

    it('should handle different agent IDs', () => {
      const workspace1 = CovePathResolver.getAgentWorkspace(testProjectRoot, 'agent-1');
      const workspace2 = CovePathResolver.getAgentWorkspace(testProjectRoot, 'agent-2');

      expect(workspace1).toContain('agent-1');
      expect(workspace2).toContain('agent-2');
      expect(workspace1).not.toBe(workspace2);
    });
  });

  describe('getCacheDir', () => {
    it('should return cache directory', () => {
      const cacheDir = CovePathResolver.getCacheDir(testProjectRoot);
      expect(cacheDir).toBe(path.join(testProjectRoot, '.cove', 'cache'));
    });
  });

  describe('getLogsDir', () => {
    it('should return logs directory', () => {
      const logsDir = CovePathResolver.getLogsDir(testProjectRoot);
      expect(logsDir).toBe(path.join(testProjectRoot, '.cove', 'logs'));
    });
  });

  describe('getTempDir', () => {
    it('should return temp directory', () => {
      const tempDir = CovePathResolver.getTempDir(testProjectRoot);
      expect(tempDir).toBe(path.join(testProjectRoot, '.cove', 'temp'));
    });
  });

  describe('getConfigDir', () => {
    it('should return config directory', () => {
      const configDir = CovePathResolver.getConfigDir(testProjectRoot);
      expect(configDir).toBe(path.join(testProjectRoot, '.cove', 'config'));
    });
  });

  describe('getMetadataDir', () => {
    it('should return metadata directory', () => {
      const metadataDir = CovePathResolver.getMetadataDir(testProjectRoot);
      expect(metadataDir).toBe(path.join(testProjectRoot, '.cove', 'metadata'));
    });
  });

  describe('extractEntityId', () => {
    it('should extract entity ID from file path', () => {
      const filePath = '/path/to/storage/users/user-123.json';
      const entityId = CovePathResolver.extractEntityId(filePath);
      expect(entityId).toBe('user-123');
    });

    it('should handle different file extensions', () => {
      const jsonId = CovePathResolver.extractEntityId('/path/file-1.json');
      const pngId = CovePathResolver.extractEntityId('/path/file-2.png');
      const txtId = CovePathResolver.extractEntityId('/path/file-3.txt');

      expect(jsonId).toBe('file-1');
      expect(pngId).toBe('file-2');
      expect(txtId).toBe('file-3');
    });

    it('should handle file names with dots', () => {
      const entityId = CovePathResolver.extractEntityId('/path/file.name.with.dots.json');
      expect(entityId).toBe('file.name.with.dots');
    });

    it('should handle file names without extension', () => {
      const entityId = CovePathResolver.extractEntityId('/path/filename');
      // When there's no extension, lastIndexOf('.') returns -1, substring(0, -1) returns ''
      expect(entityId).toBe('');
    });
  });

  describe('getRelativePath', () => {
    it('should return path relative to .cove directory', () => {
      const absolutePath = path.join(testProjectRoot, '.cove', 'storage', 'users', 'user-1.json');
      const relativePath = CovePathResolver.getRelativePath(testProjectRoot, absolutePath);

      expect(relativePath).toBe(path.join('storage', 'users', 'user-1.json'));
    });

    it('should handle different absolute paths', () => {
      const path1 = path.join(testProjectRoot, '.cove', 'storage', 'users', 'user-1.json');
      const path2 = path.join(testProjectRoot, '.cove', 'cache', 'cache-1.json');

      const relative1 = CovePathResolver.getRelativePath(testProjectRoot, path1);
      const relative2 = CovePathResolver.getRelativePath(testProjectRoot, path2);

      expect(relative1).toContain('storage');
      expect(relative2).toContain('cache');
    });

    it('should handle nested paths', () => {
      const absolutePath = path.join(testProjectRoot, '.cove', 'storage', 'deeply', 'nested', 'path', 'file.json');
      const relativePath = CovePathResolver.getRelativePath(testProjectRoot, absolutePath);

      expect(relativePath).toBe(path.join('storage', 'deeply', 'nested', 'path', 'file.json'));
    });
  });

  describe('getAbsolutePath', () => {
    it('should return absolute path from relative path', () => {
      const relativePath = path.join('storage', 'users', 'user-1.json');
      const absolutePath = CovePathResolver.getAbsolutePath(testProjectRoot, relativePath);

      expect(absolutePath).toBe(path.join(testProjectRoot, '.cove', 'storage', 'users', 'user-1.json'));
    });

    it('should handle different relative paths', () => {
      const path1 = CovePathResolver.getAbsolutePath(testProjectRoot, 'storage/users/user-1.json');
      const path2 = CovePathResolver.getAbsolutePath(testProjectRoot, 'cache/cache-1.json');

      expect(path1).toContain('.cove');
      expect(path1).toContain('storage');
      expect(path2).toContain('.cove');
      expect(path2).toContain('cache');
    });

    it('should be inverse of getRelativePath', () => {
      const originalAbsolute = path.join(testProjectRoot, '.cove', 'storage', 'users', 'user-1.json');
      const relative = CovePathResolver.getRelativePath(testProjectRoot, originalAbsolute);
      const backToAbsolute = CovePathResolver.getAbsolutePath(testProjectRoot, relative);

      expect(backToAbsolute).toBe(originalAbsolute);
    });
  });

  describe('path consistency', () => {
    it('should maintain consistency between related path methods', () => {
      const entityType = 'users';
      const entityId = 'user-123';

      const storageDir = CovePathResolver.getStorageDir(testProjectRoot, entityType);
      const filePath = CovePathResolver.getFilePath(testProjectRoot, entityType, entityId);

      expect(filePath).toContain(storageDir);
      expect(filePath).toContain(`${entityId}.json`);
    });

    it('should maintain consistency for attachment paths', () => {
      const attachmentId = 'attach-1';
      const ext = 'pdf';

      const attachmentPath = CovePathResolver.getAttachmentPath(testProjectRoot, attachmentId, ext);
      const storageDir = CovePathResolver.getStorageDir(testProjectRoot, 'attachments');

      expect(attachmentPath).toContain(storageDir);
      expect(attachmentPath).toContain(`${attachmentId}.${ext}`);
    });

    it('should maintain consistency for agent workspace', () => {
      const agentId = 'agent-123';

      const workspace = CovePathResolver.getAgentWorkspace(testProjectRoot, agentId);
      const storageDir = CovePathResolver.getStorageDir(testProjectRoot, 'agents');

      expect(workspace).toContain(storageDir);
      expect(workspace).toContain(agentId);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const filePath = CovePathResolver.getFilePath(testProjectRoot, '', '');
      expect(filePath).toContain('.cove/storage');
    });

    it('should handle special characters in entity IDs', () => {
      const entityId = 'user-123_test@example.com';
      const filePath = CovePathResolver.getFilePath(testProjectRoot, 'users', entityId);
      expect(filePath).toContain(entityId);
    });

    it('should handle paths with trailing slashes', () => {
      const projectRootWithSlash = '/test/project/';
      const filePath = CovePathResolver.getFilePath(projectRootWithSlash, 'users', 'user-1');
      expect(filePath).toContain('.cove');
    });
  });
});
