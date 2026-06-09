/**
 * Agent 元数据类型
 *
 * 对应 agent.md 文件头部的 YAML frontmatter，与 Backend 的同步契约保持一致。
 */
export interface AgentMetadata {
  agent_id: string
  name: string
  display_name: string
  status?: string
  category?: string
  capabilities?: string[]
  tags?: string[]
  created_by?: string
  created_at?: string
}
