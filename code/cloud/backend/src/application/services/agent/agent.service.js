"use strict";
/**
 * AgentService - Agent 管理业务逻辑（协调器）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
class AgentService {
    crudService;
    queryService;
    configService;
    taskService;
    responseService;
    constructor(crudService, queryService, configService, taskService, responseService) {
        this.crudService = crudService;
        this.queryService = queryService;
        this.configService = configService;
        this.taskService = taskService;
        this.responseService = responseService;
    }
    async createAgent(dto) {
        return this.crudService.createAgent(dto);
    }
    async getAgentById(agentId) {
        return this.queryService.getAgentById(agentId);
    }
    async getAgentDetail(agentId) {
        return this.queryService.getAgentDetail(agentId);
    }
    async getAllAgents() {
        return this.queryService.getAllAgents();
    }
    async getAgentsByStatus(status) {
        return this.queryService.getAgentsByStatus(status);
    }
    async getAvailableAgents() {
        return this.queryService.getAvailableAgents();
    }
    async updateAgent(agentId, dto) {
        return this.crudService.updateAgent(agentId, dto);
    }
    async updateRuntimeConfig(agentId, config) {
        return this.configService.updateRuntimeConfig(agentId, config);
    }
    async updatePersona(agentId, persona) {
        return this.configService.updatePersona(agentId, persona);
    }
    async updateSkills(agentId, skills) {
        return this.configService.updateSkills(agentId, skills);
    }
    async updateTools(agentId, tools) {
        return this.configService.updateTools(agentId, tools);
    }
    async updateTriggers(agentId, triggers) {
        return this.configService.updateTriggers(agentId, triggers);
    }
    async assignTask(dto) {
        return this.taskService.assignTask(dto);
    }
    async deleteAgent(agentId) {
        return this.crudService.deleteAgent(agentId);
    }
    async handleIncomingMessage(message) {
        return this.responseService.handleIncomingMessage(message);
    }
    async shouldAgentRespond(agent, message, channel) {
        return this.responseService.shouldAgentRespond(agent, message, channel);
    }
    async generateAgentResponse(agent, message, channel) {
        return this.responseService.generateAgentResponse(agent, message, channel);
    }
}
exports.AgentService = AgentService;
