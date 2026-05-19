import { describe, it, expect } from 'vitest';
import { ActorRef } from './actor-ref';

describe('ActorRef Value Object', () => {
  describe('creation', () => {
    it('should create a human actor ref', () => {
      const actor = ActorRef.create({
        id: 'user-001',
        type: 'human',
      });

      expect(actor.id).toBe('user-001');
      expect(actor.type).toBe('human');
      expect(actor.isHuman()).toBe(true);
      expect(actor.isAgent()).toBe(false);
    });

    it('should create an agent actor ref', () => {
      const actor = ActorRef.create({
        id: 'agent-001',
        type: 'agent',
      });

      expect(actor.id).toBe('agent-001');
      expect(actor.type).toBe('agent');
      expect(actor.isHuman()).toBe(false);
      expect(actor.isAgent()).toBe(true);
    });

    it('should throw error for empty id', () => {
      expect(() => {
        ActorRef.create({
          id: '',
          type: 'human',
        });
      }).toThrow('Actor ID cannot be empty');
    });

    it('should throw error for invalid type', () => {
      expect(() => {
        ActorRef.create({
          id: 'user-001',
          type: 'invalid' as any,
        });
      }).toThrow('Actor type must be either "human" or "agent"');
    });
  });

  describe('equality', () => {
    it('should be equal when id and type match', () => {
      const actor1 = ActorRef.create({ id: 'user-001', type: 'human' });
      const actor2 = ActorRef.create({ id: 'user-001', type: 'human' });

      expect(actor1.equals(actor2)).toBe(true);
    });

    it('should not be equal when id differs', () => {
      const actor1 = ActorRef.create({ id: 'user-001', type: 'human' });
      const actor2 = ActorRef.create({ id: 'user-002', type: 'human' });

      expect(actor1.equals(actor2)).toBe(false);
    });

    it('should not be equal when type differs', () => {
      const actor1 = ActorRef.create({ id: 'user-001', type: 'human' });
      const actor2 = ActorRef.create({ id: 'user-001', type: 'agent' });

      expect(actor1.equals(actor2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to plain object', () => {
      const actor = ActorRef.create({ id: 'user-001', type: 'human' });
      const plain = actor.toJSON();

      expect(plain).toEqual({
        id: 'user-001',
        type: 'human',
      });
    });

    it('should deserialize from plain object', () => {
      const plain = { id: 'user-001', type: 'human' as const };
      const actor = ActorRef.fromJSON(plain);

      expect(actor.id).toBe('user-001');
      expect(actor.type).toBe('human');
    });
  });
});
