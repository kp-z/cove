/**
 * Avatar Data Hooks
 *
 * These hooks provide a unified way to fetch avatar data for different entity types.
 * They handle the data fetching logic so Avatar component can remain pure.
 */

import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { getAgentAvatarUrl } from '@/features/agent/utils/avatar';

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
    avatarUrl: agentAvatarUrl ? getAgentAvatarUrl(agentAvatarUrl) : null,
    name: agent?.display_name || agent?.name || 'Unknown Agent',
  };
}

/**
 * Get avatar data for any entity type (user, agent, or channel)
 */
export function useEntityAvatarData(
  type: 'user' | 'agent' | 'channel',
  id: string
): AvatarData {
  const { data: user } = useUser(type === 'user' ? id : '', { enabled: type === 'user' });
  const { data: agent } = useAgent(id, { enabled: type === 'agent' });

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
      avatarUrl: agentAvatarUrl ? getAgentAvatarUrl(agentAvatarUrl) : null,
      name: agent.display_name || agent.name || 'Unknown Agent',
    };
  }

  if (type === 'channel') {
    // TODO: Implement channel avatar logic when channel API is ready
    return {
      avatarUrl: null,
      name: 'Channel',
    };
  }

  return {
    avatarUrl: null,
    name: 'Unknown',
  };
}
