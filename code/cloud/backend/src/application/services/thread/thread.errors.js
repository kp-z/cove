"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedThreadError = exports.RootMessageNotFoundError = exports.ThreadNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class ThreadNotFoundError extends errors_1.NotFoundError {
    code = 'THREAD_NOT_FOUND';
    constructor(threadId) {
        super(`Thread not found: ${threadId}`, { threadId });
    }
}
exports.ThreadNotFoundError = ThreadNotFoundError;
class RootMessageNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.ROOT_MESSAGE_NOT_FOUND;
    constructor(messageId) {
        super(`Root message not found: ${messageId}`, { messageId });
    }
}
exports.RootMessageNotFoundError = RootMessageNotFoundError;
class NestedThreadError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.NESTED_THREAD_NOT_ALLOWED;
    constructor(messageId) {
        super(`Cannot create a thread on a thread reply: ${messageId}`, { messageId });
    }
}
exports.NestedThreadError = NestedThreadError;
