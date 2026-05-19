import { describe, it, expect } from 'vitest';
import { OKREntity } from './okr.entity';
import { OwnerRef } from '../value-objects';

describe('OKREntity', () => {
  const owner = OwnerRef.create({ id: 'user-001', type: 'human' });

  const validProps = {
    okrId: 'okr-001',
    projectId: 'proj-001',
    quarter: '2026-Q2',
    objectiveTitle: '完成 v1.0 版本发布',
    objectiveDescription: '完成 Cove 平台 v1.0 版本的开发和发布',
    owner,
    keyResults: [
      {
        krId: 'kr-001',
        title: '完成核心功能开发',
        targetValue: 100,
        currentValue: 65,
        unit: 'percent' as const,
        status: 'in_progress' as const,
        owner: OwnerRef.create({ id: 'agent-001', type: 'agent' }),
      },
      {
        krId: 'kr-002',
        title: '测试覆盖率达到 80%',
        targetValue: 80,
        currentValue: 45,
        unit: 'percent' as const,
        status: 'in_progress' as const,
        owner: OwnerRef.create({ id: 'agent-002', type: 'agent' }),
      },
    ],
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-06-30'),
    createdAt: new Date('2026-04-01T00:00:00Z'),
  };

  describe('creation', () => {
    it('should create an OKR with valid properties', () => {
      const okr = OKREntity.create(validProps);

      expect(okr.okrId).toBe('okr-001');
      expect(okr.objectiveTitle).toBe('完成 v1.0 版本发布');
      expect(okr.keyResults).toHaveLength(2);
    });

    it('should throw error for empty okrId', () => {
      expect(() => {
        OKREntity.create({ ...validProps, okrId: '' });
      }).toThrow('OKR ID cannot be empty');
    });

    it('should throw error when endDate is before startDate', () => {
      expect(() => {
        OKREntity.create({
          ...validProps,
          startDate: new Date('2026-06-30'),
          endDate: new Date('2026-04-01'),
        });
      }).toThrow('End date must be after start date');
    });

    it('should throw error for duplicate kr_id', () => {
      expect(() => {
        OKREntity.create({
          ...validProps,
          keyResults: [
            { ...validProps.keyResults[0]! },
            { ...validProps.keyResults[0]! }, // duplicate kr_id
          ],
        });
      }).toThrow('Duplicate KR ID');
    });
  });

  describe('KR progress update', () => {
    it('should update KR current value', () => {
      const okr = OKREntity.create(validProps);
      const updated = okr.updateKrProgress('kr-001', 80);

      const kr = updated.keyResults.find(kr => kr.krId === 'kr-001');
      expect(kr?.currentValue).toBe(80);

      // original unchanged
      const originalKr = okr.keyResults.find(kr => kr.krId === 'kr-001');
      expect(originalKr?.currentValue).toBe(65);
    });

    it('should throw error when value exceeds target (percent)', () => {
      const okr = OKREntity.create(validProps);
      expect(() => okr.updateKrProgress('kr-001', 101)).toThrow('cannot exceed target');
    });

    it('should throw error for non-existent KR', () => {
      const okr = OKREntity.create(validProps);
      expect(() => okr.updateKrProgress('kr-999', 50)).toThrow('KR not found');
    });

    it('should auto-complete KR when value reaches target', () => {
      const okr = OKREntity.create(validProps);
      const updated = okr.updateKrProgress('kr-001', 100);

      const kr = updated.keyResults.find(kr => kr.krId === 'kr-001');
      expect(kr?.status).toBe('completed');
    });

    it('should handle boolean unit (0 or 1 only)', () => {
      const okr = OKREntity.create({
        ...validProps,
        keyResults: [
          {
            krId: 'kr-bool',
            title: '完成文档',
            targetValue: 1,
            currentValue: 0,
            unit: 'boolean' as const,
            status: 'not_started' as const,
            owner,
          },
        ],
      });

      expect(() => okr.updateKrProgress('kr-bool', 0.5)).toThrow('Boolean KR value must be 0 or 1');

      const updated = okr.updateKrProgress('kr-bool', 1);
      const kr = updated.keyResults.find(kr => kr.krId === 'kr-bool');
      expect(kr?.currentValue).toBe(1);
      expect(kr?.status).toBe('completed');
    });
  });

  describe('overall progress', () => {
    it('should calculate overall progress as simple average', () => {
      const okr = OKREntity.create(validProps);
      // kr-001: 65/100 = 0.65, kr-002: 45/80 = 0.5625
      // average = (0.65 + 0.5625) / 2 = 0.60625
      const progress = okr.calculateOverallProgress();
      expect(progress).toBeCloseTo(0.606, 2);
    });

    it('should return 0 for OKR with no key results', () => {
      const okr = OKREntity.create({
        ...validProps,
        keyResults: [],
      });
      expect(okr.calculateOverallProgress()).toBe(0);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const okr = OKREntity.create(validProps);
      const json = okr.toJSON();

      expect(json.okr_id).toBe('okr-001');
      expect(json.objective.title).toBe('完成 v1.0 版本发布');
      expect(json.key_results).toHaveLength(2);
      expect(json.key_results[0]?.kr_id).toBe('kr-001');
    });
  });

  describe('equality', () => {
    it('should be equal when okrId matches', () => {
      const o1 = OKREntity.create(validProps);
      const o2 = OKREntity.create({ ...validProps, objectiveTitle: 'Different' });

      expect(o1.equals(o2)).toBe(true);
    });
  });
});
