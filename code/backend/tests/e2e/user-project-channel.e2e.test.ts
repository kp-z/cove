/**
 * E2E Tests: User → Project → Channel → Message Workflow
 *
 * Tests the complete flow from user creation to message sending
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TestDatabaseHelper } from '../../src/infrastructure/repositories/test-database.helper';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { UserService } from '../../src/application/services/user/user.service';
import { ProjectService } from '../../src/application/services/project/project.service';
import { ChannelService } from '../../src/application/services/channel/channel.service';
import { MessageService } from '../../src/application/services/message/message.service';
import { HybridUserRepository } from '../../src/infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from '../../src/infrastructure/repositories/hybrid-project.repository';
import { ChannelRepository } from '../../src/infrastructure/repositories/channel.repository';
import { HybridMessageRepository } from '../../src/infrastructure/repositories/hybrid-message.repository';
import { ILogger } from '../../src/application/interfaces/logger.interface';
import * as path from 'path';
import * as fs from 'fs/promises';

describe.skip('E2E: User → Project → Channel → Message Workflow', () => {
  let testDb: TestDatabaseHelper;
  let prisma: PrismaClient;
  let storageService: StorageService;
  let testStorageRoot: string;
  let logger: ILogger;

  // Services
  let userService: UserService;
  let projectService: ProjectService;
  let channelService: ChannelService;
  let messageService: MessageService;

  beforeEach(async () => {
    // Setup test database
    testDb = new TestDatabaseHelper();
    prisma = await testDb.setup();

    // Setup test storage
    testStorageRoot = path.join(process.cwd(), '.test-storage', `e2e-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });
    storageService = new StorageService(testStorageRoot);

    // Setup logger
    logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

    // Initialize repositories
    const userRepo = new HybridUserRepository(prisma, storageService, logger);
    const projectRepo = new HybridProjectRepository(prisma, storageService, logger);
    const channelRepo = new ChannelRepository(prisma, storageService, logger);
    const messageRepo = new HybridMessageRepository(prisma, storageService, logger);

    // Initialize services
    userService = new UserService(userRepo);
    projectService = new ProjectService(projectRepo);
    channelService = new ChannelService(channelRepo);
    messageService = new MessageService(messageRepo);
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  it('should complete full workflow: create user → project → channel → message', async () => {
    // Step 1: Create a user
    const user = await userService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: 'hashed_password',
    });

    expect(user.userId).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.status).toBe('active');

    // Step 2: Create a project owned by the user
    const project = await projectService.createProject({
      name: 'test-project',
      displayName: 'Test Project',
      description: 'E2E test project',
      ownerId: user.userId,
    });

    expect(project.projectId).toBeDefined();
    expect(project.name).toBe('test-project');
    expect(project.ownerId).toBe(user.userId);
    expect(project.status).toBe('active');

    // Step 3: Create a channel in the project
    const channel = await channelService.createChannel({
      name: 'general',
      displayName: 'General',
      description: 'General discussion channel',
      projectId: project.projectId,
      createdBy: user.userId,
    });

    expect(channel.channelId).toBeDefined();
    expect(channel.name).toBe('general');
    expect(channel.projectId).toBe(project.projectId);
    expect(channel.status).toBe('active');

    // Step 4: Send a message to the channel
    const message = await messageService.sendMessage({
      channelId: channel.channelId,
      senderId: user.userId,
      senderType: 'user',
      content: 'Hello, this is a test message!',
      messageType: 'text',
    });

    expect(message.messageId).toBeDefined();
    expect(message.channelId).toBe(channel.channelId);
    expect(message.senderId).toBe(user.userId);
    expect(message.content).toBe('Hello, this is a test message!');
    expect(message.status).toBe('sent');

    // Step 5: Verify the message can be retrieved
    const retrievedMessage = await messageService.getMessageById(message.messageId);
    expect(retrievedMessage).toBeDefined();
    expect(retrievedMessage?.messageId).toBe(message.messageId);
    expect(retrievedMessage?.content).toBe('Hello, this is a test message!');

    // Step 6: Verify channel messages
    const channelMessages = await messageService.getChannelMessages(channel.channelId, {
      limit: 10,
    });
    expect(channelMessages.length).toBe(1);
    expect(channelMessages[0].messageId).toBe(message.messageId);
  });

  it('should handle multiple users in same project', async () => {
    // Create two users
    const user1 = await userService.createUser({
      username: 'user1',
      email: 'user1@example.com',
      displayName: 'User One',
      passwordHash: 'hash1',
    });

    const user2 = await userService.createUser({
      username: 'user2',
      email: 'user2@example.com',
      displayName: 'User Two',
      passwordHash: 'hash2',
    });

    // Create project
    const project = await projectService.createProject({
      name: 'shared-project',
      displayName: 'Shared Project',
      ownerId: user1.userId,
    });

    // Create channel
    const channel = await channelService.createChannel({
      name: 'team-chat',
      displayName: 'Team Chat',
      projectId: project.projectId,
      createdBy: user1.userId,
    });

    // Both users send messages
    const message1 = await messageService.sendMessage({
      channelId: channel.channelId,
      senderId: user1.userId,
      senderType: 'user',
      content: 'Message from user 1',
      messageType: 'text',
    });

    const message2 = await messageService.sendMessage({
      channelId: channel.channelId,
      senderId: user2.userId,
      senderType: 'user',
      content: 'Message from user 2',
      messageType: 'text',
    });

    // Verify both messages exist
    const messages = await messageService.getChannelMessages(channel.channelId, {
      limit: 10,
    });

    expect(messages.length).toBe(2);
    expect(messages.some(m => m.senderId === user1.userId)).toBe(true);
    expect(messages.some(m => m.senderId === user2.userId)).toBe(true);
  });

  it('should handle multiple channels in same project', async () => {
    // Create user and project
    const user = await userService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: 'hash',
    });

    const project = await projectService.createProject({
      name: 'multi-channel-project',
      displayName: 'Multi Channel Project',
      ownerId: user.userId,
    });

    // Create multiple channels
    const generalChannel = await channelService.createChannel({
      name: 'general',
      displayName: 'General',
      projectId: project.projectId,
      createdBy: user.userId,
    });

    const devChannel = await channelService.createChannel({
      name: 'dev',
      displayName: 'Development',
      projectId: project.projectId,
      createdBy: user.userId,
    });

    // Send messages to different channels
    await messageService.sendMessage({
      channelId: generalChannel.channelId,
      senderId: user.userId,
      senderType: 'user',
      content: 'General message',
      messageType: 'text',
    });

    await messageService.sendMessage({
      channelId: devChannel.channelId,
      senderId: user.userId,
      senderType: 'user',
      content: 'Dev message',
      messageType: 'text',
    });

    // Verify messages are in correct channels
    const generalMessages = await messageService.getChannelMessages(generalChannel.channelId, {
      limit: 10,
    });
    const devMessages = await messageService.getChannelMessages(devChannel.channelId, {
      limit: 10,
    });

    expect(generalMessages.length).toBe(1);
    expect(generalMessages[0].content).toBe('General message');

    expect(devMessages.length).toBe(1);
    expect(devMessages[0].content).toBe('Dev message');
  });

  it('should handle project with no channels', async () => {
    // Create user and project
    const user = await userService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: 'hash',
    });

    const project = await projectService.createProject({
      name: 'empty-project',
      displayName: 'Empty Project',
      ownerId: user.userId,
    });

    // Verify project exists but has no channels
    const retrievedProject = await projectService.getProjectById(project.projectId);
    expect(retrievedProject).toBeDefined();
    expect(retrievedProject?.projectId).toBe(project.projectId);

    // Attempting to get channels should return empty list
    const channels = await channelService.getProjectChannels(project.projectId);
    expect(channels).toEqual([]);
  });

  it('should handle message updates and deletions', async () => {
    // Setup: user, project, channel
    const user = await userService.createUser({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: 'hash',
    });

    const project = await projectService.createProject({
      name: 'test-project',
      displayName: 'Test Project',
      ownerId: user.userId,
    });

    const channel = await channelService.createChannel({
      name: 'general',
      displayName: 'General',
      projectId: project.projectId,
      createdBy: user.userId,
    });

    // Send message
    const message = await messageService.sendMessage({
      channelId: channel.channelId,
      senderId: user.userId,
      senderType: 'user',
      content: 'Original message',
      messageType: 'text',
    });

    // Update message
    const updatedMessage = await messageService.updateMessage(message.messageId, {
      content: 'Updated message',
    });

    expect(updatedMessage.content).toBe('Updated message');

    // Delete message
    await messageService.deleteMessage(message.messageId);

    // Verify message is deleted
    const deletedMessage = await messageService.getMessageById(message.messageId);
    expect(deletedMessage?.status).toBe('deleted');
  });
});
