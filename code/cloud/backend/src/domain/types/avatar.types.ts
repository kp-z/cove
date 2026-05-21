/**
 * Avatar Types
 *
 * Unified avatar interface used across all entities (User, Agent, Channel, Realm)
 */

export type AvatarType = 'uploaded' | 'dicebear' | 'default';

export interface Avatar {
  readonly url: string;
  readonly type: AvatarType;
}
