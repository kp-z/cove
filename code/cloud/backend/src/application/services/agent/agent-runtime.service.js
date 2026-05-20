"use strict";
/**
 * AgentRuntimeService - Agent 运行时管理
 *
 * 职责：
 * - 启动和停止 Agent Runtime
 * - 查询 Agent 运行状态
 * - 发布状态变更事件
 *
 * 依赖：
 * - IAgentRepository: Agent 数据访问
 * - IRuntimeAdapter: 运行时适配器
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentNotReadyError = exports.AgentRuntimeService = void 0;
const agent_errors_1 = require("./agent.errors");
class AgentRuntimeService {
    agentRepository;
    runtimeAdapter;
    eventBus;
    logger;
    constructor(agentRepository, runtimeAdapter, eventBus, logger) {
        this.agentRepository = agentRepository;
        this.runtimeAdapter = runtimeAdapter;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    /**
     * 启动 Agent
     */
    async startAgent(agentId) {
        this.logger.info('Starting agent runtime', { agentId });
        const agent = await this.agentRepository.findById(agentId);
        if (!agent) {
            throw new agent_errors_1.AgentNotFoundError(agentId);
        }
        if (!agent.canBeStarted()) {
            throw new AgentNotReadyError(agentId);
        }
        await this.runtimeAdapter.startAgent(agentId, agent.runtimeConfig);
        await this.eventBus.publish({
            eventId: this.generateEventId(),
            eventType: 'agent_status_changed',
            aggregateId: agentId,
            aggregateType: 'Agent',
            occurredAt: new Date(),
            payload: {
                agentId,
                status: 'running',
            },
        });
        this.logger.info('Agent runtime started', { agentId });
    }
    /**
     * 停止 Agent
     */
    async stopAgent(agentId) {
        this.logger.info('Stopping agent runtime', { agentId });
        const agent = await this.agentRepository.findById(agentId);
        if (!agent) {
            throw new agent_errors_1.AgentNotFoundError(agentId);
        }
        await this.runtimeAdapter.stopAgent(agentId);
        await this.eventBus.publish({
            eventId: this.generateEventId(),
            eventType: 'agent_status_changed',
            aggregateId: agentId,
            aggregateType: 'Agent',
            occurredAt: new Date(),
            payload: {
                agentId,
                status: 'stopped',
            },
        });
        this.logger.info('Agent runtime stopped', { agentId });
    }
    /**
     * 获取 Agent 运行状态
     */
    async getStatus(agentId) {
        const status = await this.runtimeAdapter.getRuntimeStatus(agentId);
        return { status };
    }
    generateEventId() {
        return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.AgentRuntimeService = AgentRuntimeService;
// --- Errors ---
class AgentNotReadyError extends Error {
    constructor(agentId) {
        super(`Agent not ready to start: ${agentId}`);
        this.name = 'AgentNotReadyError';
    }
}
exports.AgentNotReadyError = AgentNotReadyError;
