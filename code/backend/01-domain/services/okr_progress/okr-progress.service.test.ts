import { describe, it, expect } from 'vitest';
import { OKRProgressCalculator } from './okr-progress.service';

describe('OKRProgressCalculator', () => {
  it('should calculate OKR progress based on completed tasks', () => {
    const calculator = new OKRProgressCalculator();
    const okr = {
      id: 'okr-123',
      title: 'Launch MVP',
      keyResults: [
        { id: 'kr-1', title: 'Complete 10 features', target: 10 },
        { id: 'kr-2', title: 'Achieve 80% test coverage', target: 80 },
      ],
    };
    const tasks = [
      { id: 'task-1', keyResultId: 'kr-1', status: 'done' },
      { id: 'task-2', keyResultId: 'kr-1', status: 'done' },
      { id: 'task-3', keyResultId: 'kr-1', status: 'in_progress' },
      { id: 'task-4', keyResultId: 'kr-2', status: 'done' },
    ];

    const progress = calculator.calculate(okr, tasks);
    expect(progress.overall).toBe(11); // (20% + 1%) / 2 = 10.5% ≈ 11%
    expect(progress.keyResults['kr-1'].completed).toBe(2);
    expect(progress.keyResults['kr-1'].percentage).toBe(20);
    expect(progress.keyResults['kr-2'].completed).toBe(1);
    expect(progress.keyResults['kr-2'].percentage).toBe(1);
  });

  it('should handle OKR with no tasks', () => {
    const calculator = new OKRProgressCalculator();
    const okr = {
      id: 'okr-123',
      title: 'Launch MVP',
      keyResults: [
        { id: 'kr-1', title: 'Complete 10 features', target: 10 },
      ],
    };

    const progress = calculator.calculate(okr, []);
    expect(progress.overall).toBe(0);
    expect(progress.keyResults['kr-1'].completed).toBe(0);
  });
});
