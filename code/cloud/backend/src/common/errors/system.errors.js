"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServiceError = exports.InternalError = exports.SystemError = void 0;
const base_errors_1 = require("./base.errors");
/**
 * Base class for system errors (5xx status codes).
 */
class SystemError extends base_errors_1.AppError {
    constructor(message, statusCode, context) {
        super(message, statusCode, context);
    }
}
exports.SystemError = SystemError;
/**
 * Internal server error (500).
 */
class InternalError extends SystemError {
    constructor(message, context) {
        super(message, 500, context);
    }
}
exports.InternalError = InternalError;
/**
 * External service error (502).
 */
class ExternalServiceError extends SystemError {
    constructor(message, context) {
        super(message, 502, context);
    }
}
exports.ExternalServiceError = ExternalServiceError;
