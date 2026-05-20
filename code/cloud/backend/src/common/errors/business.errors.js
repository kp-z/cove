"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationError = exports.StateError = exports.ConflictError = exports.ValidationError = exports.NotFoundError = exports.BusinessError = void 0;
const base_errors_1 = require("./base.errors");
/**
 * Base class for business logic errors (4xx status codes).
 */
class BusinessError extends base_errors_1.AppError {
    constructor(message, statusCode, context) {
        super(message, statusCode, context);
    }
}
exports.BusinessError = BusinessError;
/**
 * Resource not found error (404).
 */
class NotFoundError extends BusinessError {
    constructor(message, context) {
        super(message, 404, context);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Validation error (400).
 */
class ValidationError extends BusinessError {
    constructor(message, context) {
        super(message, 400, context);
    }
}
exports.ValidationError = ValidationError;
/**
 * Conflict error (409).
 */
class ConflictError extends BusinessError {
    constructor(message, context) {
        super(message, 409, context);
    }
}
exports.ConflictError = ConflictError;
/**
 * Invalid state transition error (422).
 */
class StateError extends BusinessError {
    constructor(message, context) {
        super(message, 422, context);
    }
}
exports.StateError = StateError;
/**
 * Authorization error (403).
 */
class AuthorizationError extends BusinessError {
    constructor(message, context) {
        super(message, 403, context);
    }
}
exports.AuthorizationError = AuthorizationError;
