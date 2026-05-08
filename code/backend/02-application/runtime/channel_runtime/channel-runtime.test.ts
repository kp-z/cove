import { describe, it, expect, beforeEach } from 'vitest';
import { ChannelRuntime } from './channel-runtime';
import { ChannelService } from '../../services/channel/channel.service';
import { MessageService } from '../../services/message/message.service';

describe('ChannelRuntime', () => {
  let channelRuntime: ChannelRuntime;
  let mockChannelService: jest.Mocked<ChannelService>;
  let mockMessageService: jest.Mocked<MessageService>;

  beforeEach(() => {
    mockChannelService = {
      findById: jest.fn(),
      updateActivity: jest.fn(),
    } as any;
    mockMessageService = {
      create: jest.fn(),
      findByChannel: jest.fn(),
    } as any;
    channelRuntime = new ChannelRuntime(mockChannelService, mockMessageService);
  });

  it('should initialize channel runtime', async () => {
    const channelId = 'channel-123';
    mockChannelService.findById.mockResolvedValue({
      id: channelId,
      name: 'general',
      type: 'public',
      status: 'active',
    });

    await channelRuntime.initialize(channelId);
    expect(channelRuntime.isActive()).toBe(true);
  });

  it('should broadcast message to all members', async () => {
    const channelId = 'channel-123';
    const message = {
      content: 'Hello everyone',
      senderId: 'user-123',
    };

    mockChannelService.findById.mockResolvedValue({
      id: channelId,
      name: 'general',
      members: ['user-123', 'user-456', 'user-789'],
    });

    await channelRuntime.initialize(channelId);
    await channelRuntime.broadcastMessage(message);

    expect(mockMessageService.create).toHaveBeenCalled();
  });

  it('should handle channel archival', async () => {
    const channelId = 'channel-123';
    mockChannelService.findById.mockResolvedValue({
      id: channelId,
      name: 'old-channel',
      status: 'active',
    });

    await channelRuntime.initialize(channelId);
    await channelRuntime.archive();

    expect(channelRuntime.isActive()).toBe(false);
  });
});
