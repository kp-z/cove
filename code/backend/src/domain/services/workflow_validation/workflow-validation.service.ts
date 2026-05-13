/**
 * WorkflowValidationService - 工作流验证领域服务
 *
 * 负责验证工作流定义的正确性。
 */

export interface WorkflowStep {
  readonly id: string;
  readonly taskId: string;
  readonly condition?: string;
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
  readonly steps: readonly (readonly WorkflowStep[])[];
}

export interface ValidationError {
  readonly type: 'duplicate_step_id' | 'empty_stage' | 'invalid_condition' | 'missing_task';
  readonly message: string;
  readonly stepId?: string;
  readonly stageIndex?: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

export class WorkflowValidationService {
  validate(workflow: Workflow, availableTaskIds: Set<string>): ValidationResult {
    const errors: ValidationError[] = [];
    const stepIds = new Set<string>();

    for (let stageIndex = 0; stageIndex < workflow.steps.length; stageIndex++) {
      const stage = workflow.steps[stageIndex];

      if (!stage) {
        continue;
      }

      if (stage.length === 0) {
        errors.push({
          type: 'empty_stage',
          message: `Stage ${stageIndex} is empty`,
          stageIndex,
        });
        continue;
      }

      for (const step of stage) {
        if (stepIds.has(step.id)) {
          errors.push({
            type: 'duplicate_step_id',
            message: `Duplicate step ID: ${step.id}`,
            stepId: step.id,
            stageIndex,
          });
        }
        stepIds.add(step.id);

        if (!availableTaskIds.has(step.taskId)) {
          errors.push({
            type: 'missing_task',
            message: `Task ${step.taskId} not found`,
            stepId: step.id,
            stageIndex,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getTotalSteps(workflow: Workflow): number {
    return workflow.steps.reduce((sum, stage) => sum + stage.length, 0);
  }
}
