/**
 * Task Service Errors
 */

import { TaskStatus } from '../../../domain/models/task/task.entity';
import { NotFoundError, StateError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class TaskNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.TASK_NOT_FOUND;

  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, { taskId });
  }
}

export class TaskNotAssignableError extends StateError {
  readonly code = ERROR_CODES.TASK_NOT_ASSIGNABLE;

  constructor(taskId: string, status: TaskStatus) {
    super(`Task cannot be assigned: ${taskId} (status: ${status})`, { taskId, status });
  }
}

export class TaskNotDeletableError extends StateError {
  readonly code = ERROR_CODES.TASK_NOT_DELETABLE;

  constructor(taskId: string, status: TaskStatus) {
    super(`Task cannot be deleted: ${taskId} (status: ${status}). Only cancelled or done tasks can be deleted.`, { taskId, status });
  }
}

