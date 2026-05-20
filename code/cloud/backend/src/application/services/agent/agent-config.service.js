"use strict";
/**
 * AgentConfigService - Agent 配置管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConfigService = void 0;
const agent_errors_1 = require("./agent.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class AgentConfigService {
    agentRepository;
    logger;
    configStore;
    constructor(agentRepository, logger, configStore) {
        this.agentRepository = agentRepository;
        this.logger = logger;
        this.configStore = configStore;
    }
    async updateRuntimeConfig(agentId, config) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating agent runtime config', { agentId, realmId: context.realmId });
        await this.getAgentById(agentId);
        if (this.configStore) {
            return this.configStore.updateRuntime(agentId, config);
        }
        const agent = await this.getAgentById(agentId);
        const updated = agent.updateRuntimeConfig(config);
        await this.agentRepository.update(updated, context.realmId);
        return updated;
    }
    async updatePersona(agentId, persona) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating agent persona', { agentId, realmId: context.realmId });
        await this.getAgentById(agentId);
        if (this.configStore) {
            return this.configStore.updatePersona(agentId, persona);
        }
        const agent = await this.getAgentById(agentId);
        const updated = agent.updatePersona(persona);
        await this.agentRepository.update(updated, context.realmId);
        return updated;
    }
    async updateSkills(agentId, skills) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating agent skills', { agentId, realmId: context.realmId });
        await this.getAgentById(agentId);
        if (this.configStore) {
            await this.configStore.updateSkills(agentId, skills);
            return skills;
        }
        const agent = await this.getAgentById(agentId);
        const updated = agent.updateSkills(skills);
        await this.agentRepository.update(updated, context.realmId);
        return updated;
    }
    async updateTools(agentId, tools) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating agent tools', { agentId, realmId: context.realmId });
        await this.getAgentById(agentId);
        if (this.configStore) {
            await this.configStore.updateTools(agentId, tools);
            return tools;
        }
        const agent = await this.getAgentById(agentId);
        const updated = agent.updateTools(tools);
        await this.agentRepository.update(updated, context.realmId);
        return updated;
    }
    async updateTriggers(agentId, triggers) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating agent triggers', { agentId, realmId: context.realmId });
        await this.getAgentById(agentId);
        if (this.configStore) {
            await this.configStore.updateTriggers(agentId, triggers);
            return triggers;
        }
        const agent = await this.getAgentById(agentId);
        const updated = agent.updateTriggers(triggers);
        await this.agentRepository.update(updated, context.realmId);
        return updated;
    }
    async getAgentById(agentId) {
        const agent = await this.agentRepository.findById(agentId);
        if (!agent) {
            throw new agent_errors_1.AgentNotFoundError(agentId);
        }
        return agent;
    }
}
exports.AgentConfigService = AgentConfigService;
