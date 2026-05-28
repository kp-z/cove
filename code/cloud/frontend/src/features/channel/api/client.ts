/**
 * Channel API Client Types
 *
 * Re-exports channel-related types from tRPC
 */

import type { Channel } from '@/lib/trpc-types';

// Export Channel as ChannelEntity for backward compatibility
export type ChannelEntity = Channel;
