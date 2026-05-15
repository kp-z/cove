import { describe, it, expect } from 'vitest';
import { TaskAssignmentPolicy, Task, Agent, TaskAssignment } from './task-assignment.service';

describe('TaskAssignmentPolicy', () => {
  const policy = new TaskAssignmentPolicy();

  describe('assignTask', () => {
    it('should assign task to idle agent with all required skills', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript', 'nodejs'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs', 'react'] },
        { id: 'agent-2', status: 'busy', skills: ['typescript', 'nodejs'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toEqual({
        agentId: 'agent-1',
        reason: 'Best skill match and available',
        skillMatchScore: 1,
      });
    });

    it('should return null when no agents are available', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'busy', skills: ['typescript'] },
        { id: 'agent-2', status: 'busy', skills: ['typescript'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toBeNull();
    });

    it('should return null when no agents have required skills', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['rust', 'webassembly'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs'] },
        { id: 'agent-2', status: 'idle', skills: ['python', 'django'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toBeNull();
    });

    it('should select agent with highest skill match score', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript', 'nodejs', 'graphql'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs', 'graphql'] },
        { id: 'agent-2', status: 'idle', skills: ['typescript', 'nodejs', 'graphql', 'react', 'nextjs'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toBeDefined();
      expect(result?.skillMatchScore).toBe(1);
      expect(['agent-1', 'agent-2']).toContain(result?.agentId);
    });

    it('should handle task with no required skills', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Simple task',
        requiredSkills: [],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toEqual({
        agentId: 'agent-1',
        reason: 'Best skill match and available',
        skillMatchScore: 1,
      });
    });

    it('should return null when agents array is empty', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript'],
      };

      const result = policy.assignTask(task, []);

      expect(result).toBeNull();
    });

    it('should prefer agent with exact skill match over agent with extra skills', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript', 'nodejs'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs'] },
        { id: 'agent-2', status: 'idle', skills: ['typescript', 'nodejs', 'react', 'vue', 'angular'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toBeDefined();
      expect(result?.skillMatchScore).toBe(1);
    });

    it('should handle partial skill match correctly', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript', 'nodejs', 'graphql'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toBeNull();
    });
  });

  describe('assignTasks', () => {
    it('should assign multiple tasks to available agents', () => {
      const tasks: Task[] = [
        { id: 'task-1', title: 'Build API', requiredSkills: ['typescript'] },
        { id: 'task-2', title: 'Build UI', requiredSkills: ['react'] },
      ];

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs'] },
        { id: 'agent-2', status: 'idle', skills: ['react', 'typescript'] },
      ];

      const result = policy.assignTasks(tasks, agents);

      expect(result.size).toBe(2);
      expect(result.get('task-1')).toBeDefined();
      expect(result.get('task-2')).toBeDefined();
    });

    it('should handle empty tasks array', () => {
      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript'] },
      ];

      const result = policy.assignTasks([], agents);

      expect(result.size).toBe(0);
    });

    it('should return null assignments for unassignable tasks', () => {
      const tasks: Task[] = [
        { id: 'task-1', title: 'Build API', requiredSkills: ['typescript'] },
        { id: 'task-2', title: 'Build Rust App', requiredSkills: ['rust'] },
      ];

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript'] },
      ];

      const result = policy.assignTasks(tasks, agents);

      expect(result.size).toBe(2);
      expect(result.get('task-1')).toBeDefined();
      expect(result.get('task-2')).toBeNull();
    });

    it('should handle all tasks being unassignable', () => {
      const tasks: Task[] = [
        { id: 'task-1', title: 'Build Rust App', requiredSkills: ['rust'] },
        { id: 'task-2', title: 'Build Go App', requiredSkills: ['golang'] },
      ];

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript'] },
      ];

      const result = policy.assignTasks(tasks, agents);

      expect(result.size).toBe(2);
      expect(result.get('task-1')).toBeNull();
      expect(result.get('task-2')).toBeNull();
    });

    it('should assign same agent to multiple tasks if qualified', () => {
      const tasks: Task[] = [
        { id: 'task-1', title: 'Build API', requiredSkills: ['typescript'] },
        { id: 'task-2', title: 'Build Service', requiredSkills: ['typescript'] },
      ];

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs'] },
      ];

      const result = policy.assignTasks(tasks, agents);

      expect(result.size).toBe(2);
      expect(result.get('task-1')?.agentId).toBe('agent-1');
      expect(result.get('task-2')?.agentId).toBe('agent-1');
    });
  });

  describe('calculateSkillMatchScore (via assignTask)', () => {
    it('should calculate perfect match score', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript', 'nodejs'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: ['typescript', 'nodejs'] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result?.skillMatchScore).toBe(1);
    });

    it('should return score of 1 for task with no required skills', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Simple task',
        requiredSkills: [],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: [] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result?.skillMatchScore).toBe(1);
    });

    it('should handle agent with no skills but task requires skills', () => {
      const task: Task = {
        id: 'task-1',
        title: 'Build API',
        requiredSkills: ['typescript'],
      };

      const agents: Agent[] = [
        { id: 'agent-1', status: 'idle', skills: [] },
      ];

      const result = policy.assignTask(task, agents);

      expect(result).toBeNull();
    });
  });
});
