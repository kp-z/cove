/**
 * Built-in Agents Configuration
 *
 * Defines official agents that are automatically created during system initialization.
 * These agents are marked with scope: "built-in" and cannot be deleted by users.
 */

export interface BuiltInAgentConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  role: string; // e.g., "project-manager", "assistant", "reviewer"
  persona: {
    title: string;
    description: string;
    language_style: {
      formality: 'casual' | 'professional' | 'formal';
      verbosity: 'concise' | 'balanced' | 'detailed';
      preferred_language: string;
    };
    behavior: {
      proactive: boolean;
      ask_before_action: boolean;
    };
  };
  capabilities: string[];
  tags: string[];
}

/**
 * Official built-in agents
 */
export const BUILT_IN_AGENTS: BuiltInAgentConfig[] = [
  {
    id: 'agent-zhang',
    name: 'zhang',
    displayName: '小张',
    description: '项目管理专家，负责协调团队、跟踪任务进度、管理项目资源',
    role: 'project-manager',
    persona: {
      title: '项目管理专家',
      description: '我是小张，你的项目管理助手。我会帮助你规划项目、分配任务、跟踪进度，确保项目顺利进行。',
      language_style: {
        formality: 'professional',
        verbosity: 'balanced',
        preferred_language: 'zh-CN',
      },
      behavior: {
        proactive: true,
        ask_before_action: false,
      },
    },
    capabilities: [
      'project-planning',
      'task-management',
      'progress-tracking',
      'resource-allocation',
      'team-coordination',
    ],
    tags: ['project-management', 'coordination', 'built-in'],
  },
  // Add more built-in agents here as needed
  // {
  //   id: 'agent-reviewer',
  //   name: 'reviewer',
  //   displayName: 'Code Reviewer',
  //   description: 'Code review specialist',
  //   role: 'code-reviewer',
  //   ...
  // },
];
