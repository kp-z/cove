import type { Agent, AgentListResponse, AgentFilters, UpdateAgentDto } from '../types/agent.types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return json.data;
}

export const agentService = {
  async getAgents(filters?: AgentFilters): Promise<AgentListResponse> {
    const params = new URLSearchParams();
    if (filters?.scope) params.set('scope', filters.scope);
    if (filters?.search) params.set('search', filters.search);
    const query = params.toString();
    const url = query ? `/api/agents?${query}` : '/api/agents';
    return request<AgentListResponse>(url);
  },

  async getAgent(id: string): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}`);
  },

  async createAgent(data: UpdateAgentDto): Promise<Agent> {
    return request<Agent>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAgent(id: string, data: UpdateAgentDto): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateAgentRuntime(id: string, data: Pick<UpdateAgentDto, 'model' | 'framework' | 'permission_mode'>): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}/runtime`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateAgentPersona(id: string, data: Pick<UpdateAgentDto, 'name' | 'description' | 'category' | 'priority' | 'scope' | 'memory'>): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}/persona`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateAgentSkills(id: string, data: Pick<UpdateAgentDto, 'skills'>): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}/skills`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateAgentTools(id: string, data: Pick<UpdateAgentDto, 'tools'>): Promise<Agent> {
    return request<Agent>(`/api/agents/${id}/tools`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteAgent(id: string): Promise<void> {
    await request<{ agent_id: string; deleted: boolean }>(`/api/agents/${id}`, {
      method: 'DELETE',
    });
  },
};
