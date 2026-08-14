# Phase 1 · 执行稳定 (A) · 切片 S1

> **状态**: 代码已完成，待手工验收（见 [acceptance](./01-execution-stability-acceptance.md)）  
> **依赖**: Phase 0 审计完成  
> **切片**: **S1 — Local 在飞注册表 + Abort + 前端 Stop**  
> **确认日期**: 2026-08-14 · **实现/终审**: 2026-08-14  
> **Cherry 参考**: AiStreamManager Open/Attach/Detach/Abort（只读模式）  
> **进度真相**: [PROGRESS.md](./PROGRESS.md)

## 1. 目标

一次 Agent 生成可被用户停止：local 真正中止进程/请求，云端与前端状态变为 `aborted`，重复 stop 幂等。

## 2. 非目标（本切片不做）

- 设备租约 / claim（S3 → Phase 2）
- 替换 30m DB 轮询为完成 ACK（S2）
- 合并双 WebSocket
- 扩展 Provider / MCP
- 启用未接线的 `ExecutionEntity` 或 legacy `AdapterExecutor`（只借其 AbortController 模式）

## 3. 身份约定（冻结）

| 字段 | 约定 |
|------|------|
| **执行键** | 复用已有 **`agentMessageId`**（服务端预分配，贯穿 accepted→chunk→终态） |
| **不新造** | 本阶段不引入平行的 `executionId`；避免双 correlation |
| **队列 task.id** | 仅作 local/cloud 队列内部 id；abort API 对外只认 `agentMessageId` |

## 4. 控制面消息形状（冻结草案）

### 4.1 下行：Cloud → Device（WS，与 `message.process` 同通道）

```ts
{
  type: 'message.abort',
  payload: {
    agentMessageId: string,  // 必填
    reason?: 'user' | 'system' | 'timeout',
    requestedAt?: string     // ISO
  }
}
```

**路由（已落地）**：`message.abort` 为 `protectedProcedure`；校验 channel 成员后，仅向该 channel 所属 **realm 的在线设备**广播；仅持有该 `agentMessageId` 注册项的设备执行 abort，其余 no-op（幂等）。  
Phase 2 可再改为「派发时记录 `processingDeviceId` → 定向 abort」。

### 4.2 上行：Frontend → Cloud（tRPC）

```ts
message.abort({
  agentMessageId: string,
  channelId: string,       // 鉴权 / 归属校验
  reason?: 'user' | 'system'
})
```

Cloud：校验调用方对 channel 有权限 → 广播 WS → 立即返回 `{ ok: true, dispatched: boolean }`（不保证 local 已杀进程；终态靠事件）。

### 4.3 终态事件（Cloud → Frontend，与现有 `agent.response.*` 对齐）

```ts
// 新增
agent.response.aborted {
  messageId: agentMessageId,  // 与其它事件同一字段名
  reason?: string,
  partialContent?: string     // 可选：已推过的正文保留展示
}
```

Local 中止后走 **`message.reportAbort`**（非 `reportFailure`）→ `agent.response.aborted`；带 `userMessageId`；失败有界重试。

## 5. Local 执行注册表（借 Cherry Stream Registry 模式）

### 5.1 职责（已落地）

| 操作 | 语义 |
|------|------|
| `register(agentMessageId)` | 开始处理前登记；返回 `ExecutionHandle`（含 `AbortController`） |
| `abort(agentMessageId)` | 触发 signal；杀 CLI / 取消请求；幂等 |
| `unregister(handle)` | **仅当仍是该 handle 时**移除（防同 id 新执行被误删） |

**Detach ≠ Abort**：Stop 显式 abort；退订 UI ≠ 中止。

### 5.2 落点

```
code/local/src/domain/agent-runtime/execution-registry.ts
code/local/src/domain/agent-runtime/device-processor.ts
code/local/src/device-client.ts
```

未接线 legacy `adapter-executor.ts`。

### 5.3 Adapter 接入（已落地）

`GenerateParams.signal?: AbortSignal`

| Adapter | Abort 行为 |
|---------|------------|
| `claude-code-cli-adapter` | `signal` → `child.kill('SIGTERM')` + `AbortError` |
| Anthropic / OpenAI | 传入 SDK AbortSignal |

## 6. 端到端时序

```
User 点 Stop
  → FE message.abort(agentMessageId)
  → BE 鉴权 + WS broadcast message.abort
  → Local DeviceClient 命中 registry.abort
  → AbortSignal → CLI kill / HTTP abort
  → Local message.reportAbort（含 userMessageId，有界重试）
  → BE agent.response.aborted + notifyAborted
  → FE 进度相变为 aborted（保留已流式内容）
  → Cloud 队列 success 结束，禁止重试派发
```

## 7. 前端（已落地）

- Stop → `message.abort`（`protectedProcedure`）
- `agent.response.aborted` → `abortAgentProgress`
- Stop 仅在权威 id：`accepted | thinking | tool_use | responding`（provisional pending 不可假停）

## 8. 验收标准

见 [01-execution-stability-acceptance.md](./01-execution-stability-acceptance.md)。

## 9. 实现顺序（已完成 Task 1–6 + 终审修复）

手工 E2E 与 commit 仍待用户。

## 10. 开放问题（实现前拍板）

| # | 问题 | 结论 |
|---|------|------|
| Q1 | abort 广播 vs 定向 device | **同 realm 广播**（终审修订）；Phase 2 可定向 |
| Q2 | aborted 后是否落库一条 agent 消息 | **落库**（可含部分内容） |
| Q3 | abort 时 cloud 等待循环 | **立刻结束等待**（`userMessageId`），禁止当失败重试 |

契约已确认并实现；待 [手工验收](./01-execution-stability-acceptance.md)。
