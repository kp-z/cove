/**
 * Channel API Client - MSW 集成测试
 *
 * 演示如何使用 MSW 进行 API 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentChannelApiClient } from './client';
import { resetMsw, mockEndpointError } from '@/test/msw-utils';

describe('AgentChannelApiClient - MSW Integration', () => {
  const client = new AgentChannelApiClient();

  beforeEach(() => {
    resetMsw();
  });

  describe('sendMessage', () => {
    it('应该使用 MSW 成功发送消息', async () => {
      const result = await client.sendMessage({
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello from MSW!',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello from MSW!');
      expect(result.channelId).toBe('channel-1');
    });

    it('应该在频道不存在时返回 404 错误', async () => {
      await expect(
        client.sendMessage({
          channelId: 'non-existent',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Test',
        })
      ).rejects.toThrow('Channel with id "non-existent" not found');
    });

    it('应该在内容为空时返回验证错误', async () => {
      await expect(
        client.sendMessage({
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: '   ',
        })
      ).rejects.toThrow('Content is required');
    });
  });

  describe('getMessages', () => {
    it('应该获取频道消息列表', async () => {
      const result = await client.getMessages('channel-1');

      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('应该支持分页参数', async () => {
      const result = await client.getMessages('channel-1', {
        limit: 2,
        offset: 0,
      });

      expect(result.messages.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getChannel', () => {
    it('应该获取频道详情', async () => {
      const result = await client.getChannel('channel-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('channel-1');
      expect(result.name).toBe('General');
    });

    it('应该在频道不存在时返回 404', async () => {
      await expect(
        client.getChannel('non-existent')
      ).rejects.toThrow('Channel with id "non-existent" not found');
    });
  });

  describe('错误场景模拟', () => {
    it('应该能够模拟服务器错误', async () => {
      mockEndpointError('get', '/api/channels/channel-1', 'serverError');

      await expect(
        client.getChannel('channel-1')
      ).rejects.toThrow('Internal server error');
    });

    it('应该能够模拟未授权错误', async () => {
      mockEndpointError('post', '/api/channels/channel-1/messages', 'unauthorized');

      await expect(
        client.sendMessage({
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Test',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });
});
