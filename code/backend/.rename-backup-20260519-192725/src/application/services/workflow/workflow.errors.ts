import { NotFoundError, StateError, ValidationError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class WorkflowNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.WORKFLOW_NOT_FOUND;

  constructor(workflowId: string) {
    super(`Workflow not found: ${workflowId}`, { workflowId });
  }
}

export class WorkflowNotArchivedError extends StateError {
  readonly code = ERROR_CODES.WORKFLOW_NOT_DELETABLE;

  constructor(workflowId: string) {
    super(`Workflow must be archived before deletion: ${workflowId}`, { workflowId });
  }
}

export class WorkflowStepsInvalidError extends ValidationError {
  readonly code = ERROR_CODES.WORKFLOW_STEPS_INVALID;

  constructor(workflowId: string, reason: string) {
    super(`Workflow steps are invalid: ${reason}`, { workflowId, reason });
  }
}
