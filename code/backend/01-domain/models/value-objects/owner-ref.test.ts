import { describe, it, expect } from 'vitest';
import { OwnerRef } from './owner-ref';

describe('OwnerRef Value Object', () => {
  describe('creation', () => {
    it('should create a human owner ref', () => {
      const owner = OwnerRef.create({
        id: 'user-001',
        type: 'human',
      });

      expect(owner.id).toBe('user-001');
      expect(owner.type).toBe('human');
      expect(owner.isHuman()).toBe(true);
      expect(owner.isAgent()).toBe(false);
    });

    it('should create an agent owner ref', () => {
      const owner = OwnerRef.create({
        id: 'agent-001',
        type: 'agent',
      });

      expect(owner.id).toBe('agent-001');
      expect(owner.type).toBe('agent');
      expect(owner.isHuman()).toBe(false);
      expect(owner.isAgent()).toBe(true);
    });

    it('should throw error for empty id', () => {
      expect(() => {
        OwnerRef.create({
          id: '',
          type: 'human',
        });
      }).toThrow('Owner ID cannot be empty');
    });
  });

  describe('equality', () => {
    it('should be equal when id and type match', () => {
      const owner1 = OwnerRef.create({ id: 'user-001', type: 'human' });
      const owner2 = OwnerRef.create({ id: 'user-001', type: 'human' });

      expect(owner1.equals(owner2)).toBe(true);
    });

    it('should not be equal when id differs', () => {
      const owner1 = OwnerRef.create({ id: 'user-001', type: 'human' });
      const owner2 = OwnerRef.create({ id: 'user-002', type: 'human' });

      expect(owner1.equals(owner2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to plain object', () => {
      const owner = OwnerRef.create({ id: 'user-001', type: 'human' });
      const plain = owner.toJSON();

      expect(plain).toEqual({
        id: 'user-001',
        type: 'human',
      });
    });

    it('should deserialize from plain object', () => {
      const plain = { id: 'user-001', type: 'human' as const };
      const owner = OwnerRef.fromJSON(plain);

      expect(owner.id).toBe('user-001');
      expect(owner.type).toBe('human');
    });
  });
});
