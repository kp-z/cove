"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectNotArchivedError = exports.ProjectNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class ProjectNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.PROJECT_NOT_FOUND;
    constructor(projectId) {
        super(`Project not found: ${projectId}`, { projectId });
    }
}
exports.ProjectNotFoundError = ProjectNotFoundError;
class ProjectNotArchivedError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.PROJECT_NOT_ARCHIVED;
    constructor(projectId) {
        super(`Project must be archived before deletion: ${projectId}`, { projectId });
    }
}
exports.ProjectNotArchivedError = ProjectNotArchivedError;
