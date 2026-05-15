/**
 * Agent Service Errors
 */

import { AgentStatus } from '../../../domain/models/agent/agent.entity';
import { NotFoundError, StateError, InternalError, ConflictError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class AgentNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.AGENT_NOT_FOUND;

  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`, { agentId });
  }
}

export class AgentNotAvailableError extends StateError {
  readonly code = ERROR_CODES.AGENT_NOT_AVAILABLE;

  constructor(agentId: string, status: AgentStatus) {
    super(`Agent is not available: ${agentId} (status: ${status})`, { agentId, status });
  }
}

export class AgentInUseError extends StateError {
  readonly code = ERROR_CODES.AGENT_IN_USE;

  constructor(agentId: string) {
    super(`Agent is in use and cannot be deleted: ${agentId}`, { agentId });
  }
}

export class AgentResponseGenerationError extends InternalError {
  readonly code = ERROR_CODES.AGENT_RESPONSE_GENERATION_FAILED;

  constructor(agentId: string, messageId: string) {
    super(`Failed to generate response for agent ${agentId} to message ${messageId}`, { agentId, messageId });
  }
}

export class AgentAlreadyExistsError extends ConflictError {
  readonly code = 'AGENT_ALREADY_EXISTS';

  constructor(agentId: string) {
    super(`Agent already exists: ${agentId}`, { agentId });
  }
}

