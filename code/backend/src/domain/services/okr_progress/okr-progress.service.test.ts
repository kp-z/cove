import { describe, it, expect } from 'vitest';
import {
  OKRProgressCalculator,
  OKR,
  Task,
  KeyResult,
  OKRProgress,
  KeyResultProgress,
} from './okr-progress.service';

describe('OKRProgressCalculator', () => {
  const calculator = new OKRProgressCalculator();

  describe('calculate', () => {
    it('should calculate progress for OKR with completed tasks', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Improve Product Quality',
        keyResults: [
          { id: 'kr-1', title: 'Reduce bugs', target: 10 },
          { id: 'kr-2', title: 'Increase test coverage', target: 5 },
        ],
      };

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-2', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-3', keyResultId: 'kr-1', status: 'in_progress' },
        { id: 'task-4', keyResultId: 'kr-2', status: 'done' },
        { id: 'task-5', keyResultId: 'kr-2', status: 'todo' },
      ];

      const result = calculator.calculate(okr, tasks);

      expect(result.keyResults['kr-1']).toEqual({
        completed: 2,
        target: 10,
        percentage: 20,
      });

      expect(result.keyResults['kr-2']).toEqual({
        completed: 1,
        target: 5,
        percentage: 20,
      });

      expect(result.overall).toBe(20);
    });

    it('should handle OKR with no tasks', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [
          { id: 'kr-1', title: 'KR 1', target: 10 },
        ],
      };

      const result = calculator.calculate(okr, []);

      expect(result.keyResults['kr-1']).toEqual({
        completed: 0,
        target: 10,
        percentage: 0,
      });

      expect(result.overall).toBe(0);
    });

    it('should handle OKR with no key results', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [],
      };

      const result = calculator.calculate(okr, []);

      expect(result.keyResults).toEqual({});
      expect(result.overall).toBe(0);
    });

    it('should handle key result with zero target', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [
          { id: 'kr-1', title: 'KR 1', target: 0 },
        ],
      };

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
      ];

      const result = calculator.calculate(okr, tasks);

      expect(result.keyResults['kr-1']).toEqual({
        completed: 1,
        target: 0,
        percentage: 0,
      });
    });

    it('should only count done tasks', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [
          { id: 'kr-1', title: 'KR 1', target: 10 },
        ],
      };

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-2', keyResultId: 'kr-1', status: 'in_progress' },
        { id: 'task-3', keyResultId: 'kr-1', status: 'in_review' },
        { id: 'task-4', keyResultId: 'kr-1', status: 'todo' },
      ];

      const result = calculator.calculate(okr, tasks);

      expect(result.keyResults['kr-1'].completed).toBe(1);
    });

    it('should handle 100% completion', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [
          { id: 'kr-1', title: 'KR 1', target: 2 },
        ],
      };

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-2', keyResultId: 'kr-1', status: 'done' },
      ];

      const result = calculator.calculate(okr, tasks);

      expect(result.keyResults['kr-1'].percentage).toBe(100);
      expect(result.overall).toBe(100);
    });

    it('should handle over 100% completion', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [
          { id: 'kr-1', title: 'KR 1', target: 2 },
        ],
      };

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-2', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-3', keyResultId: 'kr-1', status: 'done' },
      ];

      const result = calculator.calculate(okr, tasks);

      expect(result.keyResults['kr-1'].percentage).toBe(150);
      expect(result.overall).toBe(150);
    });

    it('should round percentages correctly', () => {
      const okr: OKR = {
        id: 'okr-1',
        title: 'Test OKR',
        keyResults: [
          { id: 'kr-1', title: 'KR 1', target: 3 },
        ],
      };

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
      ];

      const result = calculator.calculate(okr, tasks);

      expect(result.keyResults['kr-1'].percentage).toBe(33);
    });
  });

  describe('isCompleted', () => {
    it('should return true when overall progress is 100%', () => {
      const progress: OKRProgress = {
        overall: 100,
        keyResults: {},
      };

      expect(calculator.isCompleted(progress)).toBe(true);
    });

    it('should return true when overall progress is over 100%', () => {
      const progress: OKRProgress = {
        overall: 150,
        keyResults: {},
      };

      expect(calculator.isCompleted(progress)).toBe(true);
    });

    it('should return false when overall progress is less than 100%', () => {
      const progress: OKRProgress = {
        overall: 99,
        keyResults: {},
      };

      expect(calculator.isCompleted(progress)).toBe(false);
    });
  });

  describe('isKeyResultCompleted', () => {
    it('should return true when percentage is 100%', () => {
      const progress: KeyResultProgress = {
        completed: 10,
        target: 10,
        percentage: 100,
      };

      expect(calculator.isKeyResultCompleted(progress)).toBe(true);
    });

    it('should return true when percentage is over 100%', () => {
      const progress: KeyResultProgress = {
        completed: 15,
        target: 10,
        percentage: 150,
      };

      expect(calculator.isKeyResultCompleted(progress)).toBe(true);
    });

    it('should return false when percentage is less than 100%', () => {
      const progress: KeyResultProgress = {
        completed: 5,
        target: 10,
        percentage: 50,
      };

      expect(calculator.isKeyResultCompleted(progress)).toBe(false);
    });
  });

  describe('getIncompleteKeyResults', () => {
    it('should return IDs of incomplete key results', () => {
      const progress: OKRProgress = {
        overall: 50,
        keyResults: {
          'kr-1': { completed: 10, target: 10, percentage: 100 },
          'kr-2': { completed: 5, target: 10, percentage: 50 },
          'kr-3': { completed: 0, target: 10, percentage: 0 },
        },
      };

      const result = calculator.getIncompleteKeyResults(progress);

      expect(result).toEqual(['kr-2', 'kr-3']);
    });

    it('should return empty array when all key results are complete', () => {
      const progress: OKRProgress = {
        overall: 100,
        keyResults: {
          'kr-1': { completed: 10, target: 10, percentage: 100 },
          'kr-2': { completed: 10, target: 10, percentage: 100 },
        },
      };

      const result = calculator.getIncompleteKeyResults(progress);

      expect(result).toEqual([]);
    });

    it('should return empty array when no key results', () => {
      const progress: OKRProgress = {
        overall: 0,
        keyResults: {},
      };

      const result = calculator.getIncompleteKeyResults(progress);

      expect(result).toEqual([]);
    });
  });

  describe('calculateBatch', () => {
    it('should calculate progress for multiple OKRs', () => {
      const okrs: OKR[] = [
        {
          id: 'okr-1',
          title: 'OKR 1',
          keyResults: [
            { id: 'kr-1', title: 'KR 1', target: 10 },
          ],
        },
        {
          id: 'okr-2',
          title: 'OKR 2',
          keyResults: [
            { id: 'kr-2', title: 'KR 2', target: 5 },
          ],
        },
      ];

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-2', keyResultId: 'kr-2', status: 'done' },
        { id: 'task-3', keyResultId: 'kr-2', status: 'done' },
      ];

      const result = calculator.calculateBatch(okrs, tasks);

      expect(result.size).toBe(2);
      expect(result.get('okr-1')?.keyResults['kr-1'].completed).toBe(1);
      expect(result.get('okr-2')?.keyResults['kr-2'].completed).toBe(2);
    });

    it('should handle empty OKRs array', () => {
      const result = calculator.calculateBatch([], []);

      expect(result.size).toBe(0);
    });

    it('should handle empty tasks array', () => {
      const okrs: OKR[] = [
        {
          id: 'okr-1',
          title: 'OKR 1',
          keyResults: [
            { id: 'kr-1', title: 'KR 1', target: 10 },
          ],
        },
      ];

      const result = calculator.calculateBatch(okrs, []);

      expect(result.size).toBe(1);
      expect(result.get('okr-1')?.keyResults['kr-1'].completed).toBe(0);
    });

    it('should only include tasks for each OKR', () => {
      const okrs: OKR[] = [
        {
          id: 'okr-1',
          title: 'OKR 1',
          keyResults: [
            { id: 'kr-1', title: 'KR 1', target: 10 },
          ],
        },
        {
          id: 'okr-2',
          title: 'OKR 2',
          keyResults: [
            { id: 'kr-2', title: 'KR 2', target: 5 },
          ],
        },
      ];

      const tasks: Task[] = [
        { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
        { id: 'task-2', keyResultId: 'kr-2', status: 'done' },
        { id: 'task-3', keyResultId: 'kr-3', status: 'done' },
      ];

      const result = calculator.calculateBatch(okrs, tasks);

      expect(result.get('okr-1')?.keyResults['kr-1'].completed).toBe(1);
      expect(result.get('okr-2')?.keyResults['kr-2'].completed).toBe(1);
    });
  });
});
