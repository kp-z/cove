/**
 * TaskAssignmentPolicy - 任务分配策略领域服务
 *
 * 负责根据任务需求和 Agent 能力进行智能任务分配。
 */

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly requiredSkills: readonly string[];
}

export interface Agent {
  readonly id: string;
  readonly status: 'idle' | 'busy';
  readonly skills: readonly string[];
}

export interface TaskAssignment {
  readonly agentId: string;
  readonly reason: string;
  readonly skillMatchScore: number;
}

export class TaskAssignmentPolicy {
  /**
   * 为任务分配最合适的 Agent
   *
   * 分配策略：
   * 1. Agent 必须是 idle 状态
   * 2. Agent 必须具备所有必需技能
   * 3. 优先选择技能匹配度最高的 Agent
   */
  assignTask(task: Task, agents: readonly Agent[]): TaskAssignment | null {
    // 过滤出可用的 Agent（idle 状态）
    const availableAgents = agents.filter(agent => agent.status === 'idle');

    if (availableAgents.length === 0) {
      return null;
    }

    // 计算每个 Agent 的技能匹配度
    const agentScores = availableAgents.map(agent => ({
      agent,
      score: this.calculateSkillMatchScore(task.requiredSkills, agent.skills),
    }));

    // 过滤出满足所有必需技能的 Agent
    const qualifiedAgents = agentScores.filter(({ score }) =>
      score.hasAllRequiredSkills
    );

    if (qualifiedAgents.length === 0) {
      return null;
    }

    // 选择技能匹配度最高的 Agent
    const bestMatch = qualifiedAgents.reduce((best, current) =>
      current.score.matchScore > best.score.matchScore ? current : best
    );

    return {
      agentId: bestMatch.agent.id,
      reason: 'Best skill match and available',
      skillMatchScore: bestMatch.score.matchScore,
    };
  }

  /**
   * 计算技能匹配度
   */
  private calculateSkillMatchScore(
    requiredSkills: readonly string[],
    agentSkills: readonly string[]
  ): { hasAllRequiredSkills: boolean; matchScore: number } {
    if (requiredSkills.length === 0) {
      return { hasAllRequiredSkills: true, matchScore: 1 };
    }

    // 检查是否具备所有必需技能
    const matchedSkills = requiredSkills.filter(skill =>
      agentSkills.includes(skill)
    );

    const hasAllRequiredSkills = matchedSkills.length === requiredSkills.length;

    // 计算匹配度分数（0-1）
    const matchScore = matchedSkills.length / requiredSkills.length;

    return { hasAllRequiredSkills, matchScore };
  }

  /**
   * 批量分配任务
   */
  assignTasks(
    tasks: readonly Task[],
    agents: readonly Agent[]
  ): Map<string, TaskAssignment | null> {
    const assignments = new Map<string, TaskAssignment | null>();

    for (const task of tasks) {
      const assignment = this.assignTask(task, agents);
      assignments.set(task.id, assignment);
    }

    return assignments;
  }
}
