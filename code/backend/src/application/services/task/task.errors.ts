/**
 * Task Service Errors
 */

import { TaskStatus } from '../../../domain/models/task/task.entity';

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskNotAssignableError extends Error {
  constructor(taskId: string, status: TaskStatus) {
    super(`Task cannot be assigned: ${taskId} (status: ${status})`);
    this.name = 'TaskNotAssignableError';
  }
}

export class TaskNotDeletableError extends Error {
  constructor(taskId: string, status: TaskStatus) {
    super(`Task cannot be deleted: ${taskId} (status: ${status}). Only cancelled or done tasks can be deleted.`);
    this.name = 'TaskNotDeletableError';
  }
}
