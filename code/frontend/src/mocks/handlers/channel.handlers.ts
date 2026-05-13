/**
 * Channel Feature MSW Handlers
 */

import { http } from 'msw';
import { db } from '../utils/database';
import { createSuccessResponse, ErrorResponses } from '../utils/response';
import { createMessage } from '../fixtures/channel.fixtures';
import type { SendMessageDTO, UpdateMessageDTO, DeleteMessageDTO, ReactionDTO } from '@/features/channel/api/client';

const BASE_URL = '/api';

export const channelHandlers = [
  http.get(`${BASE_URL}/channels`, async () => {
    const channels = db.getChannels();
    return createSuccessResponse({ channels, total: channels.length });
  }),

  http.post(`${BASE_URL}/channels/:channelId/messages`, async ({ params, request }) => {
    const { channelId } = params;
    const body = await request.json() as Omit<SendMessageDTO, 'channel_id'>;

    const channel = db.getChannel(channelId as string);
    if (!channel) {
      return ErrorResponses.notFound('Channel', channelId as string);
    }

    if (!body.content?.trim()) {
      return ErrorResponses.validationError('Content is required');
    }

    const newMessage = createMessage({
      channel_id: channelId as string,
      sender_id: body.sender_id,
      sender_type: body.sender_type,
      content: body.content,
      thread_id: body.thread_id,
      attachments: body.attachments,
      mentions: body.mentions,
    });

    db.createMessage(newMessage);

    return createSuccessResponse(newMessage);
  }),

  http.get(`${BASE_URL}/channels/:channelId/messages`, async ({ params, request }) => {
    const { channelId } = params;
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const channel = db.getChannel(channelId as string);
    if (!channel) {
      return ErrorResponses.notFound('Channel', channelId as string);
    }

    const result = db.getMessages(channelId as string, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return createSuccessResponse(result);
  }),

  http.get(`${BASE_URL}/messages/:messageId`, async ({ params }) => {
    const { messageId } = params;

    const message = db.getMessage(messageId as string);
    if (!message) {
      return ErrorResponses.notFound('Message', messageId as string);
    }

    return createSuccessResponse(message);
  }),

  http.put(`${BASE_URL}/messages/:messageId`, async ({ params, request }) => {
    const { messageId } = params;
    const body = await request.json() as Pick<UpdateMessageDTO, 'content'>;

    const message = db.getMessage(messageId as string);
    if (!message) {
      return ErrorResponses.notFound('Message', messageId as string);
    }

    if (!body.content?.trim()) {
      return ErrorResponses.validationError('Content cannot be empty');
    }

    const updated = db.updateMessage(messageId as string, {
      content: body.content,
    });

    return createSuccessResponse(updated);
  }),

  http.delete(`${BASE_URL}/messages/:messageId`, async ({ params, request }) => {
    const { messageId } = params;
    const body = await request.json() as Pick<DeleteMessageDTO, 'deleted_by'>;

    const message = db.getMessage(messageId as string);
    if (!message) {
      return ErrorResponses.notFound('Message', messageId as string);
    }

    const deleted = db.deleteMessage(messageId as string, body.deleted_by);

    return createSuccessResponse({
      message_id: messageId as string,
      deleted,
    });
  }),

  http.post(`${BASE_URL}/messages/:messageId/reactions`, async ({ params, request }) => {
    const { messageId } = params;
    const body = await request.json() as Omit<ReactionDTO, 'message_id'>;

    const message = db.getMessage(messageId as string);
    if (!message) {
      return ErrorResponses.notFound('Message', messageId as string);
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingReaction = message.reactions.find(r => r.emoji === body.emoji);
    if (existingReaction) {
      if (!existingReaction.user_ids.includes(body.user_id)) {
        existingReaction.user_ids.push(body.user_id);
      }
    } else {
      message.reactions.push({
        emoji: body.emoji,
        user_ids: [body.user_id],
      });
    }

    const updated = db.updateMessage(messageId as string, { reactions: message.reactions });

    return createSuccessResponse(updated);
  }),

  http.delete(`${BASE_URL}/messages/:messageId/reactions`, async ({ params, request }) => {
    const { messageId } = params;
    const body = await request.json() as Omit<ReactionDTO, 'message_id'>;

    const message = db.getMessage(messageId as string);
    if (!message || !message.reactions) {
      return ErrorResponses.notFound('Reaction');
    }

    const reaction = message.reactions.find(r => r.emoji === body.emoji);
    if (reaction) {
      reaction.user_ids = reaction.user_ids.filter(id => id !== body.user_id);
      if (reaction.user_ids.length === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== body.emoji);
      }
    }

    const updated = db.updateMessage(messageId as string, { reactions: message.reactions });

    return createSuccessResponse(updated);
  }),

  http.get(`${BASE_URL}/channels/:channelId`, async ({ params }) => {
    const { channelId } = params;

    const channel = db.getChannel(channelId as string);
    if (!channel) {
      return ErrorResponses.notFound('Channel', channelId as string);
    }

    return createSuccessResponse(channel);
  }),

  http.get(`${BASE_URL}/channels/:channelId/members`, async ({ params }) => {
    const { channelId } = params;

    const channel = db.getChannel(channelId as string);
    if (!channel) {
      return ErrorResponses.notFound('Channel', channelId as string);
    }

    return createSuccessResponse({
      channel_id: channelId as string,
      members: channel.members,
      total: channel.members.length,
    });
  }),

  http.get(`${BASE_URL}/channels/:channelId/agents`, async ({ params }) => {
    const { channelId } = params;

    const channel = db.getChannel(channelId as string);
    if (!channel) {
      return ErrorResponses.notFound('Channel', channelId as string);
    }

    return createSuccessResponse({
      channel_id: channelId as string,
      agent_pool: channel.agent_pool,
      total: channel.agent_pool.length,
    });
  }),
];
