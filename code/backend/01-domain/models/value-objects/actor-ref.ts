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

export type ActorType = 'human' | 'agent';

export interface ActorRefProps {
  readonly id: string;
  readonly type: ActorType;
}

export class ActorRef {
  private constructor(private readonly props: ActorRefProps) {
    this.validate();
  }

  /**
   * 创建 ActorRef
   */
  static create(props: ActorRefProps): ActorRef {
    return new ActorRef(props);
  }

  /**
   * 从 JSON 反序列化
   */
  static fromJSON(json: ActorRefProps): ActorRef {
    return ActorRef.create(json);
  }

  /**
   * 验证业务规则
   */
  private validate(): void {
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
  get id(): string {
    return this.props.id;
  }

  get type(): ActorType {
    return this.props.type;
  }

  /**
   * 类型检查方法
   */
  isHuman(): boolean {
    return this.props.type === 'human';
  }

  isAgent(): boolean {
    return this.props.type === 'agent';
  }

  /**
   * Value Object 相等性比较
   */
  equals(other: ActorRef): boolean {
    return (
      this.props.id === other.props.id &&
      this.props.type === other.props.type
    );
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): ActorRefProps {
    return {
      id: this.props.id,
      type: this.props.type,
    };
  }

  /**
   * 字符串表示
   */
  toString(): string {
    return `${this.props.type}:${this.props.id}`;
  }
}
