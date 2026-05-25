/**
 * DefaultDataInitializer - 初始化系统默认数据
 *
 * 职责：
 * - 创建默认 Realm (Nexus)
 * - 创建默认 Channels (#general, #welcome)
 * - 添加初始成员（admin + agent-zhang）
 * - 发送欢迎消息
 *
 * 所有操作都是幂等的，可以安全地多次运行
 */

import { PrismaClient } from '@prisma/client';
import { ILogger } from '../../application/interfaces';
import { nanoid } from 'nanoid';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DefaultDataInitializerOptions {
  prisma: PrismaClient;
  logger: ILogger;
  storageRoot: string;
}

interface DefaultRealmConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  visibility: 'public' | 'private';
}

interface DefaultChannelConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  type: 'public' | 'private';
}

export class DefaultDataInitializer {
  private readonly prisma: PrismaClient;
  private readonly logger: ILogger;
  private readonly storageRoot: string;

  // 默认 Realm 配置
  private readonly DEFAULT_REALM: DefaultRealmConfig = {
    id: 'realm-nexus',
    name: 'nexus',
    displayName: 'Nexus',
    description: 'The central hub connecting all realms',
    visibility: 'public',
  };

  // 默认 Channels 配置
  private readonly DEFAULT_CHANNELS: DefaultChannelConfig[] = [
    {
      id: 'channel-nexus-general',
      name: 'general',
      displayName: 'General',
      description: 'General discussion for all members',
      type: 'public',
    },
    {
      id: 'channel-nexus-welcome',
      name: 'welcome',
      displayName: 'Welcome',
      description: 'Welcome to Cove! Get started here.',
      type: 'public',
    },
  ];

  constructor(options: DefaultDataInitializerOptions) {
    this.prisma = options.prisma;
    this.logger = options.logger;
    this.storageRoot = options.storageRoot;
  }

  /**
   * 初始化默认数据
   *
   * 每个步骤都是幂等的，可以安全地多次运行
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Starting default data initialization...');

      // Step 1: 确保默认 Realm (Nexus) 存在
      await this.ensureDefaultRealm();

      // Step 2: 确保初始成员存在（admin + agent-zhang）
      await this.ensureInitialMembers();

      // Step 3: 确保默认 Channels 存在
      await this.ensureDefaultChannels();

      // Step 4: 确保欢迎消息存在
      await this.ensureWelcomeMessage();

      this.logger.info('Default data initialization completed successfully');
    } catch (error) {
      this.logger.error('Failed to initialize default data', error as Error);
      throw error;
    }
  }

  /**
   * 确保默认 Realm (Nexus) 存在
   */
  private async ensureDefaultRealm(): Promise<void> {
    const now = new Date();

    // Realm settings and limits (stored as JSON in database)
    const settings = {
      allow_public_channels: true,
      allow_private_channels: true,
      allow_dm: true,
      require_approval: false,
      default_member_role: 'member' as const,
      default_adapter_id: undefined,
    };

    const limits = {
      max_members: 1000,
      max_projects: 100,
      max_channels: 100,
      max_agents: 50,
      max_storage_gb: 100,
    };

    const meta = {
      tags: ['platform', 'default'],
      icon: '🌐',
    };

    await this.prisma.realm.upsert({
      where: { id: this.DEFAULT_REALM.id },
      update: {
        displayName: this.DEFAULT_REALM.displayName,
        description: this.DEFAULT_REALM.description,
        logoUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=nexus-realm',
        logoType: 'dicebear',
        updatedAt: now,
      },
      create: {
        id: this.DEFAULT_REALM.id,
        name: this.DEFAULT_REALM.name,
        displayName: this.DEFAULT_REALM.displayName,
        description: this.DEFAULT_REALM.description,
        ownerId: 'system',
        status: 'active',
        visibility: this.DEFAULT_REALM.visibility,
        settings: JSON.stringify(settings),
        limits: JSON.stringify(limits),
        meta: JSON.stringify(meta),
        logoUrl: 'https://api.dicebear.com/9.x/shapes/svg?seed=nexus-realm',
        logoType: 'dicebear',
        createdAt: now,
        updatedAt: now,
      },
    });

    this.logger.debug('Default realm already exists', { realmId: this.DEFAULT_REALM.id });
  }

  /**
   * 确保初始成员存在（admin + agent-zhang）
   */
  private async ensureInitialMembers(): Promise<void> {
    this.logger.info('Ensuring initial members in Nexus...');

    const now = new Date();

    // 查找 admin 用户
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'owner' },
    });

    if (!adminUser) {
      this.logger.warn('Admin user not found, skipping admin member creation');
    } else {
      // 检查 admin 是否已经是成员
      const existingAdminMember = await this.prisma.realmMember.findUnique({
        where: {
          realmId_userId: {
            realmId: this.DEFAULT_REALM.id,
            userId: adminUser.id,
          },
        },
      });

      if (!existingAdminMember) {
        // 添加 admin 为 owner
        await this.prisma.realmMember.create({
          data: {
            id: `member-nexus-${adminUser.id}`,
            realmId: this.DEFAULT_REALM.id,
            userId: adminUser.id,
            role: 'owner',
            status: 'active',
            joinedAt: now,
            updatedAt: now,
          },
        });

        this.logger.info('Admin user added to Nexus', { userId: adminUser.id });
      } else {
        this.logger.debug('Admin user already in Nexus', { userId: adminUser.id });
      }
    }

    // Note: Agents are not added as RealmMembers because they are not Users.
    // Agents have their own Agent table and don't need realm membership.
    // They can interact with realms through their agent-specific permissions.
    this.logger.debug('Skipping agent membership - agents are managed separately from realm members');
  }

  /**
   * 确保默认 Channels 存在
   */
  private async ensureDefaultChannels(): Promise<void> {
    this.logger.info('Ensuring default channels...');

    const now = new Date();

    for (const channelConfig of this.DEFAULT_CHANNELS) {
      // 检查 channel 是否已存在
      const existingChannel = await this.prisma.channel.findUnique({
        where: { id: channelConfig.id },
      });

      if (existingChannel) {
        // Update avatar fields for existing channels
        await this.prisma.channel.update({
          where: { id: channelConfig.id },
          data: {
            avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${channelConfig.name}`,
            avatarType: 'dicebear',
            updatedAt: now,
          },
        });
        this.logger.debug('Channel already exists', { channelId: channelConfig.id });
        continue;
      }

      // 获取成员列表
      const memberData = await this.getChannelMembers(channelConfig.id);

      // 创建 Channel
      await this.prisma.channel.create({
        data: {
          id: channelConfig.id,
          realmId: this.DEFAULT_REALM.id,
          name: channelConfig.name,
          displayName: channelConfig.displayName,
          type: channelConfig.type,
          status: 'active',
          description: channelConfig.description,
          icon: channelConfig.icon,
          membersData: JSON.stringify(memberData.map(m => ({
            memberId: m.userId,
            memberType: 'user',
            role: m.role,
            joinedAt: now.toISOString(),
          }))),
          agentPool: JSON.stringify([]),
          taskPool: JSON.stringify([]),
          conversationPool: JSON.stringify([]),
          communicationRules: JSON.stringify({
            allowMentions: true,
            allowThreads: true,
            allowAttachments: true,
            maxMessageLength: 10000,
          }),
          workspace: JSON.stringify({
            root: '',
            sharedFiles: [],
            attachments: [],
          }),
          metaTags: JSON.stringify([]),
          createdById: 'system',
          createdByType: 'system',
          avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${channelConfig.name}`,
          avatarType: 'dicebear',
          memberCount: memberData.length,
          messageCount: 0,
          createdAt: now,
          updatedAt: now,
          members: {
            create: memberData.map(m => ({
              id: m.id,
              userId: m.userId,
              role: m.role,
              status: 'active',
              joinedAt: now,
            })),
          },
        },
      });

      this.logger.info('Channel created', { channelId: channelConfig.id, name: channelConfig.name });
    }
  }

  /**
   * 获取 Channel 成员数据
   */
  private async getChannelMembers(channelId: string): Promise<Array<{ id: string; userId: string; role: string }>> {
    const members: Array<{ id: string; userId: string; role: string }> = [];

    // 添加 admin（如果存在）
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'owner' },
    });

    if (adminUser) {
      members.push({
        id: `${channelId}-member-${adminUser.id}`,
        userId: adminUser.id,
        role: 'owner',
      });
    }

    // Note: Agents are not added as Channel Members because they are not Users.
    // Agents can interact with channels through their agent-specific permissions
    // without being formal members.

    return members;
  }

  /**
   * 确保欢迎消息存在
   */
  private async ensureWelcomeMessage(): Promise<void> {
    const welcomeChannelId = this.DEFAULT_CHANNELS.find(c => c.name === 'welcome')?.id;
    if (!welcomeChannelId) {
      this.logger.warn('Welcome channel not found, skipping welcome message');
      return;
    }

    // 检查欢迎消息是否已存在
    const existingMessages = await this.prisma.message.findMany({
      where: {
        channelId: welcomeChannelId,
        senderId: 'agent-zhang',
      },
      take: 1,
    });

    if (existingMessages.length > 0) {
      this.logger.debug('Welcome message already exists');
      return;
    }

    this.logger.info('Sending welcome message...');

    const now = new Date();
    const messageId = `msg-welcome-${nanoid(10)}`;
    const shortId = `M${String(Date.now()).slice(-6)}`;

    const welcomeContent = `👋 欢迎来到 Cove！

我是小张，你的平台助手。以下是快速入门指南：

1. **创建你的 Realm** - 点击左侧 "+" 按钮创建你的工作空间
2. **邀请团队成员** - 在 Realm 设置中邀请你的团队
3. **创建 Channels** - 为不同的项目或话题创建频道
4. **添加 Agents** - 配置 AI 助手来帮助你的团队

有任何问题，随时 @我！`;

    // 创建消息内容文件
    const absoluteContentPath = path.join(this.storageRoot, 'messages', `${messageId}.json`);
    await fs.mkdir(path.dirname(absoluteContentPath), { recursive: true });
    await fs.writeFile(
      absoluteContentPath,
      JSON.stringify({
        text: welcomeContent,
        format: 'markdown',
      }),
      'utf-8'
    );

    // 存储相对路径（相对于 .cove 目录）
    const relativeContentPath = path.relative(this.storageRoot, absoluteContentPath);

    await this.prisma.message.create({
      data: {
        id: messageId,
        realmId: this.DEFAULT_REALM.id,
        shortId,
        channelId: welcomeChannelId,
        senderId: 'agent-zhang',
        senderType: 'agent',
        contentPath: relativeContentPath,
        contentType: 'text',
        status: 'sent',
        isThreadRoot: false,
        isEdited: false,
        reactionCount: 0,
        replyCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    });

    this.logger.info('Welcome message sent', { messageId, channelId: welcomeChannelId });
  }
}
