/**
 * E2E Tests: Complete API Workflow
 *
 * Tests the complete API flow through tRPC routers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TestDatabaseHelper } from '../../src/infrastructure/repositories/test-database.helper';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { ILogger } from '../../src/application/interfaces/logger.interface';
import * as path from 'path';
import * as fs from 'fs/promises';

// Import repositories directly for E2E testing
import { HybridUserRepository } from '../../src/infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from '../../src/infrastructure/repositories/hybrid-project.repository';
import { ChannelRepository } from '../../src/infrastructure/repositories/channel.repository';
import { HybridMessageRepository } from '../../src/infrastructure/repositories/hybrid-message.repository';
import { HybridTaskRepository } from '../../src/infrastructure/repositories/hybrid-task.repository';
import { HybridThreadRepository } from '../../src/infrastructure/repositories/hybrid-thread.repository';
import { RealmRepository } from '../../src/infrastructure/repositories/realm.repository';

// Import domain entities
import { UserEntity } from '../../src/domain/models/user/user.entity';
import { ProjectEntity } from '../../src/domain/models/project/project.entity';
import { ChannelEntity } from '../../src/domain/models/channel/channel.entity';
import { MessageEntity } from '../../src/domain/models/message/message.entity';
import { TaskEntity } from '../../src/domain/models/task/task.entity';
import { ThreadEntity } from '../../src/domain/models/thread/thread.entity';
import { RealmEntity } from '../../src/domain/models/realm/realm.entity';
import { ActorRef } from '../../src/domain/models/value-objects/actor-ref';
import { AssigneeRef } from '../../src/domain/models/value-objects/assignee-ref';

describe('E2E: Complete API Workflow', () => {
  let testDb: TestDatabaseHelper;
  let prisma: PrismaClient;
  let storageService: StorageService;
  let testStorageRoot: string;
  let logger: ILogger;

  // Repositories
  let realmRepo: RealmRepository;
  let userRepo: HybridUserRepository;
  let projectRepo: HybridProjectRepository;
  let channelRepo: ChannelRepository;
  let messageRepo: HybridMessageRepository;
  let taskRepo: HybridTaskRepository;
  let threadRepo: HybridThreadRepository;

  // Helper function to create test channels
  const createTestChannel = (overrides: Partial<any> = {}) => {
    return ChannelEntity.create({
      channelId: 'channel-1',
      name: 'test-channel',
      displayName: 'Test Channel',
      type: 'public',
      status: 'active',
      description: 'Test channel description',
      members: [],
      agentPool: [],
      taskPool: [],
      conversationPool: [],
      communicationRules: {
        allowMentions: true,
        allowThreads: true,
        allowAttachments: true,
        maxMessageLength: 10000,
      },
      workspace: {
        root: '/workspace/channel-1',
        sharedFiles: '/workspace/channel-1/shared',
        attachments: '/workspace/channel-1/attachments',
      },
      meta: {
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          type: 'human',
        },
      },
      ...overrides,
    });
  };

  // Helper function to create test messages
  const createTestMessage = (overrides: Partial<any> = {}) => {
    return MessageEntity.create({
      messageId: 'msg-1',
      msgShortId: 'abc123',
      senderId: 'user-1',
      senderType: 'human',
      senderName: 'Test User',
      channelId: 'channel-1',
      channelName: 'Test Channel',
      threadId: undefined,
      isThreadRoot: false,
      content: 'Test message content',
      contentType: 'text',
      contentFormat: 'plain',
      attachments: [],
      mentions: [],
      references: [],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: undefined,
      meta: {},
      ...overrides,
    });
  };

  beforeEach(async () => {
    // Setup test database
    testDb = new TestDatabaseHelper();
    prisma = await testDb.setup();

    // Setup test storage
    testStorageRoot = path.join(process.cwd(), '.test-storage', `e2e-api-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });
    storageService = new StorageService(testStorageRoot);

    // Setup mock logger
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Initialize repositories
    realmRepo = new RealmRepository(prisma, logger);
    userRepo = new HybridUserRepository(prisma, storageService, logger);
    projectRepo = new HybridProjectRepository(prisma, storageService, logger);
    channelRepo = new ChannelRepository(prisma, logger);
    messageRepo = new HybridMessageRepository(prisma, storageService, logger);
    taskRepo = new HybridTaskRepository(prisma, storageService, logger);
    threadRepo = new HybridThreadRepository(prisma, storageService, logger);
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  it('should complete full workflow: user → project → channel → message → task', async () => {
    // Step 0: Create a realm
    const realm = RealmEntity.create({
      realm_id: 'realm-1',
      name: 'test-realm',
      display_name: 'Test Realm',
      description: 'E2E test realm',
      type: 'local',
      status: 'active',
      owner_id: 'user-1',
      visibility: 'private',
      settings: {
        allow_public_channels: true,
        allow_private_channels: true,
        allow_direct_messages: true,
        default_channel_retention: 90,
        default_message_retention: 30,
        default_member_role: 'member',
      },
      limits: {
        max_channels: 100,
        max_members: 1000,
        max_storage_bytes: 10737418240,
        max_messages_per_day: 10000,
      },
      created_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });
    await realmRepo.save(realm);

    // Step 1: Create a user
    const user = UserEntity.create({
      userId: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: 'hashed_password',
      status: 'active',
      role: 'user',
      profilePath: '/profiles/user-1.json',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await userRepo.save(user);

    const retrievedUser = await userRepo.findById('user-1');
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.username).toBe('testuser');

    // Step 2: Create a project
    const project = ProjectEntity.create({
      projectId: 'project-1',
      realmId: 'realm-1',
      name: 'test-project',
      displayName: 'Test Project',
      description: 'E2E test project',
      status: 'active',
      visibility: 'private',
      ownerId: 'user-1',
      metadataPath: '/projects/project-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await projectRepo.save(project);

    const retrievedProject = await projectRepo.findById('project-1');
    expect(retrievedProject).toBeDefined();
    expect(retrievedProject?.name).toBe('test-project');

    // Step 3: Create a channel
    const channel = createTestChannel({
      channelId: 'channel-1',
      name: 'general',
      displayName: 'General',
      description: 'General discussion',
      projectId: 'project-1',
    });

    await channelRepo.save(channel);

    const retrievedChannel = await channelRepo.findById('channel-1');
    expect(retrievedChannel).toBeDefined();
    expect(retrievedChannel?.name).toBe('general');

    // Step 4: Send a message
    const message = createTestMessage({
      messageId: 'message-1',
      msgShortId: 'msg001',
      channelId: 'channel-1',
      senderId: 'user-1',
      senderName: 'Test User',
      content: 'Hello, this is a test message!',
    });

    await messageRepo.save(message);

    const retrievedMessage = await messageRepo.findById('message-1');
    expect(retrievedMessage).toBeDefined();
    expect(retrievedMessage?.content).toBe('Hello, this is a test message!');

    // Step 5: Create a task
    const task = TaskEntity.create({
      taskId: 'task-1',
      title: 'Implement feature X',
      description: 'Add new feature X',
      taskType: 'single_agent',
      priority: 'P1',
      status: 'todo',
      channelId: 'channel-1',
      projectId: 'project-1',
      taskNumber: 1,
      createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
      createdAt: new Date(),
    });

    await taskRepo.save(task);

    const retrievedTask = await taskRepo.findById('task-1');
    expect(retrievedTask).toBeDefined();
    expect(retrievedTask?.title).toBe('Implement feature X');

    // Step 6: Assign the task
    const assignedTask = task.assignTo(
      AssigneeRef.create({
        id: 'user-1',
        type: 'human',
        assignedAt: new Date(),
      })
    );

    await taskRepo.update(assignedTask);

    const retrievedAssignedTask = await taskRepo.findById('task-1');
    expect(retrievedAssignedTask?.assignee).toBeDefined();
    expect(retrievedAssignedTask?.assignee?.id).toBe('user-1');

    // Step 7: Update task status
    const inProgressTask = assignedTask.start();
    await taskRepo.update(inProgressTask);

    const reviewTask = inProgressTask.submitForReview();
    await taskRepo.update(reviewTask);

    const completedTask = reviewTask.complete();
    await taskRepo.update(completedTask);

    const finalTask = await taskRepo.findById('task-1');
    expect(finalTask?.status).toBe('done');
  });

  it('should handle message threading workflow', async () => {
    // Setup: realm, user, project, channel
    const realm = RealmEntity.create({
      realm_id: 'realm-1',
      name: 'test-realm',
      display_name: 'Test Realm',
      type: 'local',
      status: 'active',
      owner_id: 'user-1',
      visibility: 'private',
      settings: {
        allow_public_channels: true,
        allow_private_channels: true,
        allow_direct_messages: true,
        default_channel_retention: 90,
        default_message_retention: 30,
      },
      limits: {
        max_channels: 100,
        max_members: 1000,
        max_storage_bytes: 10737418240,
        max_messages_per_day: 10000,
      },
      created_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });
    await realmRepo.save(realm);

    const user = UserEntity.create({
      userId: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: 'hash',
      status: 'active',
      role: 'user',
      profilePath: '/profiles/user-1.json',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(user);

    const project = ProjectEntity.create({
      projectId: 'project-1',
      realmId: 'realm-1',
      name: 'test-project',
      displayName: 'Test Project',
      status: 'active',
      visibility: 'private',
      ownerId: 'user-1',
      metadataPath: '/projects/project-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await projectRepo.save(project);

    const channel = createTestChannel({
      channelId: 'channel-1',
      name: 'general',
      displayName: 'General',
      projectId: 'project-1',
    });
    await channelRepo.save(channel);

    // Send root message
    const rootMessage = createTestMessage({
      messageId: 'message-1',
      msgShortId: 'msg001',
      channelId: 'channel-1',
      senderId: 'user-1',
      senderName: 'Test User',
      content: 'Root message',
    });
    await messageRepo.save(rootMessage);

    // Create thread
    const thread = ThreadEntity.create({
      threadId: 'message-1',
      channelId: 'channel-1',
      rootMessageId: 'message-1',
      title: 'Discussion',
      status: 'active',
      replyCount: 0,
      participants: [],
      createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
      createdAt: new Date(),
    });
    await threadRepo.save(thread);

    const retrievedThread = await threadRepo.findById('message-1');
    expect(retrievedThread).toBeDefined();
    expect(retrievedThread?.rootMessageId).toBe('message-1');

    // Send reply in thread
    const reply = createTestMessage({
      messageId: 'message-2',
      msgShortId: 'msg002',
      channelId: 'channel-1',
      senderId: 'user-1',
      senderName: 'Test User',
      content: 'Reply in thread',
      threadId: 'message-1',
    });
    await messageRepo.save(reply);

    // Verify reply is in thread
    const threadMessages = await messageRepo.findByThread('message-1');
    expect(threadMessages.length).toBe(1);
    expect(threadMessages[0].content).toBe('Reply in thread');
  });

  it('should handle multi-user collaboration', async () => {
    // Create realm first
    const realm = RealmEntity.create({
      realm_id: 'realm-1',
      name: 'test-realm',
      display_name: 'Test Realm',
      type: 'local',
      status: 'active',
      owner_id: 'user-1',
      visibility: 'private',
      settings: {
        allow_public_channels: true,
        allow_private_channels: true,
        allow_direct_messages: true,
        default_channel_retention: 90,
        default_message_retention: 30,
      },
      limits: {
        max_channels: 100,
        max_members: 1000,
        max_storage_bytes: 10737418240,
        max_messages_per_day: 10000,
      },
      created_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });
    await realmRepo.save(realm);

    // Create two users
    const user1 = UserEntity.create({
      userId: 'user-1',
      username: 'user1',
      email: 'user1@example.com',
      displayName: 'User One',
      passwordHash: 'hash1',
      status: 'active',
      role: 'user',
      profilePath: '/profiles/user-1.json',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(user1);

    const user2 = UserEntity.create({
      userId: 'user-2',
      username: 'user2',
      email: 'user2@example.com',
      displayName: 'User Two',
      passwordHash: 'hash2',
      status: 'active',
      role: 'user',
      profilePath: '/profiles/user-2.json',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(user2);

    // Create shared project
    const project = ProjectEntity.create({
      projectId: 'project-1',
      realmId: 'realm-1',
      name: 'shared-project',
      displayName: 'Shared Project',
      status: 'active',
      visibility: 'private',
      ownerId: 'user-1',
      metadataPath: '/projects/project-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await projectRepo.save(project);

    // Create channel
    const channel = createTestChannel({
      channelId: 'channel-1',
      name: 'team',
      displayName: 'Team',
      projectId: 'project-1',
    });
    await channelRepo.save(channel);

    // Both users send messages
    const message1 = createTestMessage({
      messageId: 'message-1',
      msgShortId: 'msg001',
      channelId: 'channel-1',
      senderId: 'user-1',
      senderName: 'User 1',
      content: 'Message from user 1',
    });
    await messageRepo.save(message1);

    const message2 = createTestMessage({
      messageId: 'message-2',
      msgShortId: 'msg002',
      channelId: 'channel-1',
      senderId: 'user-2',
      senderName: 'User 2',
      content: 'Message from user 2',
    });
    await messageRepo.save(message2);

    // Verify both messages exist
    const channelMessages = await messageRepo.findByChannel('channel-1');
    expect(channelMessages.length).toBe(2);
    expect(channelMessages.some(m => m.senderId === 'user-1')).toBe(true);
    expect(channelMessages.some(m => m.senderId === 'user-2')).toBe(true);
  });
});
