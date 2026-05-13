import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowValidationService,
  Workflow,
  WorkflowStep,
} from './workflow-validation.service';

describe('WorkflowValidationService', () => {
  let service: WorkflowValidationService;
  let availableTaskIds: Set<string>;

  beforeEach(() => {
    service = new WorkflowValidationService();
    availableTaskIds = new Set(['task-1', 'task-2', 'task-3', 'task-4']);
  });

  describe('validate', () => {
    it('should validate a correct workflow', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [
            { id: 'step-2', taskId: 'task-2' },
            { id: 'step-3', taskId: 'task-3' },
          ],
          [{ id: 'step-4', taskId: 'task-4' }],
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate step IDs', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [{ id: 'step-1', taskId: 'task-2' }], // Duplicate ID
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'duplicate_step_id',
        message: 'Duplicate step ID: step-1',
        stepId: 'step-1',
        stageIndex: 1,
      });
    });

    it('should detect empty stages', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [], // Empty stage
          [{ id: 'step-2', taskId: 'task-2' }],
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'empty_stage',
        message: 'Stage 1 is empty',
        stageIndex: 1,
      });
    });

    it('should detect missing tasks', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [{ id: 'step-2', taskId: 'task-999' }], // Missing task
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        type: 'missing_task',
        message: 'Task task-999 not found',
        stepId: 'step-2',
        stageIndex: 1,
      });
    });

    it('should detect multiple errors', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [], // Empty stage
          [
            { id: 'step-1', taskId: 'task-2' }, // Duplicate ID
            { id: 'step-3', taskId: 'task-999' }, // Missing task
          ],
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].type).toBe('empty_stage');
      expect(result.errors[1].type).toBe('duplicate_step_id');
      expect(result.errors[2].type).toBe('missing_task');
    });

    it('should handle workflow with conditions', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1', condition: 'status === "ready"' }],
          [{ id: 'step-2', taskId: 'task-2', condition: 'approved === true' }],
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty workflow', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Empty Workflow',
        steps: [],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle workflow with single stage', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Single Stage Workflow',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle parallel steps in same stage', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Parallel Workflow',
        steps: [
          [
            { id: 'step-1', taskId: 'task-1' },
            { id: 'step-2', taskId: 'task-2' },
            { id: 'step-3', taskId: 'task-3' },
          ],
        ],
      };

      const result = service.validate(workflow, availableTaskIds);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getTotalSteps', () => {
    it('should count total steps in workflow', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [
            { id: 'step-2', taskId: 'task-2' },
            { id: 'step-3', taskId: 'task-3' },
          ],
          [{ id: 'step-4', taskId: 'task-4' }],
        ],
      };

      expect(service.getTotalSteps(workflow)).toBe(4);
    });

    it('should return 0 for empty workflow', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Empty Workflow',
        steps: [],
      };

      expect(service.getTotalSteps(workflow)).toBe(0);
    });

    it('should handle workflow with empty stages', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [],
          [{ id: 'step-2', taskId: 'task-2' }],
        ],
      };

      expect(service.getTotalSteps(workflow)).toBe(2);
    });

    it('should count all parallel steps', () => {
      const workflow: Workflow = {
        id: 'wf-1',
        name: 'Parallel Workflow',
        steps: [
          [
            { id: 'step-1', taskId: 'task-1' },
            { id: 'step-2', taskId: 'task-2' },
            { id: 'step-3', taskId: 'task-3' },
            { id: 'step-4', taskId: 'task-4' },
          ],
        ],
      };

      expect(service.getTotalSteps(workflow)).toBe(4);
    });
  });
});
