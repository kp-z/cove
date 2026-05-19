/**
 * Server Service Error Classes
 */

import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class ServerNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.SERVER_NOT_FOUND;

  constructor(serverId: string) {
    super(`Server not found: ${serverId}`, { serverId });
  }
}

export class ServerNameAlreadyExistsError extends ConflictError {
  readonly code = ERROR_CODES.SERVER_NAME_EXISTS;

  constructor(name: string) {
    super(`Server name already exists: ${name}`, { name });
  }
}

export class ServerNotActiveError extends ValidationError {
  readonly code = ERROR_CODES.SERVER_NOT_ACTIVE;

  constructor(serverId: string) {
    super(`Server is not active: ${serverId}`, { serverId });
  }
}

export class ServerAlreadyArchivedError extends ValidationError {
  readonly code = ERROR_CODES.SERVER_ALREADY_ARCHIVED;

  constructor(serverId: string) {
    super(`Server is already archived: ${serverId}`, { serverId });
  }
}

export class ServerNotArchivedError extends ValidationError {
  readonly code = ERROR_CODES.SERVER_NOT_ARCHIVED;

  constructor(serverId: string) {
    super(`Server is not archived: ${serverId}`, { serverId });
  }
}

export class UnauthorizedServerAccessError extends AuthorizationError {
  readonly code = ERROR_CODES.UNAUTHORIZED_SERVER_ACCESS;

  constructor(serverId: string, userId: string) {
    super(`User ${userId} is not authorized to access server ${serverId}`, { serverId, userId });
  }
}
