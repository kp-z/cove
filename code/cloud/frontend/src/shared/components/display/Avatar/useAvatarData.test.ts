import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserAvatarData, useAgentAvatarData, useChannelAvatarData, useEntityAvatarData } from './useAvatarData';
import * as userHooks from '@/lib/trpc/hooks/user.hooks';
import * as agentHooks from '@/lib/trpc/hooks/agent.hooks';
import * as channelHooks from '@/lib/trpc/hooks/channel.hooks';

// Mock the hooks
vi.mock('@/lib/trpc/hooks/user.hooks');
vi.mock('@/lib/trpc/hooks/agent.hooks');
vi.mock('@/lib/trpc/hooks/channel.hooks');
vi.mock('@/shared/utils/avatar', () => ({
  getAvatarUrl: (avatar: string) => `https://api.example.com/${avatar}`,
}));
vi.mock('@/features/agent/utils/avatar', () => ({
  getAgentAvatarUrl: (url: string) => url ? `https://api.example.com/${url}` : null,
}));

describe('useAvatarData hooks', () => {
  describe('useUserAvatarData', () => {
    it('should return user avatar data', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: {
          id: 'user-1',
          avatar: 'avatars/user-1.png',
          displayName: 'John Doe',
          username: 'johndoe',
          name: 'John Doe',
        },
      } as any);

      const { result } = renderHook(() => useUserAvatarData('user-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/user-1.png',
        name: 'John Doe',
      });
    });

    it('should fallback to username when displayName is not available', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: {
          id: 'user-1',
          avatar: null,
          displayName: null,
          username: 'johndoe',
          name: 'johndoe',
        },
      } as any);

      const { result } = renderHook(() => useUserAvatarData('user-1'));

      expect(result.current.name).toBe('johndoe');
    });

    it('should return null avatarUrl when user has no avatar', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: {
          id: 'user-1',
          avatar: null,
          displayName: 'John Doe',
          username: 'johndoe',
          name: 'John Doe',
        },
      } as any);

      const { result } = renderHook(() => useUserAvatarData('user-1'));

      expect(result.current.avatarUrl).toBeNull();
    });

    it('should return "Unknown User" when user data is not available', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: undefined,
      } as any);

      const { result } = renderHook(() => useUserAvatarData('user-1'));

      expect(result.current).toEqual({
        avatarUrl: null,
        name: 'Unknown User',
      });
    });
  });

  describe('useAgentAvatarData', () => {
    it('should return agent avatar data', () => {
      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          persona: {
            avatar: {
              url: 'avatars/agent-1.png',
            },
          },
          display_name: 'Test Agent',
          name: 'test-agent',
        },
      } as any);

      const { result } = renderHook(() => useAgentAvatarData('agent-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/agent-1.png',
        name: 'Test Agent',
      });
    });

    it('should fallback to name when display_name is not available', () => {
      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          persona: null,
          display_name: null,
          name: 'test-agent',
        },
      } as any);

      const { result } = renderHook(() => useAgentAvatarData('agent-1'));

      expect(result.current.name).toBe('test-agent');
    });

    it('should return null avatarUrl when agent has no avatar', () => {
      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          persona: null,
          display_name: 'Test Agent',
          name: 'test-agent',
        },
      } as any);

      const { result } = renderHook(() => useAgentAvatarData('agent-1'));

      expect(result.current.avatarUrl).toBeNull();
    });

    it('should return "Unknown Agent" when agent data is not available', () => {
      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: undefined,
      } as any);

      const { result } = renderHook(() => useAgentAvatarData('agent-1'));

      expect(result.current).toEqual({
        avatarUrl: null,
        name: 'Unknown Agent',
      });
    });
  });

  describe('useChannelAvatarData', () => {
    it('should return channel avatar data with object avatar', () => {
      vi.mocked(channelHooks.useChannel).mockReturnValue({
        data: {
          channel_id: 'channel-1',
          avatar: { url: 'avatars/channel-1.png', type: 'uploaded' },
          display_name: 'General',
          name: 'general',
        },
      } as any);

      const { result } = renderHook(() => useChannelAvatarData('channel-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/channel-1.png',
        name: 'General',
      });
    });

    it('should return channel avatar data with string avatar', () => {
      vi.mocked(channelHooks.useChannel).mockReturnValue({
        data: {
          channel_id: 'channel-1',
          avatar: 'avatars/channel-1.png',
          display_name: 'General',
          name: 'general',
        },
      } as any);

      const { result } = renderHook(() => useChannelAvatarData('channel-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/channel-1.png',
        name: 'General',
      });
    });

    it('should fallback to name when display_name is not available', () => {
      vi.mocked(channelHooks.useChannel).mockReturnValue({
        data: {
          channel_id: 'channel-1',
          avatar: null,
          display_name: null,
          name: 'general',
        },
      } as any);

      const { result } = renderHook(() => useChannelAvatarData('channel-1'));

      expect(result.current).toEqual({
        avatarUrl: null,
        name: 'general',
      });
    });

    it('should return "Unknown Channel" when channel data is not available', () => {
      vi.mocked(channelHooks.useChannel).mockReturnValue({
        data: undefined,
      } as any);

      const { result } = renderHook(() => useChannelAvatarData('channel-1'));

      expect(result.current).toEqual({
        avatarUrl: null,
        name: 'Unknown Channel',
      });
    });
  });

  describe('useEntityAvatarData', () => {
    it('should return user data when type is "user"', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: {
          id: 'user-1',
          avatar: 'avatars/user-1.png',
          displayName: 'John Doe',
          username: 'johndoe',
          name: 'John Doe',
        },
      } as any);

      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: undefined,
      } as any);

      const { result } = renderHook(() => useEntityAvatarData('user', 'user-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/user-1.png',
        name: 'John Doe',
      });
    });

    it('should return agent data when type is "agent"', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: undefined,
      } as any);

      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          persona: {
            avatar: {
              url: 'avatars/agent-1.png',
            },
          },
          display_name: 'Test Agent',
          name: 'test-agent',
        },
      } as any);

      const { result } = renderHook(() => useEntityAvatarData('agent', 'agent-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/agent-1.png',
        name: 'Test Agent',
      });
    });

    it('should return channel avatar data when type is "channel"', () => {
      vi.mocked(channelHooks.useChannel).mockReturnValue({
        data: {
          channel_id: 'channel-1',
          avatar: { url: 'avatars/channel-1.png', type: 'uploaded' },
          display_name: 'General',
          name: 'general',
        },
      } as any);

      const { result } = renderHook(() => useEntityAvatarData('channel', 'channel-1'));

      expect(result.current).toEqual({
        avatarUrl: 'https://api.example.com/avatars/channel-1.png',
        name: 'General',
      });
    });

    it('should return "Unknown" when entity data is not available', () => {
      vi.mocked(userHooks.useUser).mockReturnValue({
        data: undefined,
      } as any);

      vi.mocked(agentHooks.useAgent).mockReturnValue({
        data: undefined,
      } as any);

      const { result } = renderHook(() => useEntityAvatarData('user', 'user-1'));

      expect(result.current).toEqual({
        avatarUrl: null,
        name: 'Unknown',
      });
    });
  });
});
