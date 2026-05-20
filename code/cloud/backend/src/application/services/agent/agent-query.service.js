"use strict";
/**
 * AgentQueryService - Agent 查询操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentQueryService = void 0;
const agent_errors_1 = require("./agent.errors");
class AgentQueryService {
    agentRepository;
    configStore;
    adapterService;
    constructor(agentRepository, configStore, adapterService) {
        this.agentRepository = agentRepository;
        this.configStore = configStore;
        this.adapterService = adapterService;
    }
    async getAgentById(agentId) {
        const agent = await this.agentRepository.findById(agentId);
        if (!agent) {
            throw new agent_errors_1.AgentNotFoundError(agentId);
        }
        return agent;
    }
    async getAgentDetail(agentId) {
        const agent = await this.getAgentById(agentId);
        const json = agent.toJSON();
        const detail = { ...json };
        if (this.configStore) {
            const [runtime, persona, files] = await Promise.all([
                this.configStore.getRuntime(agentId).catch(() => null),
                this.configStore.getPersona(agentId).catch(() => null),
                this.configStore.getFilePaths(agentId).catch(() => null),
            ]);
            detail.runtime = runtime;
            detail.persona = persona;
            detail.files = files;
            // If runtime has adapter_id, fetch the adapter configuration
            if (runtime?.adapter_id && this.adapterService) {
                try {
                    // Skip permission check for internal query - the adapter is already referenced in the agent's runtime
                    const adapter = await this.adapterService.getById(runtime.adapter_id, agent.createdBy, true);
                    detail.adapter = adapter;
                }
                catch (error) {
                    // Adapter not found or access denied, continue without it
                    detail.adapter = null;
                }
            }
        }
        return detail;
    }
    async getAllAgents() {
        return await this.agentRepository.findAll();
    }
    async getAgentsByStatus(status) {
        const allAgents = await this.agentRepository.findAll();
        return allAgents.filter(agent => agent.status === status);
    }
    async getAvailableAgents() {
        const allAgents = await this.agentRepository.findAll();
        return allAgents.filter(agent => agent.status === 'idle');
    }
}
exports.AgentQueryService = AgentQueryService;
