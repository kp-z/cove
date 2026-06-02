/**
 * Avatar Data Hooks
 *
 * These hooks provide a unified way to fetch avatar data for different entity types.
 * They handle the data fetching logic so Avatar component can remain pure.
 */

import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { useChannel } from '@/lib/trpc/hooks/channel.hooks';
import { getAvatarUrl } from './utils.tsx';

export interface AvatarData {
  avatarUrl?: string | null;
  name: string;
}

/**
 * Get avatar data for a user
 */
export function useUserAvatarData(userId: string): AvatarData {
  const { data: user } = useUser(userId);

  // Handle both string and object avatar formats
  let avatarUrl: string | null = null;
  if (user?.avatar) {
    if (typeof user.avatar === 'string') {
      avatarUrl = getAvatarUrl(user.avatar);
    } else if (typeof user.avatar === 'object' && (user.avatar as any).url) {
      avatarUrl = getAvatarUrl((user.avatar as any).url);
    }
  }

  return {
    avatarUrl,
    name: user?.displayName || (user as any)?.display_name || user?.username || (user as any)?.name || 'Unknown User',
  };
}

/**
 * Get avatar data for an agent
 */
export function useAgentAvatarData(agentId: string): AvatarData {
  const { data: agent } = useAgent(agentId);

  // Try multiple possible avatar locations
  const agentAvatarUrl = agent?.persona?.avatar?.url || (agent as any)?.avatar_url || (agent as any)?.avatarUrl;

  return {
    avatarUrl: agentAvatarUrl ? getAvatarUrl(agentAvatarUrl) : null,
    name: agent?.display_name || agent?.name || 'Unknown Agent',
  };
}

/**
 * Get avatar data for a channel
 */
export function useChannelAvatarData(channelId: string): AvatarData {
  const { data: channel } = useChannel(channelId);

  // Use channel's avatar directly (channels always have avatar from backend)
  let avatarUrl: string | null = null;
  if (channel?.avatar) {
    if (typeof channel.avatar === 'string') {
      avatarUrl = getAvatarUrl(channel.avatar);
    } else if (typeof channel.avatar === 'object' && (channel.avatar as any).url) {
      avatarUrl = getAvatarUrl((channel.avatar as any).url);
    }
  }

  return {
    avatarUrl,
    name: channel?.display_name || channel?.name || 'Unknown Channel',
  };
}

/**
 * Get avatar data for any entity type (user, agent, or channel)
 */
export function useEntityAvatarData(
  type: 'user' | 'agent' | 'channel',
  id: string
): AvatarData {
  const { data: user } = useUser(type === 'user' ? id : '');
  const { data: agent } = useAgent(id, { enabled: type === 'agent' });
  const { data: channel } = useChannel(type === 'channel' ? id : '');

  if (type === 'user' && user) {
    // Handle both string and object avatar formats
    let avatarUrl: string | null = null;
    if (user.avatar) {
      if (typeof user.avatar === 'string') {
        avatarUrl = getAvatarUrl(user.avatar);
      } else if (typeof user.avatar === 'object' && (user.avatar as any).url) {
        avatarUrl = getAvatarUrl((user.avatar as any).url);
      }
    }

    return {
      avatarUrl,
      name: user.displayName || (user as any).display_name || user.username || (user as any).name || 'Unknown User',
    };
  }

  if (type === 'agent' && agent) {
    const agentAvatarUrl = agent.persona?.avatar?.url || (agent as any).avatar_url || (agent as any).avatarUrl;
    return {
      avatarUrl: agentAvatarUrl ? getAvatarUrl(agentAvatarUrl) : null,
      name: agent.display_name || agent.name || 'Unknown Agent',
    };
  }

  if (type === 'channel' && channel) {
    // Handle both string and object avatar formats
    let avatarUrl: string | null = null;
    if (channel.avatar) {
      if (typeof channel.avatar === 'string') {
        avatarUrl = getAvatarUrl(channel.avatar);
      } else if (typeof channel.avatar === 'object' && (channel.avatar as any).url) {
        avatarUrl = getAvatarUrl((channel.avatar as any).url);
      }
    }

    return {
      avatarUrl,
      name: channel.display_name || channel.name || 'Unknown Channel',
    };
  }

  return {
    avatarUrl: null,
    name: 'Unknown',
  };
}
