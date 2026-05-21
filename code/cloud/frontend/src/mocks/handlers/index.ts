import { http, passthrough } from 'msw';
import { channelHandlers } from './channel.handlers';
import { agentHandlers } from './agent.handlers';

export const handlers = [
  ...channelHandlers,
  ...agentHandlers,

  // Passthrough all tRPC filesystem requests to real backend
  http.all('*/trpc/filesystem.*', () => passthrough()),
];
