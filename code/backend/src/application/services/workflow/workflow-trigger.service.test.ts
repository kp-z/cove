import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowTriggerService } from './workflow-trigger.service';
import { WorkflowEntity, WorkflowTrigger } from '../../../domain/models/workflow/workflow.entity';
import { WorkflowNotFoundError } from './workflow.service';
import {
  IWorkflowRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';

describe('WorkflowTriggerService', () => {
  let service: WorkflowTriggerService;
  let mockWorkflowRepository: IWorkflowRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockWorkflowRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as unknown as IWorkflowRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new WorkflowTriggerService(
      mockWorkflowRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('addTrigger', () => {
    it('should add trigger to workflow successfully', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers: [],
        steps: [],
        createdAt: new Date(),
      });

      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'manual',
        enabled: true,
        config: {},
      };

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);

      const result = await service.addTrigger({
        workflowId: 'wf-1',
        trigger,
      });

      expect(result.triggers).toHaveLength(1);
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.trigger_added',
        })
      );
    });

    it('should throw WorkflowNotFoundError when workflow not found', async () => {
      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(null);

      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'manual',
        enabled: true,
        config: {},
      };

      await expect(
        service.addTrigger({ workflowId: 'nonexistent', trigger })
      ).rejects.toThrow(WorkflowNotFoundError);
    });
  });

  describe('updateTrigger', () => {
    it('should update trigger successfully', async () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'manual',
        enabled: true,
        config: {},
      };

      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers: [trigger],
        steps: [],
        createdAt: new Date(),
      });

      const updatedTrigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'scheduled',
        enabled: true,
        config: { cron: '0 0 * * *' },
      };

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);

      const result = await service.updateTrigger({
        workflowId: 'wf-1',
        triggerIndex: 0,
        trigger: updatedTrigger,
      });

      expect(result.triggers[0].type).toBe('scheduled');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.trigger_updated',
        })
      );
    });
  });

  describe('enableTrigger', () => {
    it('should enable trigger successfully', async () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'manual',
        enabled: false,
        config: {},
      };

      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers: [trigger],
        steps: [],
        createdAt: new Date(),
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);

      const result = await service.enableTrigger({
        workflowId: 'wf-1',
        triggerIndex: 0,
      });

      expect(result.triggers[0].enabled).toBe(true);
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.trigger_enabled',
        })
      );
    });
  });

  describe('disableTrigger', () => {
    it('should disable trigger successfully', async () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'manual',
        enabled: true,
        config: {},
      };

      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers: [trigger],
        steps: [],
        createdAt: new Date(),
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);

      const result = await service.disableTrigger({
        workflowId: 'wf-1',
        triggerIndex: 0,
      });

      expect(result.triggers[0].enabled).toBe(false);
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.trigger_disabled',
        })
      );
    });
  });

  describe('getWorkflowTriggers', () => {
    it('should return all workflow triggers', async () => {
      const triggers: WorkflowTrigger[] = [
        { id: 'trigger-1', type: 'manual', enabled: true, config: {} },
        { id: 'trigger-2', type: 'scheduled', enabled: false, config: {} },
      ];

      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers,
        steps: [],
        createdAt: new Date(),
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);

      const result = await service.getWorkflowTriggers('wf-1');

      expect(result).toHaveLength(2);
      expect(result).toEqual(triggers);
    });
  });

  describe('getEnabledTriggers', () => {
    it('should return only enabled triggers', async () => {
      const triggers: WorkflowTrigger[] = [
        { id: 'trigger-1', type: 'manual', enabled: true, config: {} },
        { id: 'trigger-2', type: 'scheduled', enabled: false, config: {} },
        { id: 'trigger-3', type: 'event', enabled: true, config: {} },
      ];

      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers,
        steps: [],
        createdAt: new Date(),
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);

      const result = await service.getEnabledTriggers('wf-1');

      expect(result).toHaveLength(2);
      expect(result.every(t => t.enabled)).toBe(true);
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'wf-1',
        projectId: 'proj-1',
        name: 'Test Workflow',
        description: 'Test',
        status: 'active',
        triggers: [],
        steps: [],
        createdAt: new Date(),
      });

      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'manual',
        enabled: true,
        config: {},
      };

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(workflow);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      await expect(
        service.addTrigger({ workflowId: 'wf-1', trigger })
      ).resolves.toBeDefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'workflow.trigger_added',
        })
      );
    });
  });
});
