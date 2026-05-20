/**
 * Realm Service Error Classes
 */

import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class RealmNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.REALM_NOT_FOUND;

  constructor(realmId: string) {
    super(`Realm not found: ${realmId}`, { realmId });
  }
}

export class RealmNameAlreadyExistsError extends ConflictError {
  readonly code = ERROR_CODES.REALM_NAME_EXISTS;

  constructor(name: string) {
    super(`Realm name already exists: ${name}`, { name });
  }
}

export class RealmNotActiveError extends ValidationError {
  readonly code = ERROR_CODES.REALM_NOT_ACTIVE;

  constructor(realmId: string) {
    super(`Realm is not active: ${realmId}`, { realmId });
  }
}

export class RealmAlreadyArchivedError extends ValidationError {
  readonly code = ERROR_CODES.REALM_ALREADY_ARCHIVED;

  constructor(realmId: string) {
    super(`Realm is already archived: ${realmId}`, { realmId });
  }
}

export class RealmNotArchivedError extends ValidationError {
  readonly code = ERROR_CODES.REALM_NOT_ARCHIVED;

  constructor(realmId: string) {
    super(`Realm is not archived: ${realmId}`, { realmId });
  }
}

export class UnauthorizedRealmAccessError extends AuthorizationError {
  readonly code = ERROR_CODES.UNAUTHORIZED_REALM_ACCESS;

  constructor(realmId: string, userId: string) {
    super(`User ${userId} is not authorized to access server ${realmId}`, { realmId, userId });
  }
}
