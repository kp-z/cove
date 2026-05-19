/**
 * OwnerRef Value Object
 *
 * 表示负责人引用，用于 owner 字段
 *
 * 业务规则：
 * - ID 不能为空
 * - type 只能是 "human" 或 "agent"
 * - Value Object 是不可变的
 */

export type OwnerType = 'human' | 'agent';

export interface OwnerRefProps {
  readonly id: string;
  readonly type: OwnerType;
}

export class OwnerRef {
  private constructor(private readonly props: OwnerRefProps) {
    this.validate();
  }

  /**
   * 创建 OwnerRef
   */
  static create(props: OwnerRefProps): OwnerRef {
    return new OwnerRef(props);
  }

  /**
   * 从 JSON 反序列化
   */
  static fromJSON(json: OwnerRefProps): OwnerRef {
    return OwnerRef.create(json);
  }

  /**
   * 验证业务规则
   */
  private validate(): void {
    if (!this.props.id || this.props.id.trim() === '') {
      throw new Error('Owner ID cannot be empty');
    }

    if (this.props.type !== 'human' && this.props.type !== 'agent') {
      throw new Error('Owner type must be either "human" or "agent"');
    }
  }

  /**
   * Getters
   */
  get id(): string {
    return this.props.id;
  }

  get type(): OwnerType {
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
  equals(other: OwnerRef): boolean {
    return (
      this.props.id === other.props.id &&
      this.props.type === other.props.type
    );
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): OwnerRefProps {
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
