import { describe, it, expect } from 'vitest';
import { TaskEntity } from './task.entity';
import { AssigneeRef } from '../value-objects';
import { ActorRef } from '../value-objects';

describe('TaskEntity', () => {
  const validProps = {
    taskId: 'task-001',
    title: '完成架构设计文档',
    taskType: 'single_agent' as const,
    priority: 'P0' as const,
    status: 'todo' as const,
    channelId: 'channel-001',
    projectId: 'proj-001',
    createdBy: ActorRef.create({ id: 'user-001', type: 'human' }),
    createdAt: new Date('2026-05-02T10:00:00Z'),
  };

  describe('creation', () => {
    it('should create a task with valid properties', () => {
      const task = TaskEntity.create(validProps);

      expect(task.taskId).toBe('task-001');
      expect(task.title).toBe('完成架构设计文档');
      expect(task.taskType).toBe('single_agent');
      expect(task.priority).toBe('P0');
      expect(task.status).toBe('todo');
    });

    it('should throw error for empty taskId', () => {
      expect(() => {
        TaskEntity.create({ ...validProps, taskId: '' });
      }).toThrow('Task ID cannot be empty');
    });

    it('should throw error for empty title', () => {
      expect(() => {
        TaskEntity.create({ ...validProps, title: '' });
      }).toThrow('Task title cannot be empty');
    });

    it('should throw error for invalid status', () => {
      expect(() => {
        TaskEntity.create({ ...validProps, status: 'running' as any });
      }).toThrow('Invalid task status');
    });

    it('should default dependsOn to empty array', () => {
      const task = TaskEntity.create(validProps);
      expect(task.dependsOn).toEqual([]);
    });
  });

  describe('status flow: todo → in_progress → in_review → done', () => {
    it('should transition from todo to in_progress', () => {
      const task = TaskEntity.create(validProps);
      const started = task.start();

      expect(started.status).toBe('in_progress');
      expect(task.status).toBe('todo'); // immutable
    });

    it('should transition from in_progress to in_review', () => {
      const task = TaskEntity.create({ ...validProps, status: 'in_progress' });
      const reviewed = task.submitForReview();

      expect(reviewed.status).toBe('in_review');
    });

    it('should transition from in_review to done', () => {
      const task = TaskEntity.create({ ...validProps, status: 'in_review' });
      const done = task.complete();

      expect(done.status).toBe('done');
    });

    it('should not skip from todo to in_review', () => {
      const task = TaskEntity.create(validProps);
      expect(() => task.submitForReview()).toThrow('Cannot submit for review');
    });

    it('should not skip from todo to done', () => {
      const task = TaskEntity.create(validProps);
      expect(() => task.complete()).toThrow('Cannot complete');
    });

    it('should not go back from done to in_progress', () => {
      const task = TaskEntity.create({ ...validProps, status: 'done' });
      expect(() => task.start()).toThrow('Cannot start');
    });

    it('should allow blocking from any non-done status', () => {
      const task = TaskEntity.create({ ...validProps, status: 'in_progress' });
      const blocked = task.block();

      expect(blocked.status).toBe('blocked');
    });

    it('should allow cancelling from any non-done status', () => {
      const task = TaskEntity.create(validProps);
      const cancelled = task.cancel();

      expect(cancelled.status).toBe('cancelled');
    });

    it('should not cancel a done task', () => {
      const task = TaskEntity.create({ ...validProps, status: 'done' });
      expect(() => task.cancel()).toThrow('Cannot cancel');
    });
  });

  describe('assignment', () => {
    it('should assign to an agent', () => {
      const task = TaskEntity.create(validProps);
      const assignee = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt: new Date(),
      });
      const assigned = task.assignTo(assignee);

      expect(assigned.assignee?.id).toBe('agent-001');
      expect(task.assignee).toBeUndefined(); // immutable
    });

    it('should claim task (assign + start)', () => {
      const task = TaskEntity.create(validProps);
      const assignee = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt: new Date(),
      });
      const claimed = task.claim(assignee);

      expect(claimed.assignee?.id).toBe('agent-001');
      expect(claimed.status).toBe('in_progress');
    });
  });

  describe('dependencies', () => {
    it('should add a dependency', () => {
      const task = TaskEntity.create(validProps);
      const updated = task.addDependency('task-000');

      expect(updated.dependsOn).toEqual(['task-000']);
    });

    it('should not add duplicate dependency', () => {
      const task = TaskEntity.create({
        ...validProps,
        dependsOn: ['task-000'],
      });
      expect(() => task.addDependency('task-000')).toThrow('Dependency already exists');
    });

    it('should not depend on itself', () => {
      const task = TaskEntity.create(validProps);
      expect(() => task.addDependency('task-001')).toThrow('Task cannot depend on itself');
    });

    it('should remove a dependency', () => {
      const task = TaskEntity.create({
        ...validProps,
        dependsOn: ['task-000', 'task-002'],
      });
      const updated = task.removeDependency('task-000');

      expect(updated.dependsOn).toEqual(['task-002']);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const task = TaskEntity.create(validProps);
      const json = task.toJSON();

      expect(json.task_id).toBe('task-001');
      expect(json.title).toBe('完成架构设计文档');
      expect(json.status).toBe('todo');
      expect(json.depends_on).toEqual([]);
    });

    it('should deserialize from JSON', () => {
      const json = {
        task_id: 'task-001',
        title: '完成架构设计文档',
        task_type: 'single_agent' as const,
        priority: 'P0' as const,
        status: 'todo' as const,
        channel_id: 'channel-001',
        project_id: 'proj-001',
        depends_on: ['task-000'],
        created_by: { id: 'user-001', type: 'human' as const },
        created_at: '2026-05-02T10:00:00.000Z',
      };
      const task = TaskEntity.fromJSON(json);

      expect(task.taskId).toBe('task-001');
      expect(task.dependsOn).toEqual(['task-000']);
    });
  });

  describe('equality', () => {
    it('should be equal when taskId matches', () => {
      const t1 = TaskEntity.create(validProps);
      const t2 = TaskEntity.create({ ...validProps, title: 'Different' });

      expect(t1.equals(t2)).toBe(true);
    });
  });
});
