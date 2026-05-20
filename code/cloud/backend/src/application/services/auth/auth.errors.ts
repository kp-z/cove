/**
 * Auth Service Errors
 */

export class InvalidCredentialsError extends Error {
  constructor(message: string = 'Invalid username or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = 'Invalid or expired token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class UserDisabledError extends Error {
  constructor(username: string) {
    super(`User account is disabled: ${username}`);
    this.name = 'UserDisabledError';
  }
}
