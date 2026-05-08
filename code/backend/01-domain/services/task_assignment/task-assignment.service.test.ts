import { describe, it, expect } from 'vitest';
import { TaskAssignmentPolicy } from './task-assignment.service';

describe('TaskAssignmentPolicy', () => {
  it('should assign task to available agent', () => {
    const policy = new TaskAssignmentPolicy();
    const task = {
      id: 'task-123',
      title: 'Fix bug',
      requiredSkills: ['typescript', 'debugging'],
    };
    const agents = [
      { id: 'agent-1', status: 'idle', skills: ['typescript', 'debugging'] },
      { id: 'agent-2', status: 'busy', skills: ['python'] },
    ];

    const assignment = policy.assignTask(task, agents);
    expect(assignment.agentId).toBe('agent-1');
    expect(assignment.reason).toBe('Best skill match and available');
  });

  it('should return null when no suitable agent available', () => {
    const policy = new TaskAssignmentPolicy();
    const task = {
      id: 'task-123',
      title: 'Fix bug',
      requiredSkills: ['rust'],
    };
    const agents = [
      { id: 'agent-1', status: 'idle', skills: ['typescript'] },
      { id: 'agent-2', status: 'busy', skills: ['python'] },
    ];

    const assignment = policy.assignTask(task, agents);
    expect(assignment).toBeNull();
  });

  it('should prioritize agents with higher skill match', () => {
    const policy = new TaskAssignmentPolicy();
    const task = {
      id: 'task-123',
      title: 'Full-stack feature',
      requiredSkills: ['typescript', 'react', 'nodejs'],
    };
    const agents = [
      { id: 'agent-1', status: 'idle', skills: ['typescript'] },
      { id: 'agent-2', status: 'idle', skills: ['typescript', 'react', 'nodejs'] },
    ];

    const assignment = policy.assignTask(task, agents);
    expect(assignment.agentId).toBe('agent-2');
  });
});
