"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OKREntity = void 0;
class OKREntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new OKREntity(props);
    }
    validate() {
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
    get okrId() { return this.props.okrId; }
    get projectId() { return this.props.projectId; }
    get quarter() { return this.props.quarter; }
    get objectiveTitle() { return this.props.objectiveTitle; }
    get objectiveDescription() { return this.props.objectiveDescription; }
    get owner() { return this.props.owner; }
    get keyResults() { return this.props.keyResults; }
    get startDate() { return this.props.startDate; }
    get endDate() { return this.props.endDate; }
    get createdAt() { return this.props.createdAt; }
    // --- KR progress update ---
    updateKrProgress(krId, newValue) {
        const krIndex = this.props.keyResults.findIndex(kr => kr.krId === krId);
        if (krIndex === -1) {
            throw new Error(`KR not found: ${krId}`);
        }
        const kr = this.props.keyResults[krIndex];
        // Validate value
        if (kr.unit === 'boolean' && newValue !== 0 && newValue !== 1) {
            throw new Error('Boolean KR value must be 0 or 1');
        }
        if (newValue > kr.targetValue) {
            throw new Error(`Value (${newValue}) cannot exceed target (${kr.targetValue})`);
        }
        // Determine new status
        const progress = kr.targetValue > 0 ? newValue / kr.targetValue : 0;
        let newStatus;
        if (progress >= 1.0) {
            newStatus = 'completed';
        }
        else if (progress >= 0.7) {
            newStatus = 'in_progress';
        }
        else if (progress > 0) {
            newStatus = 'at_risk';
        }
        else {
            newStatus = 'not_started';
        }
        const updatedKRs = this.props.keyResults.map((existing, index) => index === krIndex
            ? { ...existing, currentValue: newValue, status: newStatus }
            : existing);
        return OKREntity.create({
            ...this.props,
            keyResults: updatedKRs,
        });
    }
    // --- Progress calculation ---
    calculateOverallProgress() {
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
    equals(other) {
        return this.props.okrId === other.props.okrId;
    }
    // --- Serialization ---
    toJSON() {
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
exports.OKREntity = OKREntity;
