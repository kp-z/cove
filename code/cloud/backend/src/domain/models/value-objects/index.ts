/**
 * Shared Value Objects
 *
 * 这些 Value Objects 在多个实体中复用
 */

export { ActorRef, type ActorType, type ActorRefProps } from './actor-ref';
export { OwnerRef, type OwnerType, type OwnerRefProps } from './owner-ref';
export {
  AssigneeRef,
  type AssigneeType,
  type AssigneeRefProps,
  type AssigneeRefJSON,
} from './assignee-ref';
