import { describe, it, expect } from 'vitest';
import { WorkflowEntity } from './workflow.entity';

describe('WorkflowEntity', () => {
  const validProps = {
    workflowId: 'workflow-001',
    name: '核心功能开发流程',
    description: 'Agent、Task、Channel 核心功能的开发和测试流程',
    projectId: 'proj-001',
    status: 'active' as const,
    steps: [
      [
        {
          id: 'step_001',
          taskId: 'task-001',
          timeoutMinutes: 60,
          onFailure: 'fail' as const,
        },
      ],
      [
        {
          id: 'step_002',
          taskId: 'task-002',
          condition: "step_001.status == 'done'",
          timeoutMinutes: 30,
          onFailure: 'fail' as const,
        },
      ],
    ],
    triggers: [
      {
        triggerType: 'manual' as const,
        enabled: true,
      },
    ],
    createdAt: new Date('2026-04-26T00:00:00Z'),
    updatedAt: new Date('2026-05-02T10:00:00Z'),
    createdBy: {
      id: 'user-001',
      type: 'human' as const,
    },
    meta: {
      tags: ['development', 'core-features'],
      category: 'engineering',
    },
  };

  describe('create', () => {
    it('should create a valid workflow entity', () => {
      const workflow = WorkflowEntity.create(validProps);

      expect(workflow.workflowId).toBe('workflow-001');
      expect(workflow.name).toBe('核心功能开发流程');
      expect(workflow.status).toBe('active');
    });

    it('should throw error if workflowId is empty', () => {
      expect(() =>
        WorkflowEntity.create({ ...validProps, workflowId: '' })
      ).toThrow('Workflow ID cannot be empty');
    });

    it('should throw error if name is empty', () => {
      expect(() =>
        WorkflowEntity.create({ ...validProps, name: '' })
      ).toThrow('Workflow name cannot be empty');
    });

    it('should throw error if step IDs are not unique', () => {
      expect(() =>
        WorkflowEntity.create({
          ...validProps,
          steps: [
            [{ id: 'step_001', taskId: 'task-001' }],
            [{ id: 'step_001', taskId: 'task-002' }],
          ],
        })
      ).toThrow('Duplicate step ID: step_001');
    });
  });

  describe('status checks', () => {
    it('should correctly identify workflow status', () => {
      const workflow = WorkflowEntity.create(validProps);
      expect(workflow.isActive()).toBe(true);
      expect(workflow.isDraft()).toBe(false);
      expect(workflow.isPaused()).toBe(false);
    });
  });

  describe('step operations', () => {
    it('should get step by id', () => {
      const workflow = WorkflowEntity.create(validProps);
      const step = workflow.getStep('step_001');
      expect(step).toBeDefined();
      expect(step?.taskId).toBe('task-001');
    });

    it('should check if step exists', () => {
      const workflow = WorkflowEntity.create(validProps);
      expect(workflow.hasStep('step_001')).toBe(true);
      expect(workflow.hasStep('step_999')).toBe(false);
    });

    it('should get total steps count', () => {
      const workflow = WorkflowEntity.create(validProps);
      expect(workflow.getTotalSteps()).toBe(2);
    });

    it('should get total stages count', () => {
      const workflow = WorkflowEntity.create(validProps);
      expect(workflow.getTotalStages()).toBe(2);
    });

    it('should identify parallel stages', () => {
      const workflow = WorkflowEntity.create({
        ...validProps,
        steps: [
          [
            { id: 'step_001', taskId: 'task-001' },
            { id: 'step_002', taskId: 'task-002' },
          ],
        ],
      });
      expect(workflow.isParallelStage(0)).toBe(true);
    });
  });

  describe('status transitions', () => {
    it('should activate workflow', () => {
      const workflow = WorkflowEntity.create({
        ...validProps,
        status: 'draft',
      });
      const updated = workflow.activate();
      expect(updated.status).toBe('active');
    });

    it('should pause workflow', () => {
      const workflow = WorkflowEntity.create(validProps);
      const updated = workflow.pause();
      expect(updated.status).toBe('paused');
    });

    it('should resume workflow', () => {
      const workflow = WorkflowEntity.create({
        ...validProps,
        status: 'paused',
      });
      const updated = workflow.resume();
      expect(updated.status).toBe('active');
    });

    it('should complete workflow', () => {
      const workflow = WorkflowEntity.create(validProps);
      const updated = workflow.complete();
      expect(updated.status).toBe('completed');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const workflow = WorkflowEntity.create(validProps);
      const json = workflow.toJSON();

      expect(json.workflow_id).toBe('workflow-001');
      expect(json.name).toBe('核心功能开发流程');
      expect(json.status).toBe('active');
    });

    it('should deserialize from JSON', () => {
      const workflow = WorkflowEntity.create(validProps);
      const json = workflow.toJSON();
      const deserialized = WorkflowEntity.fromJSON(json);

      expect(deserialized.workflowId).toBe(workflow.workflowId);
      expect(deserialized.name).toBe(workflow.name);
    });
  });
});
