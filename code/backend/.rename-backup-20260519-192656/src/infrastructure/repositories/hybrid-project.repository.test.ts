import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { HybridProjectRepository } from './hybrid-project.repository';
import { ProjectEntity, ProjectStatus } from '../../domain/models/project/project.entity';
import { StorageService } from '../storage/storage.service';
import { TestDatabaseHelper } from './test-database.helper';
import { ILogger } from '../../application/interfaces/logger.interface';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Simple test logger
class TestLogger implements ILogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
  child() { return this; }
  setLevel() {}
}

describe('HybridProjectRepository Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let repository: HybridProjectRepository;
  let storageService: StorageService;
  let testStorageRoot: string;

  beforeAll(async () => {
    // Setup test database
    dbHelper = new TestDatabaseHelper();
    await dbHelper.setup();

    // Setup test storage
    testStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cove-project-repo-test-'));
    storageService = new StorageService(testStorageRoot);

    // Create repository
    const logger = new TestLogger();
    repository = new HybridProjectRepository(
      dbHelper.getPrisma(),
      storageService,
      logger
    );
  });

  afterAll(async () => {
    await dbHelper.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await dbHelper.clearAllTables();

    // Create a test user for foreign key constraint
    await dbHelper.getPrisma().user.create({
      data: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        status: 'active',
        profilePath: 'storage/users/user-1.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create another test user
    await dbHelper.getPrisma().user.create({
      data: {
        id: 'user-2',
        username: 'testuser2',
        email: 'test2@example.com',
        displayName: 'Test User 2',
        role: 'user',
        status: 'active',
        profilePath: 'storage/users/user-2.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create owner users
    await dbHelper.getPrisma().user.create({
      data: {
        id: 'owner-1',
        username: 'owner1',
        email: 'owner1@example.com',
        displayName: 'Owner 1',
        role: 'owner',
        status: 'active',
        profilePath: 'storage/users/owner-1.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await dbHelper.getPrisma().user.create({
      data: {
        id: 'owner-2',
        username: 'owner2',
        email: 'owner2@example.com',
        displayName: 'Owner 2',
        role: 'owner',
        status: 'active',
        profilePath: 'storage/users/owner-2.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  describe('save', () => {
    it('should save project to database and storage', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project Display',
        description: 'A test project',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: ['channel-1', 'channel-2'],
        agentIds: ['agent-1'],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project);

      // Verify database record
      const dbRecord = await dbHelper.getPrisma().project.findUnique({
        where: { id: 'proj-1' },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.name).toBe('Test Project');
      expect(dbRecord?.ownerId).toBe('user-1');

      // Verify storage file
      const content = await storageService.loadJson(dbRecord!.metadataPath);
      expect(content.displayName).toBe('Test Project Display');
      expect(content.channelIds).toEqual(['channel-1', 'channel-2']);
    });

    it('should save project without description', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-2',
        name: 'No Description Project',
        displayName: 'No Desc',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'public',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project);

      const savedProject = await repository.findById('proj-2');
      expect(savedProject).toBeDefined();
      expect(savedProject?.description).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find project by id', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-3',
        name: 'Find Project',
        displayName: 'Find Me',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: ['channel-1'],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project);

      const foundProject = await repository.findById('proj-3');
      expect(foundProject).toBeDefined();
      expect(foundProject?.name).toBe('Find Project');
      expect(foundProject?.displayName).toBe('Find Me');
      expect(foundProject?.channelIds).toEqual(['channel-1']);
    });

    it('should return null for non-existent project', async () => {
      const foundProject = await repository.findById('non-existent');
      expect(foundProject).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('should find all projects by owner', async () => {
      const project1 = ProjectEntity.create({
        projectId: 'proj-4',
        name: 'Owner Project 1',
        displayName: 'OP1',
        ownerId: 'owner-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      const project2 = ProjectEntity.create({
        projectId: 'proj-5',
        name: 'Owner Project 2',
        displayName: 'OP2',
        ownerId: 'owner-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      const project3 = ProjectEntity.create({
        projectId: 'proj-6',
        name: 'Other Owner Project',
        displayName: 'OOP',
        ownerId: 'owner-2',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project1);
      await repository.save(project2);
      await repository.save(project3);

      const ownerProjects = await repository.findByOwner('owner-1');
      expect(ownerProjects).toHaveLength(2);
      expect(ownerProjects.map(p => p.projectId)).toEqual(expect.arrayContaining(['proj-4', 'proj-5']));
    });

    it('should return empty array when owner has no projects', async () => {
      const projects = await repository.findByOwner('no-projects-owner');
      expect(projects).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find all projects with specific status', async () => {
      const activeProject = ProjectEntity.create({
        projectId: 'proj-7',
        name: 'Active Project',
        displayName: 'Active',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      const archivedProject = ProjectEntity.create({
        projectId: 'proj-8',
        name: 'Archived Project',
        displayName: 'Archived',
        ownerId: 'user-1',
        status: 'archived' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(activeProject);
      await repository.save(archivedProject);

      const activeProjects = await repository.findByStatus('active' as ProjectStatus);
      expect(activeProjects).toHaveLength(1);
      expect(activeProjects[0].projectId).toBe('proj-7');
    });

    it('should return empty array when no projects with status', async () => {
      const projects = await repository.findByStatus('active' as ProjectStatus);
      expect(projects).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should find all projects', async () => {
      const project1 = ProjectEntity.create({
        projectId: 'proj-9',
        name: 'Project 1',
        displayName: 'P1',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      const project2 = ProjectEntity.create({
        projectId: 'proj-10',
        name: 'Project 2',
        displayName: 'P2',
        ownerId: 'user-2',
        status: 'archived' as ProjectStatus,
        visibility: 'public',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project1);
      await repository.save(project2);

      const allProjects = await repository.findAll();
      expect(allProjects).toHaveLength(2);
      expect(allProjects.map(p => p.projectId)).toEqual(expect.arrayContaining(['proj-9', 'proj-10']));
    });

    it('should return empty array when no projects', async () => {
      const allProjects = await repository.findAll();
      expect(allProjects).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update project in database and storage', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-11',
        name: 'Update Project',
        displayName: 'Update',
        description: 'Original description',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: ['channel-1'],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project);

      // Update project
      const updatedProject = ProjectEntity.create({
        projectId: 'proj-11',
        name: 'Updated Project',
        displayName: 'Updated Display',
        description: 'Updated description',
        ownerId: 'user-1',
        status: 'archived' as ProjectStatus,
        visibility: 'public',
        channelIds: ['channel-1', 'channel-2'],
        agentIds: ['agent-1'],
        okrIds: ['okr-1'],
        createdAt: project.createdAt,
      });

      await repository.update(updatedProject);

      // Verify update
      const foundProject = await repository.findById('proj-11');
      expect(foundProject).toBeDefined();
      expect(foundProject?.name).toBe('Updated Project');
      expect(foundProject?.displayName).toBe('Updated Display');
      expect(foundProject?.status).toBe('archived');
      expect(foundProject?.channelIds).toEqual(['channel-1', 'channel-2']);
      expect(foundProject?.agentIds).toEqual(['agent-1']);
    });
  });

  describe('delete', () => {
    it('should delete project from database and storage', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-12',
        name: 'Delete Project',
        displayName: 'Delete',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project);

      // Verify project exists
      let foundProject = await repository.findById('proj-12');
      expect(foundProject).toBeDefined();

      // Delete project
      await repository.delete('proj-12');

      // Verify project is deleted
      foundProject = await repository.findById('proj-12');
      expect(foundProject).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing project', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-13',
        name: 'Exists Project',
        displayName: 'Exists',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: [],
        agentIds: [],
        okrIds: [],
        createdAt: new Date(),
      });

      await repository.save(project);

      const exists = await repository.exists('proj-13');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent project', async () => {
      const exists = await repository.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent saves', async () => {
      const projects = Array.from({ length: 5 }, (_, i) =>
        ProjectEntity.create({
          projectId: `concurrent-${i}`,
          name: `Concurrent Project ${i}`,
          displayName: `CP${i}`,
          ownerId: 'user-1',
          status: 'active' as ProjectStatus,
          visibility: 'private',
          channelIds: [],
          agentIds: [],
          okrIds: [],
          createdAt: new Date(),
        })
      );

      await Promise.all(projects.map(project => repository.save(project)));

      const allProjects = await repository.findAll();
      expect(allProjects.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('transaction consistency', () => {
    it('should maintain consistency between database and storage', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-14',
        name: 'Consistent Project',
        displayName: 'Consistent',
        ownerId: 'user-1',
        status: 'active' as ProjectStatus,
        visibility: 'private',
        channelIds: ['channel-1', 'channel-2'],
        agentIds: ['agent-1'],
        okrIds: ['okr-1'],
        createdAt: new Date(),
      });

      await repository.save(project);

      // Verify database
      const dbRecord = await dbHelper.getPrisma().project.findUnique({
        where: { id: 'proj-14' },
      });
      expect(dbRecord).toBeDefined();

      // Verify storage
      const content = await storageService.loadJson(dbRecord!.metadataPath);
      expect(content.channelIds).toEqual(['channel-1', 'channel-2']);
      expect(content.agentIds).toEqual(['agent-1']);

      // Verify through repository
      const foundProject = await repository.findById('proj-14');
      expect(foundProject?.channelIds).toEqual(['channel-1', 'channel-2']);
      expect(foundProject?.agentIds).toEqual(['agent-1']);
    });
  });
});
