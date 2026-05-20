import { Config } from './config';

interface TaskPayload {
  taskId: string;
  realmId: string;
  agentId: string;
  input: any;
}

interface TaskResult {
  output: any;
  executionTime: number;
}

export class TaskExecutor {
  private runningTasks = new Map<string, AbortController>();

  constructor(private config: Config) {}

  async execute(task: TaskPayload): Promise<TaskResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    this.runningTasks.set(task.taskId, abortController);

    try {
      // TODO: Implement actual task execution with LLM adapters
      // For now, return a mock result
      const output = {
        message: `Task ${task.taskId} executed successfully`,
        agentId: task.agentId,
        realmId: task.realmId,
        input: task.input,
      };

      // Simulate task execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const executionTime = Date.now() - startTime;

      return {
        output,
        executionTime,
      };
    } finally {
      this.runningTasks.delete(task.taskId);
    }
  }

  cancelTask(taskId: string): void {
    const abortController = this.runningTasks.get(taskId);
    if (abortController) {
      abortController.abort();
      this.runningTasks.delete(taskId);
    }
  }

  getActiveTaskCount(): number {
    return this.runningTasks.size;
  }
}
