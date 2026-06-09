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

import { PrismaClient } from '../../../generated/client';
import { ILogger } from '../../application/interfaces';
import { nanoid } from 'nanoid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BuiltInAgentsInitializer } from './built-in-agents-initializer';

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
      this.logger.info('🌐 Default data: checking Nexus realm, agents & channels...');

      // Step 1: Nexus Realm
      await this.ensureDefaultRealm();

      // Step 2: 内置 Agent（与 Realm 创建绑定 — 不在 Backend 启动时全局扫描）
      //
      // 设计说明：agent-zhang 等内置 Agent 是全局共享记录（非 per-realm 副本），
      // 新 Realm 创建时通过 RealmMember 将其关联进去（见 realm.service.ts addPlatformAgentToRealm）。
      // 此处仅在 Nexus 首次创建时种入 DB record + 临时 bootstrap 文件；
      // 未来 Phase 4 Incr2 完成后，文件写入职责将整体移至 Local。
      await this.ensureBuiltInAgents();

      // Step 3-6: 设备、成员、频道、欢迎消息
      await this.ensureNexusDevice();
      await this.ensureInitialMembers();
      await this.ensureDefaultChannels();
      await this.ensureWelcomeMessage();

      this.logger.info('✅ Default data ready');
    } catch (error) {
      this.logger.error('❌ Failed to initialize default data', error as Error);
      throw error;
    }
  }

  /**
   * 确保内置 Agent 存在（幂等）
   * 与 Nexus realm 创建绑定，不在 Backend 全局启动时扫描。
   */
  private async ensureBuiltInAgents(): Promise<void> {
    const agentsInitializer = new BuiltInAgentsInitializer({
      prisma: this.prisma,
      logger: this.logger,
      storageRoot: this.storageRoot,
    });
    await agentsInitializer.initialize();
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
        logoUrl: '/public/cove-logo.svg',
        logoType: 'default',
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
        logoUrl: '/public/cove-logo.svg',
        logoType: 'default',
        createdAt: now,
        updatedAt: now,
      },
    });

    this.logger.debug('Default realm already exists', { realmId: this.DEFAULT_REALM.id });
  }

  /**
   * 确保 Nexus Device 存在
   *
   * 注意：这里直接使用 Prisma 而不是 DeviceService，因为：
   * 1. DeviceService 在 initializeDependencies() 中才创建
   * 2. 初始化场景下，直接操作数据库是可接受的
   * 3. 保持与 ensureDefaultRealm() 的实现模式一致
   */
  private async ensureNexusDevice(): Promise<void> {
    const now = new Date();
    const deviceId = `device-${this.DEFAULT_REALM.id}`;

    // 检查 device 是否已存在（通过 realmId unique 约束）
    const existingDevice = await this.prisma.device.findUnique({
      where: { realmId: this.DEFAULT_REALM.id },
    });

    if (existingDevice) {
      this.logger.debug('Nexus device already exists', {
        deviceId: existingDevice.id,
        realmId: this.DEFAULT_REALM.id
      });
      return;
    }

    this.logger.info('Creating device for Nexus realm...');

    // Device 配置（存储在文件系统）
    const deviceConfig = {
      description: 'Auto-generated device for Nexus realm',
      provider: 'local',
      specs: {
        cpu_cores: 1,
        memory_gb: 1,
        storage_gb: 1,
      },
      network: {
        hostname: 'localhost',
        protocol: 'http' as const,
      },
      location: {},
      meta: {
        auto_generated: true,
        created_by: 'default-data-initializer',
      },
    };

    // 创建 device 配置文件
    const deviceConfigPath = path.join(
      this.storageRoot,
      'storage',
      'devices',
      `${deviceId}.json`
    );

    await fs.mkdir(path.dirname(deviceConfigPath), { recursive: true });
    await fs.writeFile(
      deviceConfigPath,
      JSON.stringify(deviceConfig, null, 2),
      'utf-8'
    );

    // 存储相对路径（相对于 storageRoot）
    const relativeConfigPath = path.relative(this.storageRoot, deviceConfigPath);

    // 创建 Device 记录
    await this.prisma.device.create({
      data: {
        id: deviceId,
        realmId: this.DEFAULT_REALM.id,
        name: `${this.DEFAULT_REALM.name}-device`,
        displayName: `Device for ${this.DEFAULT_REALM.displayName}`,
        type: 'virtual',
        status: 'provisioning',
        platform: null,
        configPath: relativeConfigPath,
        lastSeenAt: null,
        apiKeyHash: null,
        activeTaskCount: 0,
        totalTasksExecuted: 0,
        averageTaskDuration: null,
        lastExecutedAgentId: null,
        region: null,
        tags: '[]',
        cpuUsage: null,
        memoryUsage: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    this.logger.info('Nexus device created successfully', {
      deviceId,
      realmId: this.DEFAULT_REALM.id
    });
  }

  /**
   * 确保初始成员存在（admin + agent-zhang）
   */
  private async ensureInitialMembers(): Promise<void> {
    this.logger.debug('Ensuring initial members in Nexus...');

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
    this.logger.debug('Ensuring default channels...');

    const now = new Date();

    for (const channelConfig of this.DEFAULT_CHANNELS) {
      // 检查 channel 是否已存在
      const existingChannel = await this.prisma.channel.findUnique({
        where: { id: channelConfig.id },
      });

      if (existingChannel) {
        // 获取应该存在的成员列表
        const expectedMembers = await this.getChannelMembers(channelConfig.id);

        // 解析现有的 membersData
        const currentMembersData = JSON.parse(existingChannel.membersData || '[]');
        const currentMemberIds = new Set(currentMembersData.map((m: any) => m.memberId));

        // 找出缺失的成员
        const missingMembers = expectedMembers.filter(m => !currentMemberIds.has(m.memberId));

        if (missingMembers.length > 0) {
          // 合并现有成员和新成员
          const updatedMembersData = [
            ...currentMembersData,
            ...missingMembers.map(m => ({
              memberId: m.memberId,
              memberType: m.memberType,
              role: m.role,
              joinedAt: now.toISOString(),
            })),
          ];

          // 提取所有 agent IDs 用于 agentPool
          const agentIds = updatedMembersData
            .filter((m: any) => m.memberType === 'agent')
            .map((m: any) => m.memberId);

          // 更新 channel
          await this.prisma.channel.update({
            where: { id: channelConfig.id },
            data: {
              membersData: JSON.stringify(updatedMembersData),
              memberCount: updatedMembersData.length,
              agentPool: JSON.stringify(agentIds),
              avatarUrl: null,
              avatarType: 'default',
              updatedAt: now,
            },
          });

          // 同步更新 Member 表（只为 user 类型的成员创建 Member 记录）
          for (const member of missingMembers) {
            if (member.memberType === 'user') {
              await this.prisma.member.upsert({
                where: {
                  userId_channelId: {
                    userId: member.memberId,
                    channelId: channelConfig.id,
                  },
                },
                create: {
                  id: member.id,
                  channelId: channelConfig.id,
                  userId: member.memberId,
                  role: member.role,
                  status: 'active',
                  joinedAt: now,
                },
                update: {
                  status: 'active',
                },
              });
            }
            // Note: Agent members are stored in Channel.membersData only, not in Member table
          }

          this.logger.info('Added missing members to existing channel', {
            channelId: channelConfig.id,
            addedCount: missingMembers.length,
          });
        } else {
          // 只更新 avatar 字段
          await this.prisma.channel.update({
            where: { id: channelConfig.id },
            data: {
              avatarUrl: null,
              avatarType: 'default',
              updatedAt: now,
            },
          });
          this.logger.debug('Channel already exists with all members', { channelId: channelConfig.id });
        }
        continue;
      }

      // 获取成员列表
      const memberData = await this.getChannelMembers(channelConfig.id);

      // 提取 agent IDs 用于 agentPool
      const agentIds = memberData
        .filter(m => m.memberType === 'agent')
        .map(m => m.memberId);

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
            memberId: m.memberId,
            memberType: m.memberType,
            role: m.role,
            joinedAt: now.toISOString(),
          }))),
          agentPool: JSON.stringify(agentIds),
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
          avatarUrl: null,
          avatarType: 'default',
          memberCount: memberData.length,
          messageCount: 0,
          createdAt: now,
          updatedAt: now,
          members: {
            create: memberData
              .filter(m => m.memberType === 'user')
              .map(m => ({
                id: m.id,
                userId: m.memberId,
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
   * 返回应该存在于 channel 中的成员列表（包括所有 users 和 agents）
   */
  private async getChannelMembers(channelId: string): Promise<Array<{
    id: string;
    memberId: string;
    memberType: 'user' | 'agent';
    role: string;
  }>> {
    const members: Array<{
      id: string;
      memberId: string;
      memberType: 'user' | 'agent';
      role: string;
    }> = [];

    // 添加所有 realm 的 users
    const realmUsers = await this.prisma.realmMember.findMany({
      where: {
        realmId: this.DEFAULT_REALM.id,
        status: 'active',
      },
      include: {
        user: true,
      },
    });

    for (const realmMember of realmUsers) {
      members.push({
        id: `${channelId}-member-${realmMember.userId}`,
        memberId: realmMember.userId,
        memberType: 'user',
        role: realmMember.role === 'owner' ? 'owner' : 'member',
      });
    }

    // 添加所有 realm 的 agents
    const realmAgents = await this.prisma.agent.findMany({
      where: {
        realmId: this.DEFAULT_REALM.id,
        status: 'active',
      },
    });

    for (const agent of realmAgents) {
      members.push({
        id: `${channelId}-member-${agent.id}`,
        memberId: agent.id,
        memberType: 'agent',
        role: 'member',
      });
    }

    this.logger.debug('Generated channel members', {
      channelId,
      userCount: realmUsers.length,
      agentCount: realmAgents.length,
      totalMembers: members.length,
    });

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
