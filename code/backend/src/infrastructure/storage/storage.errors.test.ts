import { describe, it, expect } from 'vitest';
import {
  StorageError,
  StorageFileNotFoundError,
  StoragePathResolutionError,
} from './storage.errors';
import { ERROR_CODES } from '../../common/errors/error-codes';

describe('Storage Errors', () => {
  describe('StorageError', () => {
    it('should create error with correct message and context', () => {
      const error = new StorageError('write', 'disk full');

      expect(error.message).toBe('Storage operation failed: write - disk full');
      expect(error.code).toBe(ERROR_CODES.STORAGE_ERROR);
      expect(error.context).toEqual({
        operation: 'write',
        reason: 'disk full',
      });
    });

    it('should handle different operations', () => {
      const error = new StorageError('read', 'permission denied');

      expect(error.message).toBe('Storage operation failed: read - permission denied');
      expect(error.context).toEqual({
        operation: 'read',
        reason: 'permission denied',
      });
    });

    it('should be instance of Error', () => {
      const error = new StorageError('delete', 'file locked');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StorageFileNotFoundError', () => {
    it('should create error with correct message and context', () => {
      const error = new StorageFileNotFoundError('/data/users/user-123.json');

      expect(error.message).toBe('File not found: /data/users/user-123.json');
      expect(error.code).toBe(ERROR_CODES.STORAGE_FILE_NOT_FOUND);
      expect(error.context).toEqual({
        filePath: '/data/users/user-123.json',
      });
    });

    it('should handle relative paths', () => {
      const error = new StorageFileNotFoundError('config/settings.json');

      expect(error.message).toBe('File not found: config/settings.json');
      expect(error.context).toEqual({
        filePath: 'config/settings.json',
      });
    });

    it('should be instance of Error', () => {
      const error = new StorageFileNotFoundError('/tmp/test.txt');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('StoragePathResolutionError', () => {
    it('should create error with correct message and context', () => {
      const error = new StoragePathResolutionError('../../../etc/passwd', 'path traversal detected');

      expect(error.message).toBe('Failed to resolve path: ../../../etc/passwd - path traversal detected');
      expect(error.code).toBe(ERROR_CODES.STORAGE_PATH_RESOLUTION_ERROR);
      expect(error.context).toEqual({
        path: '../../../etc/passwd',
        reason: 'path traversal detected',
      });
    });

    it('should handle different resolution failures', () => {
      const error = new StoragePathResolutionError('/invalid/path', 'contains null bytes');

      expect(error.message).toBe('Failed to resolve path: /invalid/path - contains null bytes');
      expect(error.context).toEqual({
        path: '/invalid/path',
        reason: 'contains null bytes',
      });
    });

    it('should be instance of Error', () => {
      const error = new StoragePathResolutionError('bad/path', 'invalid characters');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
