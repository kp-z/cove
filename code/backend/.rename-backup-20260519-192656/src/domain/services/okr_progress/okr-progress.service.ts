/**
 * OKRProgressCalculator - OKR 进度计算领域服务
 *
 * 负责根据任务完成情况计算 OKR 和 Key Result 的进度。
 */

export interface KeyResult {
  readonly id: string;
  readonly title: string;
  readonly target: number;
}

export interface OKR {
  readonly id: string;
  readonly title: string;
  readonly keyResults: readonly KeyResult[];
}

export interface Task {
  readonly id: string;
  readonly keyResultId: string;
  readonly status: 'todo' | 'in_progress' | 'in_review' | 'done';
}

export interface KeyResultProgress {
  readonly completed: number;
  readonly target: number;
  readonly percentage: number;
}

export interface OKRProgress {
  readonly overall: number;
  readonly keyResults: Record<string, KeyResultProgress>;
}

export class OKRProgressCalculator {
  /**
   * 计算 OKR 的整体进度
   *
   * 计算逻辑：
   * 1. 统计每个 Key Result 下已完成的任务数
   * 2. 计算每个 Key Result 的完成百分比
   * 3. 计算 OKR 的整体进度（所有 Key Result 的平均值）
   */
  calculate(okr: OKR, tasks: readonly Task[]): OKRProgress {
    const keyResultsProgress: Record<string, KeyResultProgress> = {};

    // 计算每个 Key Result 的进度
    for (const kr of okr.keyResults) {
      const krTasks = tasks.filter(task => task.keyResultId === kr.id);
      const completedTasks = krTasks.filter(task => task.status === 'done');

      const completed = completedTasks.length;
      const target = kr.target;
      const percentage = target > 0 ? Math.round((completed / target) * 100) : 0;

      keyResultsProgress[kr.id] = {
        completed,
        target,
        percentage,
      };
    }

    // 计算整体进度（所有 Key Result 的平均值）
    const overall = this.calculateOverallProgress(keyResultsProgress);

    return {
      overall,
      keyResults: keyResultsProgress,
    };
  }

  /**
   * 计算整体进度
   */
  private calculateOverallProgress(
    keyResultsProgress: Record<string, KeyResultProgress>
  ): number {
    const keyResults = Object.values(keyResultsProgress);

    if (keyResults.length === 0) {
      return 0;
    }

    const totalPercentage = keyResults.reduce(
      (sum, kr) => sum + kr.percentage,
      0
    );

    return Math.round(totalPercentage / keyResults.length);
  }

  /**
   * 检查 OKR 是否已完成
   */
  isCompleted(progress: OKRProgress): boolean {
    return progress.overall >= 100;
  }

  /**
   * 检查 Key Result 是否已完成
   */
  isKeyResultCompleted(progress: KeyResultProgress): boolean {
    return progress.percentage >= 100;
  }

  /**
   * 获取未完成的 Key Results
   */
  getIncompleteKeyResults(progress: OKRProgress): string[] {
    return Object.entries(progress.keyResults)
      .filter(([_, krProgress]) => !this.isKeyResultCompleted(krProgress))
      .map(([krId, _]) => krId);
  }

  /**
   * 批量计算多个 OKR 的进度
   */
  calculateBatch(
    okrs: readonly OKR[],
    tasks: readonly Task[]
  ): Map<string, OKRProgress> {
    const progressMap = new Map<string, OKRProgress>();

    for (const okr of okrs) {
      const okrTasks = tasks.filter(task =>
        okr.keyResults.some(kr => kr.id === task.keyResultId)
      );
      const progress = this.calculate(okr, okrTasks);
      progressMap.set(okr.id, progress);
    }

    return progressMap;
  }
}
