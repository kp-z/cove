import { describe, it, expect } from 'vitest';
import { ExecutionEntity } from './execution.entity';

describe('ExecutionEntity', () => {
  const validProps = {
    executionId: 'exec-001',
    agentId: 'agent-001',
    taskId: 'task-001',
    conversationId: 'conv-001',
    inputMessageId: 'msg-001',
    status: 'running' as const,
    logFile: 'executions/exec-001/execution.jsonl',
    logSizeBytes: 524288,
    fileChanges: [],
    startedAt: new Date('2026-05-02T10:00:00Z'),
    toolCalls: [],
    skillInvocations: [],
    errors: [],
    meta: {
      tags: ['architecture', 'design'],
      category: 'development',
    },
  };

  describe('create', () => {
    it('should create a valid execution entity', () => {
      const execution = ExecutionEntity.create(validProps);
      expect(execution.executionId).toBe('exec-001');
      expect(execution.status).toBe('running');
    });

    it('should throw error if executionId is empty', () => {
      expect(() =>
        ExecutionEntity.create({ ...validProps, executionId: '' })
      ).toThrow('Execution ID cannot be empty');
    });

    it('should throw error if agentId is empty', () => {
      expect(() =>
        ExecutionEntity.create({ ...validProps, agentId: '' })
      ).toThrow('Agent ID cannot be empty');
    });
  });

  describe('status checks', () => {
    it('should correctly identify status', () => {
      const execution = ExecutionEntity.create(validProps);
      expect(execution.isRunning()).toBe(true);
      expect(execution.isCompleted()).toBe(false);
      expect(execution.isFailed()).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('should start execution', () => {
      const execution = ExecutionEntity.create({
        ...validProps,
        status: 'pending',
      });
      const updated = execution.start();
      expect(updated.status).toBe('running');
    });

    it('should complete execution', () => {
      const execution = ExecutionEntity.create(validProps);
      const updated = execution.complete(0);
      expect(updated.status).toBe('completed');
      expect(updated.exitCode).toBe(0);
      expect(updated.completedAt).toBeDefined();
    });

    it('should fail execution', () => {
      const execution = ExecutionEntity.create(validProps);
      const updated = execution.fail(1);
      expect(updated.status).toBe('failed');
      expect(updated.exitCode).toBe(1);
    });

    it('should cancel execution', () => {
      const execution = ExecutionEntity.create(validProps);
      const updated = execution.cancel();
      expect(updated.status).toBe('cancelled');
    });
  });

  describe('file changes', () => {
    it('should add file change', () => {
      const execution = ExecutionEntity.create(validProps);
      const fileChange = {
        filePath: 'src/test.ts',
        changeType: 'create' as const,
        linesAdded: 100,
        linesDeleted: 0,
      };
      const updated = execution.addFileChange(fileChange);
      expect(updated.fileChanges.length).toBe(1);
    });

    it('should get files by change type', () => {
      const execution = ExecutionEntity.create({
        ...validProps,
        fileChanges: [
          {
            filePath: 'src/new.ts',
            changeType: 'create' as const,
            linesAdded: 100,
            linesDeleted: 0,
          },
          {
            filePath: 'src/old.ts',
            changeType: 'modify' as const,
            linesAdded: 10,
            linesDeleted: 5,
          },
        ],
      });
      expect(execution.getFilesCreated().length).toBe(1);
      expect(execution.getFilesModified().length).toBe(1);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const execution = ExecutionEntity.create(validProps);
      const json = execution.toJSON();
      expect(json.execution_id).toBe('exec-001');
      expect(json.status).toBe('running');
    });

    it('should deserialize from JSON', () => {
      const execution = ExecutionEntity.create(validProps);
      const json = execution.toJSON();
      const deserialized = ExecutionEntity.fromJSON(json);
      expect(deserialized.executionId).toBe(execution.executionId);
    });
  });
});
