// Re-export types from tRPC for backward compatibility with mocks
import type { RouterOutputs, RouterInputs } from '@/lib/trpc-types';

export type MessageEntity = RouterOutputs['message']['getById'];
export type ChannelEntity = RouterOutputs['channel']['getById'];
export type AgentEntity = {
  agent_id: string;
  name: string;
  description?: string;
  model: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SendMessageDTO = RouterInputs['message']['send'];
export type UpdateMessageDTO = RouterInputs['message']['update'];
export type DeleteMessageDTO = { messageId: string; deleted_by: string };
export type ReactionDTO = RouterInputs['message']['addReaction'];
