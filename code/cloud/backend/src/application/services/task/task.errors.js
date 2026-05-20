"use strict";
/**
 * Task Service Errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskNotDeletableError = exports.TaskNotAssignableError = exports.TaskNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class TaskNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.TASK_NOT_FOUND;
    constructor(taskId) {
        super(`Task not found: ${taskId}`, { taskId });
    }
}
exports.TaskNotFoundError = TaskNotFoundError;
class TaskNotAssignableError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.TASK_NOT_ASSIGNABLE;
    constructor(taskId, status) {
        super(`Task cannot be assigned: ${taskId} (status: ${status})`, { taskId, status });
    }
}
exports.TaskNotAssignableError = TaskNotAssignableError;
class TaskNotDeletableError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.TASK_NOT_DELETABLE;
    constructor(taskId, status) {
        super(`Task cannot be deleted: ${taskId} (status: ${status}). Only cancelled or done tasks can be deleted.`, { taskId, status });
    }
}
exports.TaskNotDeletableError = TaskNotDeletableError;
