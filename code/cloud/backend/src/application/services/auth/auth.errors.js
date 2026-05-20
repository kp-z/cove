"use strict";
/**
 * Auth Service Errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDisabledError = exports.InvalidTokenError = exports.InvalidCredentialsError = void 0;
class InvalidCredentialsError extends Error {
    constructor(message = 'Invalid username or password') {
        super(message);
        this.name = 'InvalidCredentialsError';
    }
}
exports.InvalidCredentialsError = InvalidCredentialsError;
class InvalidTokenError extends Error {
    constructor(message = 'Invalid or expired token') {
        super(message);
        this.name = 'InvalidTokenError';
    }
}
exports.InvalidTokenError = InvalidTokenError;
class UserDisabledError extends Error {
    constructor(username) {
        super(`User account is disabled: ${username}`);
        this.name = 'UserDisabledError';
    }
}
exports.UserDisabledError = UserDisabledError;
