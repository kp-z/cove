import { describe, it, expect, beforeEach } from 'vitest';
import { AgentChannelApiClient } from './client';
import { resetMsw, mockEndpointError } from '@/test/msw-utils';

describe('AgentChannelApiClient - MSW Integration', () => {
  const client = new AgentChannelApiClient();

  beforeEach(() => {
    resetMsw();
  });

  describe('sendMessage', () => {
    it('should successfully send a message via MSW', async () => {
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

    it('should return 404 error when channel does not exist', async () => {
      await expect(
        client.sendMessage({
          channelId: 'non-existent',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Test',
        })
      ).rejects.toThrow('Channel with id "non-existent" not found');
    });

    it('should return validation error when content is empty', async () => {
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
    it('should fetch channel message list', async () => {
      const result = await client.getMessages('channel-1');

      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should support pagination params', async () => {
      const result = await client.getMessages('channel-1', {
        limit: 2,
        offset: 0,
      });

      expect(result.messages.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getChannel', () => {
    it('should fetch channel details', async () => {
      const result = await client.getChannel('channel-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('channel-1');
      expect(result.name).toBe('General');
    });

    it('should return 404 when channel does not exist', async () => {
      await expect(
        client.getChannel('non-existent')
      ).rejects.toThrow('Channel with id "non-existent" not found');
    });
  });

  describe('error scenario simulation', () => {
    it('should simulate server error', async () => {
      mockEndpointError('get', '/api/channels/channel-1', 'serverError');

      await expect(
        client.getChannel('channel-1')
      ).rejects.toThrow('Internal server error');
    });

    it('should simulate unauthorized error', async () => {
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
