import { InternalError, NotFoundError } from '../../common/errors';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class RepositoryError extends InternalError {
  readonly code = ERROR_CODES.REPOSITORY_ERROR;

  constructor(operation: string, entityType: string, reason: string) {
    super(
      `Repository operation failed: ${operation} on ${entityType} - ${reason}`,
      { operation, entityType, reason }
    );
  }
}

export class RepositoryEntityNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.REPOSITORY_ENTITY_NOT_FOUND;

  constructor(entityType: string, identifier: string) {
    super(
      `${entityType} not found: ${identifier}`,
      { entityType, identifier }
    );
  }
}

export class RepositorySaveError extends InternalError {
  readonly code = ERROR_CODES.REPOSITORY_SAVE_ERROR;

  constructor(entityType: string, entityId: string, reason: string) {
    super(
      `Failed to save ${entityType} ${entityId}: ${reason}`,
      { entityType, entityId, reason }
    );
  }
}
