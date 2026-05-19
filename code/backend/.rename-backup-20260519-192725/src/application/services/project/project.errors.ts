import { NotFoundError, StateError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class ProjectNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.PROJECT_NOT_FOUND;

  constructor(projectId: string) {
    super(`Project not found: ${projectId}`, { projectId });
  }
}

export class ProjectNotArchivedError extends StateError {
  readonly code = ERROR_CODES.PROJECT_NOT_ARCHIVED;

  constructor(projectId: string) {
    super(`Project must be archived before deletion: ${projectId}`, { projectId });
  }
}
