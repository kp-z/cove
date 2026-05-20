"use strict";
/**
 * AssigneeRef Value Object
 *
 * 表示分配对象引用，用于 Task 的 assignee 字段
 *
 * 业务规则：
 * - ID 不能为空
 * - type 只能是 "human" 或 "agent"
 * - assignedAt 必须是有效的日期
 * - Value Object 是不可变的
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssigneeRef = void 0;
class AssigneeRef {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    /**
     * 创建 AssigneeRef
     */
    static create(props) {
        return new AssigneeRef(props);
    }
    /**
     * 从 JSON 反序列化
     */
    static fromJSON(json) {
        return AssigneeRef.create({
            id: json.id,
            type: json.type,
            assignedAt: new Date(json.assigned_at),
        });
    }
    /**
     * 验证业务规则
     */
    validate() {
        if (!this.props.id || this.props.id.trim() === '') {
            throw new Error('Assignee ID cannot be empty');
        }
        if (this.props.type !== 'human' && this.props.type !== 'agent') {
            throw new Error('Assignee type must be either "human" or "agent"');
        }
        if (!(this.props.assignedAt instanceof Date) || isNaN(this.props.assignedAt.getTime())) {
            throw new Error('Assigned at must be a valid date');
        }
    }
    /**
     * Getters
     */
    get id() {
        return this.props.id;
    }
    get type() {
        return this.props.type;
    }
    get assignedAt() {
        return this.props.assignedAt;
    }
    /**
     * 类型检查方法
     */
    isHuman() {
        return this.props.type === 'human';
    }
    isAgent() {
        return this.props.type === 'agent';
    }
    /**
     * Value Object 相等性比较
     */
    equals(other) {
        return (this.props.id === other.props.id &&
            this.props.type === other.props.type &&
            this.props.assignedAt.getTime() === other.props.assignedAt.getTime());
    }
    /**
     * 序列化为 JSON
     */
    toJSON() {
        return {
            id: this.props.id,
            type: this.props.type,
            assigned_at: this.props.assignedAt.toISOString(),
        };
    }
    /**
     * 字符串表示
     */
    toString() {
        return `${this.props.type}:${this.props.id} (assigned at ${this.props.assignedAt.toISOString()})`;
    }
}
exports.AssigneeRef = AssigneeRef;
