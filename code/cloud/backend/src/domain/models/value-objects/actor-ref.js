"use strict";
/**
 * ActorRef Value Object
 *
 * 表示操作者引用，用于 created_by、updated_by 等字段
 *
 * 业务规则：
 * - ID 不能为空
 * - type 只能是 "human" 或 "agent"
 * - Value Object 是不可变的
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorRef = void 0;
class ActorRef {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    /**
     * 创建 ActorRef
     */
    static create(props) {
        return new ActorRef(props);
    }
    /**
     * 从 JSON 反序列化
     */
    static fromJSON(json) {
        return ActorRef.create(json);
    }
    /**
     * 验证业务规则
     */
    validate() {
        if (!this.props.id || this.props.id.trim() === '') {
            throw new Error('Actor ID cannot be empty');
        }
        if (this.props.type !== 'human' && this.props.type !== 'agent') {
            throw new Error('Actor type must be either "human" or "agent"');
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
            this.props.type === other.props.type);
    }
    /**
     * 序列化为 JSON
     */
    toJSON() {
        return {
            id: this.props.id,
            type: this.props.type,
        };
    }
    /**
     * 字符串表示
     */
    toString() {
        return `${this.props.type}:${this.props.id}`;
    }
}
exports.ActorRef = ActorRef;
