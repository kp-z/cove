import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { HybridChannelRepository } from './hybrid-channel.repository';
import { ChannelEntity } from '../../domain/models/channel/channel.entity';
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

describe('HybridChannelRepository Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let repository: HybridChannelRepository;
  let storageService: StorageService;
  let testStorageRoot: string;

  beforeAll(async () => {
    // Setup test database
    dbHelper = new TestDatabaseHelper();
    await dbHelper.setup();

    // Setup test storage
    testStorageRoot = path.join(os.tmpdir(), `cove-test-storage-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });
    storageService = new StorageService(testStorageRoot);

    // Create repository
    const logger = new TestLogger();
    repository = new HybridChannelRepository(
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

    // Create test users for foreign key constraints
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

    // Create test project for foreign key constraints
    await dbHelper.getPrisma().project.create({
      data: {
        id: 'project-1',
        name: 'Test Project',
        description: 'Test project description',
        status: 'active',
        ownerId: 'user-1',
        metadataPath: 'storage/projects/project-1.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  describe('save', () => {
    it('should save a channel to both database and storage', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'test-channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        projectId: 'project-1',
        description: 'Test channel description',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel);

      // Verify database record
      const dbRecord = await dbHelper.getPrisma().channel.findUnique({
        where: { id: 'channel-1' },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.name).toBe('test-channel');
      expect(dbRecord?.displayName).toBe('Test Channel');
      expect(dbRecord?.type).toBe('public');
      expect(dbRecord?.projectId).toBe('project-1');

      // Verify storage file
      const loaded = await repository.findById('channel-1');
      expect(loaded).toBeDefined();
      expect(loaded?.description).toBe('Test channel description');
    });

    it('should save a channel with members', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-2',
        name: 'member-channel',
        displayName: 'Member Channel',
        type: 'public',
        status: 'active',
        members: [
          {
            memberId: 'user-1',
            memberType: 'user',
            role: 'admin',
            joinedAt: new Date(),
          },
        ],
        agentPool: ['agent-1'],
        taskPool: ['task-1'],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel);

      const loaded = await repository.findById('channel-2');
      expect(loaded).toBeDefined();
      expect(loaded?.members).toHaveLength(1);
      expect(loaded?.members[0].memberId).toBe('user-1');
      expect(loaded?.agentPool).toContain('agent-1');
      expect(loaded?.taskPool).toContain('task-1');
    });
  });

  describe('findById', () => {
    it('should return null for non-existent channel', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });

    it('should find channel by id', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-3',
        name: 'find-channel',
        displayName: 'Find Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel);

      const found = await repository.findById('channel-3');
      expect(found).toBeDefined();
      expect(found?.channelId).toBe('channel-3');
      expect(found?.name).toBe('find-channel');
    });
  });

  describe('findByProject', () => {
    it('should find all channels in a project', async () => {
      const channel1 = ChannelEntity.create({
        channelId: 'channel-4',
        name: 'project-channel-1',
        displayName: 'Project Channel 1',
        type: 'public',
        status: 'active',
        projectId: 'project-1',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const channel2 = ChannelEntity.create({
        channelId: 'channel-5',
        name: 'project-channel-2',
        displayName: 'Project Channel 2',
        type: 'private',
        status: 'active',
        projectId: 'project-1',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel1);
      await repository.save(channel2);

      const channels = await repository.findByProject('project-1');
      expect(channels).toHaveLength(2);
      expect(channels.map(c => c.channelId)).toContain('channel-4');
      expect(channels.map(c => c.channelId)).toContain('channel-5');
    });

    it('should return empty array for project with no channels', async () => {
      const channels = await repository.findByProject('non-existent-project');
      expect(channels).toEqual([]);
    });
  });

  describe('findByType', () => {
    it('should find all channels of a specific type', async () => {
      const publicChannel = ChannelEntity.create({
        channelId: 'channel-6',
        name: 'public-channel',
        displayName: 'Public Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const privateChannel = ChannelEntity.create({
        channelId: 'channel-7',
        name: 'private-channel',
        displayName: 'Private Channel',
        type: 'private',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(publicChannel);
      await repository.save(privateChannel);

      const publicChannels = await repository.findByType('public');
      expect(publicChannels).toHaveLength(1);
      expect(publicChannels[0].type).toBe('public');

      const privateChannels = await repository.findByType('private');
      expect(privateChannels).toHaveLength(1);
      expect(privateChannels[0].type).toBe('private');
    });
  });

  describe('findByMember', () => {
    it('should find all channels a member belongs to', async () => {
      const channel1 = ChannelEntity.create({
        channelId: 'channel-8',
        name: 'member-channel-1',
        displayName: 'Member Channel 1',
        type: 'public',
        status: 'active',
        members: [
          {
            memberId: 'user-1',
            memberType: 'user',
            role: 'member',
            joinedAt: new Date(),
          },
        ],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const channel2 = ChannelEntity.create({
        channelId: 'channel-9',
        name: 'member-channel-2',
        displayName: 'Member Channel 2',
        type: 'public',
        status: 'active',
        members: [
          {
            memberId: 'user-1',
            memberType: 'user',
            role: 'admin',
            joinedAt: new Date(),
          },
        ],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel1);
      await repository.save(channel2);

      const channels = await repository.findByMember('user-1');
      expect(channels).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update channel in both database and storage', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-10',
        name: 'update-channel',
        displayName: 'Update Channel',
        type: 'public',
        status: 'active',
        description: 'Original description',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel);

      // Update channel
      const updated = ChannelEntity.create({
        channelId: channel.channelId,
        name: channel.name,
        displayName: 'Updated Channel',
        type: channel.type,
        status: channel.status,
        description: 'Updated description',
        members: channel.members,
        agentPool: channel.agentPool,
        taskPool: channel.taskPool,
        conversationPool: channel.conversationPool,
        communicationRules: channel.communicationRules,
        workspace: channel.workspace,
        meta: {
          ...channel.meta,
          messageCount: 5,
          updatedAt: new Date(),
        },
      });

      await repository.update(updated);

      const loaded = await repository.findById('channel-10');
      expect(loaded?.displayName).toBe('Updated Channel');
      expect(loaded?.description).toBe('Updated description');
      expect(loaded?.meta.messageCount).toBe(5);
    });
  });

  describe('delete', () => {
    it('should delete channel from both database and storage', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-11',
        name: 'delete-channel',
        displayName: 'Delete Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel);

      await repository.delete('channel-11');

      const found = await repository.findById('channel-11');
      expect(found).toBeNull();

      const dbRecord = await dbHelper.getPrisma().channel.findUnique({
        where: { id: 'channel-11' },
      });
      expect(dbRecord).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing channel', async () => {
      const channel = ChannelEntity.create({
        channelId: 'channel-12',
        name: 'exists-channel',
        displayName: 'Exists Channel',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel);

      const exists = await repository.exists('channel-12');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent channel', async () => {
      const exists = await repository.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all channels', async () => {
      const channel1 = ChannelEntity.create({
        channelId: 'channel-13',
        name: 'all-channel-1',
        displayName: 'All Channel 1',
        type: 'public',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const channel2 = ChannelEntity.create({
        channelId: 'channel-14',
        name: 'all-channel-2',
        displayName: 'All Channel 2',
        type: 'private',
        status: 'active',
        members: [],
        agentPool: [],
        taskPool: [],
        conversationPool: [],
        communicationRules: {},
        workspace: {},
        meta: {
          messageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await repository.save(channel1);
      await repository.save(channel2);

      const all = await repository.findAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });
});
