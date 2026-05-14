import type { Message, Channel } from '@/lib/trpc-types';

// Type aliases for mock fixtures
type MessageEntity = Message;
type ChannelEntity = Channel;
type AgentEntity = {
  agent_id: string;
  name: string;
  description?: string;
  model: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const agentFixtures: AgentEntity[] = [
  {
    agent_id: 'agent-1',
    name: 'CodeAssistant',
    description: 'Code assistant specializing in programming and code review',
    model: 'claude-3-opus',
    status: 'idle',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    agent_id: 'agent-2',
    name: 'DataAnalyst',
    description: 'Data analysis expert skilled in data processing and visualization',
    model: 'claude-3-sonnet',
    status: 'running',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    agent_id: 'agent-3',
    name: 'DocWriter',
    description: 'Documentation assistant',
    model: 'claude-3-haiku',
    status: 'paused',
    created_by: 'user-2',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const channelFixtures: ChannelEntity[] = [
  {
    channel_id: 'channel-1',
    name: 'General',
    description: 'General team discussion channel',
    type: 'public',
    project_id: 'project-1',
    created_by: 'user-1',
    members: [
      { member_id: 'user-1', member_type: 'human', role: 'owner', joined_at: new Date(Date.now() - 86400000 * 30).toISOString() },
      { member_id: 'user-2', member_type: 'human', role: 'member', joined_at: new Date(Date.now() - 86400000 * 28).toISOString() },
      { member_id: 'agent-1', member_type: 'agent', role: 'member', joined_at: new Date(Date.now() - 86400000 * 25).toISOString() },
    ],
    agent_pool: ['agent-1', 'agent-2'],
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    channel_id: 'channel-2',
    name: 'Development',
    description: 'Development discussions and technical decisions',
    type: 'public',
    project_id: 'project-1',
    created_by: 'user-1',
    members: [
      { member_id: 'user-1', member_type: 'human', role: 'owner', joined_at: new Date(Date.now() - 86400000 * 20).toISOString() },
      { member_id: 'user-2', member_type: 'human', role: 'member', joined_at: new Date(Date.now() - 86400000 * 18).toISOString() },
      { member_id: 'agent-1', member_type: 'agent', role: 'member', joined_at: new Date(Date.now() - 86400000 * 15).toISOString() },
      { member_id: 'agent-2', member_type: 'agent', role: 'member', joined_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
    agent_pool: ['agent-1', 'agent-2', 'agent-3'],
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    channel_id: 'channel-3',
    name: 'Leadership',
    description: 'Management discussions',
    type: 'private',
    project_id: 'project-1',
    created_by: 'user-1',
    members: [
      { member_id: 'user-1', member_type: 'human', role: 'owner', joined_at: new Date(Date.now() - 86400000 * 15).toISOString() },
      { member_id: 'agent-3', member_type: 'agent', role: 'member', joined_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
    agent_pool: ['agent-3'],
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    channel_id: 'channel-4',
    name: 'Alice',
    description: 'Direct message with Alice',
    type: 'dm',
    project_id: 'project-1',
    created_by: 'user-1',
    members: [
      { member_id: 'user-1', member_type: 'human', role: 'owner', joined_at: new Date(Date.now() - 86400000 * 10).toISOString() },
      { member_id: 'user-2', member_type: 'human', role: 'member', joined_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
    agent_pool: [],
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 900000).toISOString(),
  },
];

export const messageFixtures: MessageEntity[] = [
  // Channel 1: General
  {
    message_id: 'msg-1-1',
    channel_id: 'channel-1',
    sender_id: 'user-1',
    sender_type: 'human',
    content: 'Hey everyone, let\'s discuss the priority of new features',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    message_id: 'msg-1-2',
    channel_id: 'channel-1',
    sender_id: 'agent-1',
    sender_type: 'agent',
    content: 'Sure, based on the current backlog, I suggest prioritizing the three issues with the most user feedback:\n\n1. **Search performance optimization** — Users report slow search responses\n2. **Message notifications** — Lack of real-time notifications mentioned multiple times\n3. **Dark mode** — Top three most requested user feature',
    created_at: new Date(Date.now() - 7100000).toISOString(),
    updated_at: new Date(Date.now() - 7100000).toISOString(),
    reactions: [{ emoji: '👍', user_ids: ['user-1', 'user-2'] }],
  },
  {
    message_id: 'msg-1-3',
    channel_id: 'channel-1',
    sender_id: 'user-2',
    sender_type: 'human',
    content: 'Agreed, search performance definitely needs priority. I can take that on.',
    created_at: new Date(Date.now() - 7000000).toISOString(),
    updated_at: new Date(Date.now() - 7000000).toISOString(),
  },
  {
    message_id: 'msg-1-4',
    channel_id: 'channel-1',
    sender_id: 'user-1',
    sender_type: 'human',
    content: 'I\'ll handle message notifications then. @CodeAssistant can you help with a technical proposal?',
    mentions: ['agent-1'],
    created_at: new Date(Date.now() - 6900000).toISOString(),
    updated_at: new Date(Date.now() - 6900000).toISOString(),
  },
  {
    message_id: 'msg-1-5',
    channel_id: 'channel-1',
    sender_id: 'agent-1',
    sender_type: 'agent',
    content: 'Of course. I\'ll design a real-time notification solution based on WebSocket, expecting to have the first draft done today. Key considerations:\n\n- Connection management and reconnection strategy\n- Message deduplication\n- Offline message caching\n- Multi-device sync',
    created_at: new Date(Date.now() - 6800000).toISOString(),
    updated_at: new Date(Date.now() - 6800000).toISOString(),
    reactions: [{ emoji: '🚀', user_ids: ['user-1'] }, { emoji: '👍', user_ids: ['user-2'] }],
  },
  // Channel 2: Development
  {
    message_id: 'msg-2-1',
    channel_id: 'channel-2',
    sender_id: 'user-1',
    sender_type: 'human',
    content: 'We need to upgrade the frontend TypeScript version to 6.0, any concerns?',
    created_at: new Date(Date.now() - 5400000).toISOString(),
    updated_at: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    message_id: 'msg-2-2',
    channel_id: 'channel-2',
    sender_id: 'agent-2',
    sender_type: 'agent',
    content: 'I\'ve analyzed the codebase. Upgrading to TS 6.0 mainly affects:\n\n- `verbatimModuleSyntax` will require all type imports to use the `type` prefix\n- About 23 files need adjustments\n- No breaking changes affecting runtime behavior\n\nI suggest doing a focused upgrade over the weekend.',
    created_at: new Date(Date.now() - 5300000).toISOString(),
    updated_at: new Date(Date.now() - 5300000).toISOString(),
  },
  {
    message_id: 'msg-2-3',
    channel_id: 'channel-2',
    sender_id: 'user-2',
    sender_type: 'human',
    content: 'No problem, I\'ll help with testing. After upgrading, let\'s run the full test suite to confirm no regressions.',
    created_at: new Date(Date.now() - 5200000).toISOString(),
    updated_at: new Date(Date.now() - 5200000).toISOString(),
  },
  {
    message_id: 'msg-2-4',
    channel_id: 'channel-2',
    sender_id: 'agent-1',
    sender_type: 'agent',
    content: 'I\'ve completed the upgrade and all file changes on a separate branch. CI all passing. PR link: #142',
    created_at: new Date(Date.now() - 5100000).toISOString(),
    updated_at: new Date(Date.now() - 5100000).toISOString(),
    reactions: [{ emoji: '🎉', user_ids: ['user-1', 'user-2'] }],
  },
  // Channel 3: Leadership
  {
    message_id: 'msg-3-1',
    channel_id: 'channel-3',
    sender_id: 'user-1',
    sender_type: 'human',
    content: 'We need to revisit Q3 OKRs. Some goals may need adjustment.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    message_id: 'msg-3-2',
    channel_id: 'channel-3',
    sender_id: 'agent-3',
    sender_type: 'agent',
    content: 'Based on current progress, these KRs may need adjustment:\n\n- KR2 "30% user growth" currently at 18%, suggest lowering target to 25%\n- KR4 "API latency < 100ms" already achieved, can raise the bar',
    created_at: new Date(Date.now() - 3500000).toISOString(),
    updated_at: new Date(Date.now() - 3500000).toISOString(),
  },
  // Channel 4: DM with Alice
  {
    message_id: 'msg-4-1',
    channel_id: 'channel-4',
    sender_id: 'user-2',
    sender_type: 'human',
    content: 'Hey, how\'s prep going for next week\'s design review?',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    message_id: 'msg-4-2',
    channel_id: 'channel-4',
    sender_id: 'user-1',
    sender_type: 'human',
    content: 'Almost done, I\'ll send you the Figma link tomorrow. Main changes are to navigation and Channel panel interactions.',
    created_at: new Date(Date.now() - 1700000).toISOString(),
    updated_at: new Date(Date.now() - 1700000).toISOString(),
  },
  {
    message_id: 'msg-4-3',
    channel_id: 'channel-4',
    sender_id: 'user-2',
    sender_type: 'human',
    content: 'Great, looking forward to it! Also reminder, there\'s an all-hands meeting Friday afternoon.',
    created_at: new Date(Date.now() - 1600000).toISOString(),
    updated_at: new Date(Date.now() - 1600000).toISOString(),
    reactions: [{ emoji: '👌', user_ids: ['user-1'] }],
  },
];

export const createMessage = (overrides: Partial<MessageEntity> = {}): MessageEntity => ({
  message_id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  channel_id: 'channel-1',
  sender_id: 'user-1',
  sender_type: 'human',
  content: 'Test message',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createChannel = (overrides: Partial<ChannelEntity> = {}): ChannelEntity => ({
  channel_id: `channel-${Date.now()}`,
  name: 'Test Channel',
  type: 'public',
  project_id: 'project-1',
  created_by: 'user-1',
  members: [],
  agent_pool: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
