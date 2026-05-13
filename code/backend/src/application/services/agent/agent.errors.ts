/**
 * Agent Service Errors
 */

import { AgentStatus } from '../../../domain/models/agent/agent.entity';

export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentNotAvailableError extends Error {
  constructor(agentId: string, status: AgentStatus) {
    super(`Agent is not available: ${agentId} (status: ${status})`);
    this.name = 'AgentNotAvailableError';
  }
}

export class AgentInUseError extends Error {
  constructor(agentId: string) {
    super(`Agent is in use and cannot be deleted: ${agentId}`);
    this.name = 'AgentInUseError';
  }
}

export class AgentResponseGenerationError extends Error {
  constructor(agentId: string, messageId: string) {
    super(`Failed to generate response for agent ${agentId} to message ${messageId}`);
    this.name = 'AgentResponseGenerationError';
  }
}
