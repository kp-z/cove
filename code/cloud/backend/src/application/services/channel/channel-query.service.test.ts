/**
 * ChannelQueryService 单元测试
 *
 * 重点覆盖 incrementMessageCount()：消息发送后刷新 Channel 的
 * meta.updated_at 与 messageCount（根因修复，见 message-crud.service.ts）。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelQueryService } from './channel-query.service';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { ChannelNotFoundError } from './channel.errors';
import { IChannelRepository, IMessageRepository } from '../../interfaces';
import { RealmContext } from '../../context/realm-context';
import { runWithContext } from '../../context/realm-context-store';

function buildChannel(): ChannelEntity {
  return ChannelEntity.create({
    channelId: 'channel-1',
    realmId: 'test-server-id',
    name: 'general',
    displayName: 'General',
    type: 'public',
    status: 'active',
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
    workspace: { root: '', sharedFiles: '', attachments: '' },
    meta: {
      messageCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: { id: 'user-1', type: 'human' },
    },
  });
}

describe('ChannelQueryService', () => {
  let service: ChannelQueryService;
  let mockChannelRepository: IChannelRepository;
  let mockMessageRepository: IMessageRepository;
  let testContext: RealmContext;

  beforeEach(() => {
    testContext = RealmContext.create('test-server-id', 'test-user-id');

    mockChannelRepository = {
      findById: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as IChannelRepository;

    mockMessageRepository = {} as unknown as IMessageRepository;

    service = new ChannelQueryService(mockChannelRepository, mockMessageRepository);
  });

  describe('incrementMessageCount', () => {
    it('应递增 messageCount 并刷新 meta.updated_at 后持久化', async () => {
      const channel = buildChannel();
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      await runWithContext(testContext, () => service.incrementMessageCount('channel-1'));

      expect(mockChannelRepository.findById).toHaveBeenCalledWith('channel-1', 'test-server-id');
      expect(mockChannelRepository.update).toHaveBeenCalledTimes(1);

      const [updatedChannel, realmId] = vi.mocked(mockChannelRepository.update).mock.calls[0]!;
      expect(realmId).toBe('test-server-id');
      expect(updatedChannel.meta.messageCount).toBe(1);
      expect(updatedChannel.meta.updatedAt.getTime()).toBeGreaterThan(channel.meta.updatedAt.getTime());
    });

    it('Channel 不存在时应抛出 ChannelNotFoundError，且不应调用 update', async () => {
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, () => service.incrementMessageCount('nonexistent'))
      ).rejects.toThrow(ChannelNotFoundError);

      expect(mockChannelRepository.update).not.toHaveBeenCalled();
    });
  });
});
