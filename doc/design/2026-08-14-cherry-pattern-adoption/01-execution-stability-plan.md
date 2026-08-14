# S1 Abort + Execution Registry · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户可停止进行中的 Agent 生成：local 真正中止，前端进入 `aborted`，云端结束等待且不重试派发。

**Architecture:** 复用 `agentMessageId` 作为执行键。Local 进程内 `ExecutionRegistry`（AbortController）对标 Cherry AiStreamManager 的 abort 语义。Cloud 经 tRPC `message.abort` 向在线设备广播 WS `message.abort`；Local 命中注册表后杀进程/取消请求，再 `reportAbort` → `agent.response.aborted`；同时解除 cloud `DeviceProcessor` 的等待 Promise，禁止当失败重入队。

**Tech Stack:** TypeScript · tRPC · WebSocket device subscription · Vitest · 现有 `LlmAdapter` / Claude CLI `child.kill`

**Spec:** `doc/design/2026-08-14-cherry-pattern-adoption/01-execution-stability.md`  
**Progress:** `doc/design/2026-08-14-cherry-pattern-adoption/PROGRESS.md`

## Global Constraints

- 执行键 = `agentMessageId`（不新造平行 `executionId`）
- S1 abort **广播**到所有在线设备；未持有注册项则 no-op
- aborted **落库** agent 消息（可含 partial content）
- abort 后 cloud **立刻结束等待且禁止当失败重试**
- 不接线 legacy `adapter-executor.ts` / `websocket-client.ts`
- 不改 Cove 前端设计体系；只接线已有 Stop 按钮
- 本仓库：**未经用户明确要求不要 git commit**（计划中的 Commit 步改为「暂存说明，等用户下令再 commit」）

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `code/local/src/domain/agent-runtime/execution-registry.ts` | Create | 在飞执行登记 / abort / unregister |
| `code/local/src/domain/agent-runtime/execution-registry.test.ts` | Create | 单测 |
| `code/local/src/infrastructure/adapters/llm/llm-adapter.interface.ts` | Modify | `GenerateParams.signal?` |
| `code/local/src/infrastructure/adapters/llm/claude-code-cli-adapter.ts` | Modify | signal → kill child |
| `code/local/src/infrastructure/adapters/llm/*anthropic*` / `*openai*` | Modify | 传入 AbortSignal（若易接） |
| `code/local/src/domain/agent-runtime/device-processor.ts` | Modify | register + 传 signal + abort 终态 |
| `code/local/src/device-client.ts` | Modify | 处理 `message.abort` |
| `code/local/src/infrastructure/gateway/backend-gateway.interface.ts` | Modify | `reportAgentAbort` |
| `code/local/src/infrastructure/gateway/trpc-backend-gateway.ts` | Modify | 调用 `message.reportAbort` |
| `code/cloud/backend/.../message.router.ts` | Modify | `abort` + `reportAbort` |
| `code/cloud/backend/.../device-connection-manager.ts` | Use | 已有 `broadcastToDevices` |
| `code/cloud/backend/.../message-orchestrator/device-processor.ts` | Modify | `resolveWaitOnAbort`；禁止重试 |
| `code/cloud/backend/.../subscription.router.ts` | Modify | 订阅 `agent.response.aborted` |
| `code/cloud/frontend/.../useAgentStreaming.ts` | Modify | 处理 aborted |
| `code/cloud/frontend/.../MessageStateManager.ts` | Modify | `abortAgentProgress` |
| `code/cloud/frontend/.../ChannelPanel/index.tsx` + `Composer.tsx` | Modify | 接线 Stop → `message.abort` |

---

### Task 1: ExecutionRegistry（Local）

**Files:**
- Create: `code/local/src/domain/agent-runtime/execution-registry.ts`
- Test: `code/local/src/domain/agent-runtime/execution-registry.test.ts`

**Interfaces:**
- Produces:
  - `ExecutionHandle = { agentMessageId: string; controller: AbortController; startedAt: number }`
  - `class ExecutionRegistry { register(id); abort(id): boolean; unregister(id); has(id); getSignal(id): AbortSignal | undefined }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { ExecutionRegistry } from './execution-registry'

describe('ExecutionRegistry', () => {
  it('register then abort triggers signal and returns true', () => {
    const reg = new ExecutionRegistry()
    const { controller } = reg.register('msg-1')
    expect(controller.signal.aborted).toBe(false)
    expect(reg.abort('msg-1')).toBe(true)
    expect(controller.signal.aborted).toBe(true)
  })

  it('abort unknown id is idempotent no-op', () => {
    const reg = new ExecutionRegistry()
    expect(reg.abort('missing')).toBe(false)
    expect(reg.abort('missing')).toBe(false)
  })

  it('double abort is idempotent', () => {
    const reg = new ExecutionRegistry()
    reg.register('msg-1')
    expect(reg.abort('msg-1')).toBe(true)
    expect(reg.abort('msg-1')).toBe(false) // already aborted/removed OR still true but no throw — pick one and document
  })

  it('unregister removes handle', () => {
    const reg = new ExecutionRegistry()
    reg.register('msg-1')
    reg.unregister('msg-1')
    expect(reg.has('msg-1')).toBe(false)
    expect(reg.abort('msg-1')).toBe(false)
  })
})
```

约定：**abort 成功返回 true 并 `unregister`；未知或已移除返回 false**（第二次 abort → false）。

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd code/local && npx vitest run src/domain/agent-runtime/execution-registry.test.ts
```

- [ ] **Step 3: Implement registry**

```ts
export interface ExecutionHandle {
  agentMessageId: string
  controller: AbortController
  startedAt: number
}

export class ExecutionRegistry {
  private readonly running = new Map<string, ExecutionHandle>()

  register(agentMessageId: string): ExecutionHandle {
    this.abort(agentMessageId) // 同 id 重入：先取消旧的
    const controller = new AbortController()
    const handle = { agentMessageId, controller, startedAt: Date.now() }
    this.running.set(agentMessageId, handle)
    return handle
  }

  getSignal(agentMessageId: string): AbortSignal | undefined {
    return this.running.get(agentMessageId)?.controller.signal
  }

  has(agentMessageId: string): boolean {
    return this.running.has(agentMessageId)
  }

  abort(agentMessageId: string): boolean {
    const handle = this.running.get(agentMessageId)
    if (!handle) return false
    if (!handle.controller.signal.aborted) {
      handle.controller.abort()
    }
    this.running.delete(agentMessageId)
    return true
  }

  unregister(agentMessageId: string): void {
    this.running.delete(agentMessageId)
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Doc only — do not commit unless user asks**

---

### Task 2: Adapter `signal` + CLI kill

**Files:**
- Modify: `code/local/src/infrastructure/adapters/llm/llm-adapter.interface.ts`
- Modify: `code/local/src/infrastructure/adapters/llm/claude-code-cli-adapter.ts`（所有 `spawn` 路径）
- Modify: Anthropic/OpenAI adapters if they have easy AbortSignal hooks
- Test: 优先 registry 级；CLI 可用单测 mock spawn 或抽 `bindAbortToProcess(signal, child)`

**Interfaces:**
- Consumes: `AbortSignal`
- Produces: `GenerateParams.signal?: AbortSignal`

- [ ] **Step 1: Extend interface**

```ts
export interface GenerateParams {
  systemPrompt: string
  messages: ChatMessage[]
  maxTokens?: number
  streaming?: StreamingCallbacks
  /** S1: 取消信号；adapter 应尽快停止并抛 AbortError / 返回中断 */
  signal?: AbortSignal
}
```

`generateBatchResponse` 的 params 类型同步包含 `signal`（当前为 `Omit<GenerateParams, 'streaming'>`，已自动带上）。

- [ ] **Step 2: CLI — abort 监听杀进程**

在每次 `spawn` 成功后：

```ts
const onAbort = () => {
  if (!child.killed) child.kill('SIGTERM')
}
if (params.signal) {
  if (params.signal.aborted) onAbort()
  else params.signal.addEventListener('abort', onAbort, { once: true })
}
// 在 close/finally 里 removeEventListener
```

若因 abort 退出：`reject` 或 throw 带 `name: 'AbortError'` 的 Error，供 DeviceProcessor 识别。

- [ ] **Step 3: API adapters** — 将 `signal` 传给 SDK（与 legacy `adapter-executor` 相同模式）；没有则至少响应 signal 提前结束 Promise。

- [ ] **Step 4: Run local vitest for touched adapters / registry**

---

### Task 3: DeviceProcessor 登记 + abort 终态（Local）

**Files:**
- Modify: `code/local/src/domain/agent-runtime/device-processor.ts`
- Modify: `code/local/src/device-client.ts`（构造注入共享 `ExecutionRegistry` 单例）
- Modify: gateway interface + `trpc-backend-gateway.ts`

**Interfaces:**
- Consumes: `ExecutionRegistry`, `GenerateParams.signal`
- Produces: `BackendGateway.reportAgentAbort({ channelId, messageId, agentId?, partialContent?, reason? })`

- [ ] **Step 1: DeviceClient 持有 registry**

```ts
private readonly executionRegistry = new ExecutionRegistry()
// 传给 DeviceProcessor；handleMessage 可调用 this.executionRegistry.abort(...)
```

- [ ] **Step 2: generateResponse 包装**

在调用 adapter 前：

```ts
const agentMessageId = task.metadata?.agentMessageId || task.messageId
const { controller } = this.executionRegistry.register(agentMessageId)
try {
  // batch + stream 都传入 signal: controller.signal
  ...
} catch (e) {
  if (controller.signal.aborted || (e instanceof Error && e.name === 'AbortError')) {
    await this.backendGateway.reportAgentAbort({
      channelId: task.channelId,
      messageId: agentMessageId,
      agentId: task.metadata?.agentId,
      reason: 'user',
      // partialContent: 若 collector/已推内容可取则带上
    })
    return { success: true, aborted: true } // ProcessResult 扩展或等价，避免 orchestrator 重试
  }
  throw e
} finally {
  this.executionRegistry.unregister(agentMessageId)
}
```

注意：`process()` 外层失败路径不要把 abort 当普通 failure 再 `reportFailure`。

- [ ] **Step 3: handleMessage 增加 abort**

```ts
} else if (message.type === 'message.abort' && message.payload?.agentMessageId) {
  const id = message.payload.agentMessageId as string
  const hit = this.executionRegistry.abort(id)
  this.logger.info('message.abort handled', { agentMessageId: id, hit })
}
```

- [ ] **Step 4: Gateway `reportAgentAbort` → tRPC `message.reportAbort`**

- [ ] **Step 5: 单测** — mock gateway + registry：abort 后调用 reportAgentAbort 且不 reportFailure

---

### Task 4: Cloud `message.abort` + `reportAbort` + 结束等待

**Files:**
- Modify: `code/cloud/backend/src/infrastructure/trpc/routers/message.router.ts`
- Modify: `code/cloud/backend/src/domain/message-orchestrator/device-processor.ts`
- Modify: `code/cloud/backend/src/infrastructure/trpc/routers/subscription.router.ts`（事件白名单）
- Wire: `DeviceConnectionManager.broadcastToDevices(getOnlineDevices(), …)`
- Persist: 经 `MessageCrudService` 或现有 save 路径落库 aborted 消息（`status`/`metadata.aborted`）

**Interfaces:**
- `message.abort` input: `{ agentMessageId, channelId, reason?: 'user'|'system' }`
- `message.reportAbort` input: `{ channelId, messageId, agentId?, reason?, partialContent? }`
- Event: `agent.response.aborted` payload `{ messageId, channelId, agentId?, reason?, partialContent? }`

- [ ] **Step 1: `message.abort` mutation**

1. 鉴权：调用方能访问该 channel（沿用项目现有 message 路由鉴权模式；若 `publicProcedure` 仅靠 device key，前端路线需 protectedProcedure — **与同文件 `message.send` 对齐**）。
2. `broadcastToDevices(onlineDevices, { type: 'message.abort', payload: { agentMessageId, reason, requestedAt } })`
3. 返回 `{ ok: true, dispatched: successCount > 0 }`

- [ ] **Step 2: `message.reportAbort`**

1. 落库：upsert agent 消息 `messageId=agentMessageId`，content=partialContent ?? ''，metadata 含 `aborted: true`
2. `eventBus.publish` `agent.response.aborted`
3. 调用 cloud `DeviceProcessor.notifyAborted(agentMessageId | userMessageId)`：
   - pendingTasks 今日按 **user `messageId`** 索引（见 `waitForDeviceResponse(task.messageId)`）
   - 因此 reportAbort / abort 时必须能解析 `userMessageId`（metadata.inReplyTo / 请求体增加 `userMessageId`）
   - **建议 reportAbort 增加可选 `userMessageId`**；Local 从 `task.metadata.userMessageId` 传入
   - `resolve` pending 为 `{ success: true, aborted: true }` 并 clearTimeout — **不要 reject**（reject 会走 handleFailure 重试）

- [ ] **Step 3: MessageOrchestrator**

确认 `success: true`（含 aborted）→ `COMPLETED`，不重入队。若 `ProcessResult` 需扩展字段，更新 interface。

- [ ] **Step 4: subscription 允许 `agent.response.aborted`**

- [ ] **Step 5: 后端单测** — abort 广播调用；reportAbort 发布事件；pending resolve 不重试

---

### Task 5: Frontend Stop 接线

**Files:**
- Modify: `code/cloud/frontend/src/features/channel/components/ChannelPanel/index.tsx`
- Modify: `code/cloud/frontend/src/features/channel/components/ChannelPanel/Composer.tsx`（若 Stop 仍是空 TODO）
- Modify: `code/cloud/frontend/src/features/channel/hooks/useAgentStreaming.ts`
- Modify: `code/cloud/frontend/src/features/channel/domain/MessageStateManager.ts`

- [ ] **Step 1: MessageStateManager.abortAgentProgress(agentMessageId)**

相变 `aborted`；保留 partialContent；清 timer。

- [ ] **Step 2: useAgentStreaming 订阅 `agent.response.aborted`**

与 `failed` 分支并列，调用 `abortAgentProgress`。

- [ ] **Step 3: handleStopGeneration**

从当前 channel 的 agentProgress 中取 phase ∈ thinking|tool_use|responding 的 `agentMessageId`（若多个，全部 abort 或只 abort 最新 — **默认全部**）。

```ts
await trpc.message.abort.mutate({
  agentMessageId,
  channelId: channel_id,
  reason: 'user',
})
```

- [ ] **Step 4: Composer `handleStop` → `onStop`**（确认 UI 已绑定 `isGenerating`；生成中显示 Stop）

- [ ] **Step 5: 前端相关 vitest（Composer onStop 已有；可补 MessageStateManager abort 单测）**

---

### Task 6: 手工验收 + 进度文档

- [ ] **Step 1: 本地起 backend + frontend + local device，发消息触发 CLI/流式，点 Stop**

验收清单（来自 spec §8）：

1. 进程/请求停止  
2. UI → aborted，不转圈  
3. 再点 Stop 幂等  
4. 未知 id no-op  
5. 日志含 agentMessageId  
6. 云端队列无因 abort 重派同一 turn  

- [ ] **Step 2: 更新 PROGRESS.md**

- 阶段 Phase 1 → 进行中/已完成（按实际）  
- 决策日志追加「契约已冻结并实现」  
- 会话交接摘要  

- [ ] **Step 3: 等用户要求再 git commit**

---

## Spec coverage check

| Spec 项 | Task |
|---------|------|
| agentMessageId 执行键 | 1–5 |
| WS `message.abort` 广播 | 4 |
| tRPC `message.abort` | 4 + 5 |
| `agent.response.aborted` | 4 + 5 |
| ExecutionRegistry | 1 + 3 |
| CLI/API AbortSignal | 2 |
| 落库 aborted | 4 |
| 禁止重试 | 4（resolve success，不 reject） |
| 前端 Stop | 5 |
| 单测 ≥2 | 1（+3/4） |

## Placeholder scan

无 TBD；`userMessageId` 已在 Task 4 明确为 reportAbort 可选字段以解除 pending 等待。
