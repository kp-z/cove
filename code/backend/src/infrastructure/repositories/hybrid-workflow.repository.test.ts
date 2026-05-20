/**
 * HybridWorkflowRepository Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HybridWorkflowRepository } from './hybrid-workflow.repository';
import { WorkflowEntity, WorkflowStatus } from '../../domain/models/workflow/workflow.entity';
import { TestDatabaseHelper } from './test-database.helper';
import { StorageService } from '../storage/storage.service';
import path from 'path';
import fs from 'fs/promises';

const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('HybridWorkflowRepository', () => {
  let testDb: TestDatabaseHelper;
  let repository: HybridWorkflowRepository;
  let storageService: StorageService;
  let testStorageRoot: string;

  beforeEach(async () => {
    testDb = new TestDatabaseHelper();
    await testDb.setup();

    testStorageRoot = path.join(process.cwd(), '.test-storage', `test-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });

    storageService = new StorageService(testStorageRoot);
    repository = new HybridWorkflowRepository(testDb.prisma, storageService, mockLogger);

    // Create test user and project
    await testDb.prisma.user.create({
      data: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        status: 'active',
        profilePath: '/metadata/user-1.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await testDb.prisma.project.create({
      data: {
        id: 'project-1',
        name: 'test-project',
        description: 'Test project',
        status: 'active',
        metadataPath: '/metadata',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  const createTestWorkflow = (overrides?: Partial<any>): WorkflowEntity => {
    return WorkflowEntity.create({
      workflowId: 'workflow-1',
      name: 'Test Workflow',
      description: 'Test workflow description',
      projectId: 'project-1',
      status: 'draft' as WorkflowStatus,
      steps: [
        [
          {
            id: 'step-1',
            taskId: 'task-1',
            timeoutMinutes: 30,
            onFailure: 'fail',
          },
        ],
        [
          {
            id: 'step-2',
            taskId: 'task-2',
          },
        ],
      ],
      triggers: [
        {
          triggerType: 'manual',
          enabled: true,
        },
      ],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      createdBy: {
        id: 'user-1',
        type: 'human',
      },
      meta: {
        tags: ['test'],
        category: 'automation',
      },
      ...overrides,
    });
  };

  describe('save', () => {
    it('should save a new workflow', async () => {
      const workflow = createTestWorkflow();

      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found).not.toBeNull();
      expect(found!.workflowId).toBe('workflow-1');
      expect(found!.name).toBe('Test Workflow');
      expect(found!.description).toBe('Test workflow description');
      expect(found!.projectId).toBe('project-1');
      expect(found!.status).toBe('draft');
    });

    it('should save workflow steps correctly', async () => {
      const workflow = createTestWorkflow();

      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.steps).toHaveLength(2);
      expect(found!.steps[0]).toHaveLength(1);
      expect(found!.steps[0][0].id).toBe('step-1');
      expect(found!.steps[0][0].taskId).toBe('task-1');
      expect(found!.steps[1][0].id).toBe('step-2');
    });

    it('should save workflow triggers correctly', async () => {
      const workflow = createTestWorkflow();

      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.triggers).toHaveLength(1);
      expect(found!.triggers[0].triggerType).toBe('manual');
      expect(found!.triggers[0].enabled).toBe(true);
    });

    it('should save workflow meta correctly', async () => {
      const workflow = createTestWorkflow();

      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.meta.tags).toEqual(['test']);
      expect(found!.meta.category).toBe('automation');
    });
  });

  describe('update', () => {
    it('should update an existing workflow', async () => {
      const workflow = createTestWorkflow();
      await repository.save(workflow, 'realm-1');

      const updatedWorkflow = workflow.updateName('Updated Workflow').updateDescription('Updated description');
      await repository.update(updatedWorkflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.name).toBe('Updated Workflow');
      expect(found!.description).toBe('Updated description');
    });

    it('should update workflow status', async () => {
      const workflow = createTestWorkflow();
      await repository.save(workflow, 'realm-1');

      const activeWorkflow = workflow.activate();
      await repository.update(activeWorkflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.status).toBe('active');
    });
  });

  describe('findById', () => {
    it('should find workflow by id', async () => {
      const workflow = createTestWorkflow();
      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');

      expect(found).not.toBeNull();
      expect(found!.workflowId).toBe('workflow-1');
    });

    it('should return null if workflow not found', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByProject', () => {
    beforeEach(async () => {
      const workflow1 = createTestWorkflow({
        workflowId: 'workflow-1',
        name: 'Workflow A',
      });
      const workflow2 = createTestWorkflow({
        workflowId: 'workflow-2',
        name: 'Workflow B',
      });
      const workflow3 = createTestWorkflow({
        workflowId: 'workflow-3',
        name: 'Workflow C',
      });

      await repository.save(workflow1, 'realm-1');
      await repository.save(workflow2, 'realm-1');
      await repository.save(workflow3, 'realm-1');
    });

    it('should find all workflows in a project', async () => {
      const workflows = await repository.findByProject('project-1');

      expect(workflows).toHaveLength(3);
    });

    it('should return workflows sorted by name', async () => {
      const workflows = await repository.findByProject('project-1');

      expect(workflows[0].name).toBe('Workflow A');
      expect(workflows[1].name).toBe('Workflow B');
      expect(workflows[2].name).toBe('Workflow C');
    });

    it('should return empty array if no workflows in project', async () => {
      const workflows = await repository.findByProject('non-existent-project');

      expect(workflows).toHaveLength(0);
    });
  });

  describe('findByKR', () => {
    beforeEach(async () => {
      const workflow1 = createTestWorkflow({
        workflowId: 'workflow-1',
        krId: 'kr-1',
      });
      const workflow2 = createTestWorkflow({
        workflowId: 'workflow-2',
        krId: 'kr-1',
      });
      const workflow3 = createTestWorkflow({
        workflowId: 'workflow-3',
        krId: 'kr-2',
      });

      await repository.save(workflow1, 'realm-1');
      await repository.save(workflow2, 'realm-1');
      await repository.save(workflow3, 'realm-1');
    });

    it('should find workflows by KR id', async () => {
      const workflows = await repository.findByKR('kr-1');

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => w.krId === 'kr-1')).toBe(true);
    });

    it('should return empty array if no workflows for KR', async () => {
      const workflows = await repository.findByKR('non-existent-kr');

      expect(workflows).toHaveLength(0);
    });
  });

  describe('findByStatus', () => {
    beforeEach(async () => {
      const workflow1 = createTestWorkflow({
        workflowId: 'workflow-1',
        status: 'draft' as WorkflowStatus,
      });
      const workflow2 = createTestWorkflow({
        workflowId: 'workflow-2',
        status: 'active' as WorkflowStatus,
      });
      const workflow3 = createTestWorkflow({
        workflowId: 'workflow-3',
        status: 'active' as WorkflowStatus,
      });

      await repository.save(workflow1, 'realm-1');
      await repository.save(workflow2, 'realm-1');
      await repository.save(workflow3, 'realm-1');
    });

    it('should find workflows by status', async () => {
      const workflows = await repository.findByStatus('active');

      expect(workflows).toHaveLength(2);
      expect(workflows.every(w => w.status === 'active')).toBe(true);
    });

    it('should return empty array if no workflows with status', async () => {
      const workflows = await repository.findByStatus('completed');

      expect(workflows).toHaveLength(0);
    });
  });

  describe('findActive', () => {
    it('should find only active workflows', async () => {
      const workflow1 = createTestWorkflow({
        workflowId: 'workflow-1',
        status: 'draft' as WorkflowStatus,
      });
      const workflow2 = createTestWorkflow({
        workflowId: 'workflow-2',
        status: 'active' as WorkflowStatus,
      });

      await repository.save(workflow1, 'realm-1');
      await repository.save(workflow2, 'realm-1');

      const workflows = await repository.findActive();

      expect(workflows).toHaveLength(1);
      expect(workflows[0].workflowId).toBe('workflow-2');
    });
  });

  describe('findAll', () => {
    it('should find all workflows', async () => {
      const workflow1 = createTestWorkflow({ workflowId: 'workflow-1' });
      const workflow2 = createTestWorkflow({ workflowId: 'workflow-2' });

      await repository.save(workflow1, 'realm-1');
      await repository.save(workflow2, 'realm-1');

      const workflows = await repository.findAll();

      expect(workflows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('delete', () => {
    it('should delete a workflow', async () => {
      const workflow = createTestWorkflow();
      await repository.save(workflow, 'realm-1');

      await repository.delete('workflow-1');

      const found = await repository.findById('workflow-1');
      expect(found).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true if workflow exists', async () => {
      const workflow = createTestWorkflow();
      await repository.save(workflow, 'realm-1');

      const exists = await repository.exists('workflow-1');

      expect(exists).toBe(true);
    });

    it('should return false if workflow does not exist', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('Workflow Status Transitions', () => {
    it('should handle status transitions correctly', async () => {
      const workflow = createTestWorkflow({ status: 'draft' as WorkflowStatus });
      await repository.save(workflow, 'realm-1');

      // Draft -> Active
      let updated = workflow.activate();
      await repository.update(updated, 'realm-1');
      let found = await repository.findById('workflow-1');
      expect(found!.status).toBe('active');

      // Active -> Paused
      updated = found!.pause();
      await repository.update(updated, 'realm-1');
      found = await repository.findById('workflow-1');
      expect(found!.status).toBe('paused');

      // Paused -> Archived
      updated = found!.archive();
      await repository.update(updated, 'realm-1');
      found = await repository.findById('workflow-1');
      expect(found!.status).toBe('archived');
    });
  });

  describe('Complex Workflow Steps', () => {
    it('should handle parallel steps in a stage', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Parallel Workflow',
        projectId: 'project-1',
        status: 'draft',
        steps: [
          [
            { id: 'step-1a', taskId: 'task-1a' },
            { id: 'step-1b', taskId: 'task-1b' },
            { id: 'step-1c', taskId: 'task-1c' },
          ],
        ],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: {},
      });

      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.steps[0]).toHaveLength(3);
    });

    it('should handle multiple sequential stages', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Sequential Workflow',
        projectId: 'project-1',
        status: 'draft',
        steps: [
          [{ id: 'step-1', taskId: 'task-1' }],
          [{ id: 'step-2', taskId: 'task-2' }],
          [{ id: 'step-3', taskId: 'task-3' }],
        ],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: {},
      });

      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.steps).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow without description', async () => {
      const workflow = createTestWorkflow({ description: undefined });
      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.description).toBeUndefined();
    });

    it('should handle workflow without krId', async () => {
      const workflow = createTestWorkflow({ krId: undefined });
      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.krId).toBeUndefined();
    });

    it('should handle workflow with empty triggers', async () => {
      const workflow = createTestWorkflow({ triggers: [] });
      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.triggers).toEqual([]);
    });

    it('should handle workflow with empty meta', async () => {
      const workflow = createTestWorkflow({ meta: {} });
      await repository.save(workflow, 'realm-1');

      const found = await repository.findById('workflow-1');
      expect(found!.meta).toEqual({});
    });
  });
});
