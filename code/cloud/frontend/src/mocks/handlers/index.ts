import { channelHandlers } from './channel.handlers';
import { agentHandlers } from './agent.handlers';

export const handlers = [
  ...channelHandlers,
  ...agentHandlers,
];
