/**
 * Channel Feature Mock 数据
 */

import type { MessageEntity, ChannelEntity, AgentEntity } from '@/features/channel/api/client';

export const messageFixtures: MessageEntity[] = [
  {
    id: 'msg-1',
    channelId: 'channel-1',
    senderId: 'user-1',
    senderType: 'human',
    content: '大家好，我们开始讨论新功能吧',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'msg-2',
    channelId: 'channel-1',
    senderId: 'agent-1',
    senderType: 'agent',
    content: '好的，我已经准备好了。请问需要讨论哪些方面？',
    createdAt: new Date(Date.now() - 3500000).toISOString(),
    updatedAt: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: 'msg-3',
    channelId: 'channel-1',
    senderId: 'user-2',
    senderType: 'human',
    content: '我觉得我们应该先确定技术栈',
    createdAt: new Date(Date.now() - 3400000).toISOString(),
    updatedAt: new Date(Date.now() - 3400000).toISOString(),
  },
];

export const channelFixtures: ChannelEntity[] = [
  {
    id: 'channel-1',
    name: 'General',
    description: '团队通用频道',
    type: 'public',
    projectId: 'project-1',
    createdBy: 'user-1',
    members: [
      {
        memberId: 'user-1',
        memberType: 'human',
        role: 'owner',
        joinedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        memberId: 'user-2',
        memberType: 'human',
        role: 'member',
        joinedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        memberId: 'agent-1',
        memberType: 'agent',
        role: 'member',
        joinedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    agentPool: ['agent-1'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const agentFixtures: AgentEntity[] = [
  {
    id: 'agent-1',
    name: 'CodeAssistant',
    description: '代码助手',
    model: 'claude-3-opus',
    status: 'idle',
    createdBy: 'user-1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const createMessage = (overrides: Partial<MessageEntity> = {}): MessageEntity => ({
  id: `msg-${Date.now()}`,
  channelId: 'channel-1',
  senderId: 'user-1',
  senderType: 'human',
  content: 'Test message',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createChannel = (overrides: Partial<ChannelEntity> = {}): ChannelEntity => ({
  id: `channel-${Date.now()}`,
  name: 'Test Channel',
  type: 'public',
  projectId: 'project-1',
  createdBy: 'user-1',
  members: [],
  agentPool: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
