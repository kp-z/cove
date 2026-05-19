/**
 * OKREntity - 目标与关键结果实体（聚合根）
 *
 * OKR 管理目标和关键结果，KeyResult 是内部实体。
 *
 * 业务不变量：
 * - current_value 不能超过 target_value（percent/count 类型）
 * - boolean 类型的 current_value 只能是 0 或 1
 * - 每个 KR 必须有唯一的 kr_id
 * - end_date 必须晚于 start_date
 */

import { OwnerRef, type OwnerRefProps } from '../value-objects';

export type KRUnit = 'percent' | 'count' | 'boolean';
export type KRStatus = 'not_started' | 'in_progress' | 'at_risk' | 'completed';

export interface KeyResultProps {
  readonly krId: string;
  readonly title: string;
  readonly description?: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly unit: KRUnit;
  readonly status: KRStatus;
  readonly owner: OwnerRef;
  readonly workflowIds?: readonly string[];
  readonly taskIds?: readonly string[];
}

export interface KeyResultJSON {
  readonly kr_id: string;
  readonly title: string;
  readonly description?: string;
  readonly target_value: number;
  readonly current_value: number;
  readonly unit: KRUnit;
  readonly status: KRStatus;
  readonly owner: OwnerRefProps;
  readonly workflow_ids: readonly string[];
  readonly task_ids: readonly string[];
}

export interface OKREntityProps {
  readonly okrId: string;
  readonly projectId: string;
  readonly quarter: string;
  readonly objectiveTitle: string;
  readonly objectiveDescription?: string;
  readonly owner: OwnerRef;
  readonly keyResults: readonly KeyResultProps[];
  readonly startDate: Date;
  readonly endDate: Date;
  readonly createdAt: Date;
}

export interface OKREntityJSON {
  readonly okr_id: string;
  readonly project_id: string;
  readonly quarter: string;
  readonly objective: {
    readonly title: string;
    readonly description?: string;
    readonly owner: OwnerRefProps;
  };
  readonly key_results: readonly KeyResultJSON[];
  readonly start_date: string;
  readonly end_date: string;
  readonly created_at: string;
}

export class OKREntity {
  private constructor(private readonly props: OKREntityProps) {
    this.validate();
  }

  static create(props: OKREntityProps): OKREntity {
    return new OKREntity(props);
  }

  private validate(): void {
    if (!this.props.okrId || this.props.okrId.trim() === '') {
      throw new Error('OKR ID cannot be empty');
    }
    if (!this.props.projectId || this.props.projectId.trim() === '') {
      throw new Error('Project ID cannot be empty');
    }
    if (this.props.endDate <= this.props.startDate) {
      throw new Error('End date must be after start date');
    }

    // Check duplicate KR IDs
    const krIds = this.props.keyResults.map(kr => kr.krId);
    const uniqueIds = new Set(krIds);
    if (uniqueIds.size !== krIds.length) {
      throw new Error('Duplicate KR ID found');
    }
  }

  // --- Getters ---

  get okrId(): string { return this.props.okrId; }
  get projectId(): string { return this.props.projectId; }
  get quarter(): string { return this.props.quarter; }
  get objectiveTitle(): string { return this.props.objectiveTitle; }
  get objectiveDescription(): string | undefined { return this.props.objectiveDescription; }
  get owner(): OwnerRef { return this.props.owner; }
  get keyResults(): readonly KeyResultProps[] { return this.props.keyResults; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get createdAt(): Date { return this.props.createdAt; }

  // --- KR progress update ---

  updateKrProgress(krId: string, newValue: number): OKREntity {
    const krIndex = this.props.keyResults.findIndex(kr => kr.krId === krId);
    if (krIndex === -1) {
      throw new Error(`KR not found: ${krId}`);
    }

    const kr = this.props.keyResults[krIndex]!;

    // Validate value
    if (kr.unit === 'boolean' && newValue !== 0 && newValue !== 1) {
      throw new Error('Boolean KR value must be 0 or 1');
    }

    if (newValue > kr.targetValue) {
      throw new Error(`Value (${newValue}) cannot exceed target (${kr.targetValue})`);
    }

    // Determine new status
    const progress = kr.targetValue > 0 ? newValue / kr.targetValue : 0;
    let newStatus: KRStatus;
    if (progress >= 1.0) {
      newStatus = 'completed';
    } else if (progress >= 0.7) {
      newStatus = 'in_progress';
    } else if (progress > 0) {
      newStatus = 'at_risk';
    } else {
      newStatus = 'not_started';
    }

    const updatedKRs = this.props.keyResults.map((existing, index) =>
      index === krIndex
        ? { ...existing, currentValue: newValue, status: newStatus }
        : existing
    );

    return OKREntity.create({
      ...this.props,
      keyResults: updatedKRs,
    });
  }

  // --- Progress calculation ---

  calculateOverallProgress(): number {
    if (this.props.keyResults.length === 0) {
      return 0;
    }

    const totalProgress = this.props.keyResults.reduce((sum, kr) => {
      const progress = kr.targetValue > 0 ? kr.currentValue / kr.targetValue : 0;
      return sum + progress;
    }, 0);

    return totalProgress / this.props.keyResults.length;
  }

  // --- Equality (by ID) ---

  equals(other: OKREntity): boolean {
    return this.props.okrId === other.props.okrId;
  }

  // --- Serialization ---

  toJSON(): OKREntityJSON {
    return {
      okr_id: this.props.okrId,
      project_id: this.props.projectId,
      quarter: this.props.quarter,
      objective: {
        title: this.props.objectiveTitle,
        description: this.props.objectiveDescription,
        owner: this.props.owner.toJSON(),
      },
      key_results: this.props.keyResults.map(kr => ({
        kr_id: kr.krId,
        title: kr.title,
        description: kr.description,
        target_value: kr.targetValue,
        current_value: kr.currentValue,
        unit: kr.unit,
        status: kr.status,
        owner: kr.owner.toJSON(),
        workflow_ids: kr.workflowIds ?? [],
        task_ids: kr.taskIds ?? [],
      })),
      start_date: this.props.startDate.toISOString(),
      end_date: this.props.endDate.toISOString(),
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
