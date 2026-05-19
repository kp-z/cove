import { NotFoundError, ConflictError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class UserNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.USER_NOT_FOUND;

  constructor(identifier: string) {
    super(`User not found: ${identifier}`, { identifier });
  }
}

export class UsernameAlreadyExistsError extends ConflictError {
  readonly code = ERROR_CODES.USERNAME_ALREADY_EXISTS;

  constructor(username: string) {
    super(`Username already exists: ${username}`, { username });
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  readonly code = ERROR_CODES.EMAIL_ALREADY_EXISTS;

  constructor(email: string) {
    super(`Email already exists: ${email}`, { email });
  }
}
