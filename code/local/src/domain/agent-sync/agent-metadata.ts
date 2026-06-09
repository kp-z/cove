/**
 * Agent 内容（Phase 4 路线 A）
 *
 * 来源于 agent.md 正文 + persona.yaml / runtime.yaml / config/*.yaml，
 * 由 Local 解析后随元数据一并同步给 Backend，写入 DB 的 contentJson（内容真源）。
 * 字段全部可选：解析失败或文件缺失时对应字段省略。
 */
export interface AgentContent {
  description?: string
  capabilities?: string[]
  tags?: string[]
  runtimeConfig?: Record<string, unknown>
  persona?: Record<string, unknown>
  skills?: Record<string, unknown>
  tools?: Record<string, unknown>
  triggers?: Record<string, unknown>
}

/**
 * Agent 元数据类型
 *
 * 对应 agent.md 文件头部的 YAML frontmatter，与 Backend 的同步契约保持一致。
 * content 为 Phase 4 新增：携带完整内容供 Backend 落入 contentJson。
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
  content?: AgentContent
}
