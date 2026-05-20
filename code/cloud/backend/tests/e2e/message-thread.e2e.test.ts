/**
 * E2E Tests: Message → Thread → Reply Workflow
 *
 * Tests the complete message and thread interaction flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TestDatabaseHelper } from '../../src/infrastructure/repositories/test-database.helper';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { MessageService } from '../../src/application/services/message/message.service';
import { ThreadService } from '../../src/application/services/thread/thread.service';
import { UserService } from '../../src/application/services/user/user.service';
import { ProjectService } from '../../src/application/services/project/project.service';
import { ChannelService } from '../../src/application/services/channel/channel.service';
import { HybridMessageRepository } from '../../src/infrastructure/repositories/hybrid-message.repository';
import { HybridThreadRepository } from '../../src/infrastructure/repositories/hybrid-thread.repository';
import { HybridUserRepository } from '../../src/infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from '../../src/infrastructure/repositories/hybrid-project.repository';
import { ChannelRepository } from '../../src/infrastructure/repositories/channel.repository';
import { ILogger } from '../../src/application/interfaces/logger.interface';
import * as path from 'path';
import * as fs from 'fs/promises';

describe.skip('E2E: Message → Thread → Reply Workflow', () => {
  let testDb: TestDatabaseHelper;
  let prisma: PrismaClient;
  let storageService: StorageService;
  let testStorageRoot: string;
  let logger: ILogger;

  // Services
  let messageService: MessageService;
  let threadService: ThreadService;
  let userService: UserService;
  let projectService: ProjectService;
  let channelService: ChannelService;

  // Test data
  let user1Id: string;
  let user2Id: string;
  let projectId: string;
  let channelId: string;

  beforeEach(async () => {
    // Setup test database
    testDb = new TestDatabaseHelper();
    prisma = await testDb.setup();

    // Setup test storage
    testStorageRoot = path.join(process.cwd(), '.test-storage', `e2e-thread-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });
    storageService = new StorageService(testStorageRoot);

    // Setup logger
    logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

    // Initialize repositories
    const messageRepo = new HybridMessageRepository(prisma, storageService, logger);
    const threadRepo = new HybridThreadRepository(prisma, storageService, logger);
    const userRepo = new HybridUserRepository(prisma, storageService, logger);
    const projectRepo = new HybridProjectRepository(prisma, storageService, logger);
    const channelRepo = new ChannelRepository(prisma, storageService, logger);

    // Initialize services
    messageService = new MessageService(messageRepo);
    threadService = new ThreadService(threadRepo);
    userService = new UserService(userRepo);
    projectService = new ProjectService(projectRepo);
    channelService = new ChannelService(channelRepo);

    // Create test users
    const user1 = await userService.createUser({
      username: 'user1',
      email: 'user1@example.com',
      displayName: 'User One',
      passwordHash: 'hash1',
    });
    user1Id = user1.userId;

    const user2 = await userService.createUser({
      username: 'user2',
      email: 'user2@example.com',
      displayName: 'User Two',
      passwordHash: 'hash2',
    });
    user2Id = user2.userId;

    // Create project and channel
    const project = await projectService.createProject({
      name: 'thread-project',
      displayName: 'Thread Project',
      ownerId: user1Id,
    });
    projectId = project.projectId;

    const channel = await channelService.createChannel({
      name: 'general',
      displayName: 'General',
      projectId: projectId,
      createdBy: user1Id,
    });
    channelId = channel.channelId;
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  it('should complete full thread workflow: message → create thread → reply → read', async () => {
    // Step 1: Send a root message
    const rootMessage = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'This is the root message',
      messageType: 'text',
    });

    expect(rootMessage.messageId).toBeDefined();
    expect(rootMessage.content).toBe('This is the root message');

    // Step 2: Create a thread from the root message
    const thread = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage.messageId,
      title: 'Discussion about root message',
      createdBy: user1Id,
    });

    expect(thread.threadId).toBeDefined();
    expect(thread.rootMessageId).toBe(rootMessage.messageId);
    expect(thread.title).toBe('Discussion about root message');
    expect(thread.replyCount).toBe(0);

    // Step 3: Reply to the thread
    const reply1 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'First reply in thread',
      messageType: 'text',
      threadId: thread.threadId,
    });

    expect(reply1.threadId).toBe(thread.threadId);

    // Step 4: Add another reply
    const reply2 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Second reply in thread',
      messageType: 'text',
      threadId: thread.threadId,
    });

    expect(reply2.threadId).toBe(thread.threadId);

    // Step 5: Get thread with updated reply count
    const updatedThread = await threadService.getThreadById(thread.threadId);
    expect(updatedThread?.replyCount).toBe(2);

    // Step 6: Get all thread replies
    const replies = await messageService.getThreadMessages(thread.threadId, {
      limit: 10,
    });

    expect(replies.length).toBe(2);
    expect(replies[0].messageId).toBe(reply1.messageId);
    expect(replies[1].messageId).toBe(reply2.messageId);
  });

  it('should handle multiple threads in same channel', async () => {
    // Create two root messages
    const rootMessage1 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root message 1',
      messageType: 'text',
    });

    const rootMessage2 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root message 2',
      messageType: 'text',
    });

    // Create threads from both messages
    const thread1 = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage1.messageId,
      title: 'Thread 1',
      createdBy: user1Id,
    });

    const thread2 = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage2.messageId,
      title: 'Thread 2',
      createdBy: user1Id,
    });

    // Reply to both threads
    await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'Reply to thread 1',
      messageType: 'text',
      threadId: thread1.threadId,
    });

    await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'Reply to thread 2',
      messageType: 'text',
      threadId: thread2.threadId,
    });

    // Verify threads are independent
    const thread1Replies = await messageService.getThreadMessages(thread1.threadId, {
      limit: 10,
    });
    const thread2Replies = await messageService.getThreadMessages(thread2.threadId, {
      limit: 10,
    });

    expect(thread1Replies.length).toBe(1);
    expect(thread1Replies[0].content).toBe('Reply to thread 1');

    expect(thread2Replies.length).toBe(1);
    expect(thread2Replies[0].content).toBe('Reply to thread 2');
  });

  it('should track thread participants', async () => {
    // Create root message and thread
    const rootMessage = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root message',
      messageType: 'text',
    });

    const thread = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage.messageId,
      title: 'Participant tracking',
      createdBy: user1Id,
    });

    // User 2 replies
    await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'Reply from user 2',
      messageType: 'text',
      threadId: thread.threadId,
    });

    // Get thread and check participants
    const updatedThread = await threadService.getThreadById(thread.threadId);
    expect(updatedThread?.participants).toBeDefined();
    expect(updatedThread?.participants.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle message read status in threads', async () => {
    // Create root message and thread
    const rootMessage = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root message',
      messageType: 'text',
    });

    const thread = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage.messageId,
      title: 'Read status test',
      createdBy: user1Id,
    });

    // User 2 sends a reply
    const reply = await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'Unread reply',
      messageType: 'text',
      threadId: thread.threadId,
    });

    // User 1 marks the reply as read
    await messageService.markMessageAsRead(reply.messageId, user1Id);

    // Verify read status
    const readMessage = await messageService.getMessageById(reply.messageId);
    expect(readMessage?.status).toBe('read');
  });

  it('should handle thread archival', async () => {
    // Create root message and thread
    const rootMessage = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root message',
      messageType: 'text',
    });

    const thread = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage.messageId,
      title: 'Thread to archive',
      createdBy: user1Id,
    });

    // Add some replies
    await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'Reply 1',
      messageType: 'text',
      threadId: thread.threadId,
    });

    // Archive the thread
    const archivedThread = await threadService.archiveThread(thread.threadId);
    expect(archivedThread.status).toBe('archived');

    // Verify archived thread can still be retrieved
    const retrievedThread = await threadService.getThreadById(thread.threadId);
    expect(retrievedThread?.status).toBe('archived');
  });

  it('should get channel threads', async () => {
    // Create multiple threads in the channel
    const rootMessage1 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root 1',
      messageType: 'text',
    });

    const rootMessage2 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Root 2',
      messageType: 'text',
    });

    await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage1.messageId,
      title: 'Thread 1',
      createdBy: user1Id,
    });

    await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage2.messageId,
      title: 'Thread 2',
      createdBy: user1Id,
    });

    // Get all threads in channel
    const threads = await threadService.getChannelThreads(channelId);
    expect(threads.length).toBe(2);
  });

  it('should handle nested conversation flow', async () => {
    // Root message in channel
    const rootMessage = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Original question',
      messageType: 'text',
    });

    // Create thread
    const thread = await threadService.createThread({
      channelId: channelId,
      rootMessageId: rootMessage.messageId,
      title: 'Discussion',
      createdBy: user1Id,
    });

    // Multiple users reply in sequence
    const reply1 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'First answer',
      messageType: 'text',
      threadId: thread.threadId,
    });

    const reply2 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user1Id,
      senderType: 'user',
      content: 'Follow-up question',
      messageType: 'text',
      threadId: thread.threadId,
    });

    const reply3 = await messageService.sendMessage({
      channelId: channelId,
      senderId: user2Id,
      senderType: 'user',
      content: 'Detailed answer',
      messageType: 'text',
      threadId: thread.threadId,
    });

    // Verify conversation flow
    const replies = await messageService.getThreadMessages(thread.threadId, {
      limit: 10,
    });

    expect(replies.length).toBe(3);
    expect(replies[0].senderId).toBe(user2Id);
    expect(replies[1].senderId).toBe(user1Id);
    expect(replies[2].senderId).toBe(user2Id);

    // Verify thread metadata
    const updatedThread = await threadService.getThreadById(thread.threadId);
    expect(updatedThread?.replyCount).toBe(3);
    expect(updatedThread?.lastActivityAt).toBeDefined();
  });
});
