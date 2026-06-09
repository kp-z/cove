/**
 * AgentScanner 单元测试
 *
 * 在临时目录构造 agent.md 样例，验证 frontmatter 解析、字段回填与无效条目跳过。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { AgentScanner, type ScannerLogger } from '../agent-scanner'

/**
 * 静默 logger，避免测试输出噪音
 */
const silentLogger: ScannerLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

/**
 * 在指定目录写一个 agent 子目录与 agent.md
 */
async function writeAgent(root: string, dirName: string, content: string): Promise<void> {
  const dir = path.join(root, dirName)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'agent.md'), content, 'utf-8')
}

describe('AgentScanner', () => {
  let tmpRoot: string

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cove-agents-'))
  })

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true })
  })

  it('应解析合法 frontmatter 并回填 display_name', async () => {
    await writeAgent(
      tmpRoot,
      'agent-zhang',
      `---
agent_id: agent-zhang
name: zhang
display_name: 小张
status: active
capabilities:
  - chat
  - code
tags: [builtin]
---

# 小张
正文内容`
    )

    const scanner = new AgentScanner(tmpRoot, silentLogger)
    const result = await scanner.scan()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      agent_id: 'agent-zhang',
      name: 'zhang',
      display_name: '小张',
      status: 'active',
      capabilities: ['chat', 'code'],
      tags: ['builtin'],
    })
  })

  it('display_name 缺失时回退为 name', async () => {
    await writeAgent(
      tmpRoot,
      'agent-x',
      `---
agent_id: agent-x
name: xbot
---
body`
    )

    const scanner = new AgentScanner(tmpRoot, silentLogger)
    const result = await scanner.scan()

    expect(result).toHaveLength(1)
    expect(result[0]?.display_name).toBe('xbot')
  })

  it('应跳过无 frontmatter 的 agent.md', async () => {
    await writeAgent(tmpRoot, 'agent-nofm', `# 没有 frontmatter\n正文`)

    const scanner = new AgentScanner(tmpRoot, silentLogger)
    const result = await scanner.scan()

    expect(result).toHaveLength(0)
  })

  it('应跳过缺少 agent_id / name 的条目', async () => {
    await writeAgent(
      tmpRoot,
      'agent-bad',
      `---
display_name: 缺少必填字段
---
body`
    )

    const scanner = new AgentScanner(tmpRoot, silentLogger)
    const result = await scanner.scan()

    expect(result).toHaveLength(0)
  })

  it('目录不存在时返回空数组而非抛错', async () => {
    const scanner = new AgentScanner(path.join(tmpRoot, 'not-exist'), silentLogger)
    const result = await scanner.scan()
    expect(result).toEqual([])
  })

  it('应混合处理多个目录（合法保留 / 非法跳过）', async () => {
    await writeAgent(
      tmpRoot,
      'good',
      `---
agent_id: good-1
name: good
display_name: Good
---
ok`
    )
    await writeAgent(tmpRoot, 'bad', `no frontmatter here`)

    const scanner = new AgentScanner(tmpRoot, silentLogger)
    const result = await scanner.scan()

    expect(result).toHaveLength(1)
    expect(result[0]?.agent_id).toBe('good-1')
  })
})
