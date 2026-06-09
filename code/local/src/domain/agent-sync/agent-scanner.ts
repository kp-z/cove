/**
 * Agent Scanner
 *
 * 扫描 Local 设备上的 Agent 目录（~/.cove/storage/agents/<id>/agent.md），
 * 解析 agent.md 的 YAML frontmatter，产出标准化的 AgentMetadata 列表。
 *
 * 职责归属：Agent 文件位于 Local Device，扫描/解析理应由 Local 负责，
 * 解析后的元数据通过 BackendGateway.syncAgentMetadata 推送给 Backend upsert 入库。
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type { AgentMetadata } from './agent-metadata'

/**
 * 扫描器日志接口（与 Local 现有 logger 兼容的最小子集）
 */
export interface ScannerLogger {
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: unknown): void
}

/**
 * 控制台兜底 logger
 */
const defaultLogger: ScannerLogger = {
  info: (m, c) => console.log(`[AgentScanner] ${m}`, c ?? ''),
  warn: (m, c) => console.warn(`[AgentScanner] ${m}`, c ?? ''),
  error: (m, e) => console.error(`[AgentScanner] ${m}`, e ?? ''),
}

export class AgentScanner {
  constructor(
    private readonly agentsDir: string,
    private readonly logger: ScannerLogger = defaultLogger
  ) {}

  /**
   * 扫描并解析全部 Agent 元数据
   * @returns 校验通过的元数据列表（无效条目被跳过）
   */
  async scan(): Promise<AgentMetadata[]> {
    const dirs = await this.listAgentDirectories()
    this.logger.info(`Found ${dirs.length} agent directories`)

    const results: AgentMetadata[] = []
    for (const dir of dirs) {
      const metadata = await this.readAgentMetadata(dir)
      if (metadata) {
        results.push(metadata)
      }
    }

    this.logger.info(`Parsed ${results.length} valid agent metadata entries`)
    return results
  }

  /**
   * 列出 agents 目录下的子目录（每个子目录代表一个 Agent）
   */
  private async listAgentDirectories(): Promise<string[]> {
    try {
      await fs.access(this.agentsDir)
      const entries = await fs.readdir(this.agentsDir, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => path.join(this.agentsDir, entry.name))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn(`Agents directory not found: ${this.agentsDir}`)
        return []
      }
      throw error
    }
  }

  /**
   * 读取并解析单个 agent.md 的 frontmatter
   * @returns 校验通过返回 AgentMetadata，否则返回 null
   */
  async readAgentMetadata(agentDir: string): Promise<AgentMetadata | null> {
    const agentMdPath = path.join(agentDir, 'agent.md')
    const dirName = path.basename(agentDir)

    let content: string
    try {
      content = await fs.readFile(agentMdPath, 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn(`agent.md not found in ${dirName}`)
      } else {
        this.logger.error(`Failed to read agent.md in ${dirName}`, error)
      }
      return null
    }

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch || !frontmatterMatch[1]) {
      this.logger.warn(`No frontmatter found in ${dirName}/agent.md`)
      return null
    }

    let parsed: unknown
    try {
      parsed = yaml.load(frontmatterMatch[1])
    } catch (error) {
      this.logger.error(`Invalid YAML frontmatter in ${dirName}/agent.md`, error)
      return null
    }

    const metadata = parsed as Partial<AgentMetadata> | null
    if (!metadata || !metadata.agent_id || !metadata.name) {
      this.logger.warn(`Invalid metadata in ${dirName}/agent.md: missing agent_id or name`)
      return null
    }

    return {
      agent_id: metadata.agent_id,
      name: metadata.name,
      display_name: metadata.display_name || metadata.name,
      status: metadata.status,
      category: metadata.category,
      capabilities: metadata.capabilities,
      tags: metadata.tags,
      created_by: metadata.created_by,
      created_at: metadata.created_at,
    }
  }
}
