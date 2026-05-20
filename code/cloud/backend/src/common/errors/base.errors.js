"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
/**
 * Base error class for all application errors.
 * Provides structured error handling with status codes and context.
 */
class AppError extends Error {
    statusCode;
    context;
    constructor(message, statusCode, context) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
