"use strict";
/**
 * Agent Service Errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentAlreadyExistsError = exports.AgentResponseGenerationError = exports.AgentInUseError = exports.AgentNotAvailableError = exports.AgentNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class AgentNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.AGENT_NOT_FOUND;
    constructor(agentId) {
        super(`Agent not found: ${agentId}`, { agentId });
    }
}
exports.AgentNotFoundError = AgentNotFoundError;
class AgentNotAvailableError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.AGENT_NOT_AVAILABLE;
    constructor(agentId, status) {
        super(`Agent is not available: ${agentId} (status: ${status})`, { agentId, status });
    }
}
exports.AgentNotAvailableError = AgentNotAvailableError;
class AgentInUseError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.AGENT_IN_USE;
    constructor(agentId) {
        super(`Agent is in use and cannot be deleted: ${agentId}`, { agentId });
    }
}
exports.AgentInUseError = AgentInUseError;
class AgentResponseGenerationError extends errors_1.InternalError {
    code = error_codes_1.ERROR_CODES.AGENT_RESPONSE_GENERATION_FAILED;
    constructor(agentId, messageId) {
        super(`Failed to generate response for agent ${agentId} to message ${messageId}`, { agentId, messageId });
    }
}
exports.AgentResponseGenerationError = AgentResponseGenerationError;
class AgentAlreadyExistsError extends errors_1.ConflictError {
    code = 'AGENT_ALREADY_EXISTS';
    constructor(agentId) {
        super(`Agent already exists: ${agentId}`, { agentId });
    }
}
exports.AgentAlreadyExistsError = AgentAlreadyExistsError;
