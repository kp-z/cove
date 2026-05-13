import { http } from 'msw';
import { db } from '../utils/database';
import { createSuccessResponse, ErrorResponses } from '../utils/response';

const BASE_URL = '/api';

export const agentHandlers = [
  http.get(`${BASE_URL}/agents`, async ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') ?? undefined;
    const search = url.searchParams.get('search') ?? undefined;

    const result = db.getAgents({ scope, search });
    return createSuccessResponse(result);
  }),

  http.get(`${BASE_URL}/agents/:agentId`, async ({ params }) => {
    const { agentId } = params;
    const agent = db.getFullAgent(agentId as string);
    if (!agent) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse(agent);
  }),

  http.post(`${BASE_URL}/agents`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const created = db.createAgent(body);
    return createSuccessResponse(created);
  }),

  http.delete(`${BASE_URL}/agents/:agentId`, async ({ params }) => {
    const { agentId } = params;
    const deleted = db.deleteAgent(agentId as string);
    if (!deleted) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse({ agent_id: agentId as string, deleted: true });
  }),

  http.put(`${BASE_URL}/agents/:agentId`, async ({ params, request }) => {
    const { agentId } = params;
    const body = await request.json() as Record<string, unknown>;
    const updated = db.updateAgent(agentId as string, body);
    if (!updated) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse(updated);
  }),

  http.patch(`${BASE_URL}/agents/:agentId/runtime`, async ({ params, request }) => {
    const { agentId } = params;
    const body = await request.json() as Record<string, unknown>;
    const updated = db.updateAgent(agentId as string, body);
    if (!updated) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse(updated);
  }),

  http.patch(`${BASE_URL}/agents/:agentId/persona`, async ({ params, request }) => {
    const { agentId } = params;
    const body = await request.json() as Record<string, unknown>;
    const updated = db.updateAgent(agentId as string, body);
    if (!updated) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse(updated);
  }),

  http.patch(`${BASE_URL}/agents/:agentId/skills`, async ({ params, request }) => {
    const { agentId } = params;
    const body = await request.json() as Record<string, unknown>;
    const updated = db.updateAgent(agentId as string, body);
    if (!updated) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse(updated);
  }),

  http.patch(`${BASE_URL}/agents/:agentId/tools`, async ({ params, request }) => {
    const { agentId } = params;
    const body = await request.json() as Record<string, unknown>;
    const updated = db.updateAgent(agentId as string, body);
    if (!updated) {
      return ErrorResponses.notFound('Agent', agentId as string);
    }
    return createSuccessResponse(updated);
  }),
];
