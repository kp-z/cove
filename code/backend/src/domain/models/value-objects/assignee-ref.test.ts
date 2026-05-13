import { describe, it, expect } from 'vitest';
import { AssigneeRef } from './assignee-ref';

describe('AssigneeRef Value Object', () => {
  describe('creation', () => {
    it('should create an assignee ref with timestamp', () => {
      const assignedAt = new Date('2026-05-09T00:00:00Z');
      const assignee = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt,
      });

      expect(assignee.id).toBe('agent-001');
      expect(assignee.type).toBe('agent');
      expect(assignee.assignedAt).toEqual(assignedAt);
      expect(assignee.isAgent()).toBe(true);
    });

    it('should create a human assignee ref', () => {
      const assignedAt = new Date();
      const assignee = AssigneeRef.create({
        id: 'user-001',
        type: 'human',
        assignedAt,
      });

      expect(assignee.id).toBe('user-001');
      expect(assignee.type).toBe('human');
      expect(assignee.isHuman()).toBe(true);
    });

    it('should throw error for empty id', () => {
      expect(() => {
        AssigneeRef.create({
          id: '',
          type: 'agent',
          assignedAt: new Date(),
        });
      }).toThrow('Assignee ID cannot be empty');
    });

    it('should throw error for invalid date', () => {
      expect(() => {
        AssigneeRef.create({
          id: 'agent-001',
          type: 'agent',
          assignedAt: new Date('invalid'),
        });
      }).toThrow('Assigned at must be a valid date');
    });
  });

  describe('equality', () => {
    it('should be equal when all properties match', () => {
      const assignedAt = new Date('2026-05-09T00:00:00Z');
      const assignee1 = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt,
      });
      const assignee2 = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt,
      });

      expect(assignee1.equals(assignee2)).toBe(true);
    });

    it('should not be equal when id differs', () => {
      const assignedAt = new Date();
      const assignee1 = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt,
      });
      const assignee2 = AssigneeRef.create({
        id: 'agent-002',
        type: 'agent',
        assignedAt,
      });

      expect(assignee1.equals(assignee2)).toBe(false);
    });

    it('should not be equal when assignedAt differs', () => {
      const assignee1 = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt: new Date('2026-05-09T00:00:00Z'),
      });
      const assignee2 = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt: new Date('2026-05-09T01:00:00Z'),
      });

      expect(assignee1.equals(assignee2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to plain object', () => {
      const assignedAt = new Date('2026-05-09T00:00:00Z');
      const assignee = AssigneeRef.create({
        id: 'agent-001',
        type: 'agent',
        assignedAt,
      });
      const plain = assignee.toJSON();

      expect(plain).toEqual({
        id: 'agent-001',
        type: 'agent',
        assigned_at: '2026-05-09T00:00:00.000Z',
      });
    });

    it('should deserialize from plain object', () => {
      const plain = {
        id: 'agent-001',
        type: 'agent' as const,
        assigned_at: '2026-05-09T00:00:00.000Z',
      };
      const assignee = AssigneeRef.fromJSON(plain);

      expect(assignee.id).toBe('agent-001');
      expect(assignee.type).toBe('agent');
      expect(assignee.assignedAt).toEqual(new Date('2026-05-09T00:00:00.000Z'));
    });
  });
});
