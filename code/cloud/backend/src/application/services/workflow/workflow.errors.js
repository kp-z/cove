"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStepsInvalidError = exports.WorkflowNotArchivedError = exports.WorkflowNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class WorkflowNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.WORKFLOW_NOT_FOUND;
    constructor(workflowId) {
        super(`Workflow not found: ${workflowId}`, { workflowId });
    }
}
exports.WorkflowNotFoundError = WorkflowNotFoundError;
class WorkflowNotArchivedError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.WORKFLOW_NOT_DELETABLE;
    constructor(workflowId) {
        super(`Workflow must be archived before deletion: ${workflowId}`, { workflowId });
    }
}
exports.WorkflowNotArchivedError = WorkflowNotArchivedError;
class WorkflowStepsInvalidError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.WORKFLOW_STEPS_INVALID;
    constructor(workflowId, reason) {
        super(`Workflow steps are invalid: ${reason}`, { workflowId, reason });
    }
}
exports.WorkflowStepsInvalidError = WorkflowStepsInvalidError;
