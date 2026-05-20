import { describe, it, expect } from 'vitest';
import {
  RepositoryError,
  RepositoryEntityNotFoundError,
  RepositorySaveError,
} from './repository.errors';
import { ERROR_CODES } from '../../common/errors/error-codes';

describe('Repository Errors', () => {
  describe('RepositoryError', () => {
    it('should create error with correct message and metadata', () => {
      const error = new RepositoryError('save', 'User', 'database connection failed');

      expect(error.message).toBe(
        'Repository operation failed: save on User - database connection failed'
      );
      expect(error.code).toBe(ERROR_CODES.REPOSITORY_ERROR);
      expect(error.context).toEqual({
        operation: 'save',
        entityType: 'User',
        reason: 'database connection failed',
      });
    });

    it('should be instance of Error', () => {
      const error = new RepositoryError('update', 'Project', 'constraint violation');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RepositoryEntityNotFoundError', () => {
    it('should create error with correct message and metadata', () => {
      const error = new RepositoryEntityNotFoundError('User', 'user-123');

      expect(error.message).toBe('User not found: user-123');
      expect(error.code).toBe(ERROR_CODES.REPOSITORY_ENTITY_NOT_FOUND);
      expect(error.context).toEqual({
        entityType: 'User',
        identifier: 'user-123',
      });
    });

    it('should handle different entity types', () => {
      const error = new RepositoryEntityNotFoundError('Task', 'task-456');

      expect(error.message).toBe('Task not found: task-456');
      expect(error.context).toEqual({
        entityType: 'Task',
        identifier: 'task-456',
      });
    });

    it('should be instance of Error', () => {
      const error = new RepositoryEntityNotFoundError('Channel', 'ch-789');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RepositorySaveError', () => {
    it('should create error with correct message and metadata', () => {
      const error = new RepositorySaveError('User', 'user-123', 'unique constraint violation');

      expect(error.message).toBe('Failed to save User user-123: unique constraint violation');
      expect(error.code).toBe(ERROR_CODES.REPOSITORY_SAVE_ERROR);
      expect(error.context).toEqual({
        entityType: 'User',
        entityId: 'user-123',
        reason: 'unique constraint violation',
      });
    });

    it('should handle different save failure reasons', () => {
      const error = new RepositorySaveError('Task', 'task-456', 'foreign key constraint failed');

      expect(error.message).toBe('Failed to save Task task-456: foreign key constraint failed');
      expect(error.context).toEqual({
        entityType: 'Task',
        entityId: 'task-456',
        reason: 'foreign key constraint failed',
      });
    });

    it('should be instance of Error', () => {
      const error = new RepositorySaveError('Project', 'proj-789', 'timeout');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
