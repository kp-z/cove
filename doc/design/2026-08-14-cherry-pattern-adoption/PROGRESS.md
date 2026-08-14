# Cherry 模式移植 · 进度板

> **状态**: 进行中  
> **策略**: 模式移植（不依赖 Cherry 源码/包）  
> **创建**: 2026-08-14  
> **最后更新**: 2026-08-14（S1 实现 + 终审修复完成，待手工验收）

本文档是本改造线的**唯一当前真相**。会话中断后，先读本文件再继续。

| 文档 | 用途 |
|------|------|
| [00-overview.md](./00-overview.md) | 总原则与契约草案 |
| [00-audit-findings.md](./00-audit-findings.md) | Phase 0 代码审计 |
| [01-execution-stability.md](./01-execution-stability.md) | S1 规格 |
| [01-execution-stability-plan.md](./01-execution-stability-plan.md) | S1 实现计划 |
| [01-execution-stability-acceptance.md](./01-execution-stability-acceptance.md) | Stop 手工验收清单 |
| `.superpowers/sdd/final-fix-report.md` | 终审 Critical/Important 修复记录（工作区） |

---

## 1. 目标与非目标

### 目标（优先级）

| 代号 | 主题 | 说明 |
|------|------|------|
| A | 执行稳定 | 流式/执行注册、abort、重连语义、失败边界 |
| B | 设备可用 | 连接状态机、心跳、崩溃恢复、幂等认领 |
| C | AI 能力面 | Provider/Adapter 统一抽象，再 MCP/工具 |
| D | 工程成熟度 | 测试、可观测、目录治理（**贯穿各阶段**） |

### 非目标（明确不做或后置）

- 不 npm link / 不 vendoring Cherry 仓库
- 不引入 Electron/IPC 作为 Cove 主边界
- 不替换 Cove 前端设计体系
- 桌面端 / 手机端壳：**后置**（接口可多端，但不先做壳）
- 不把 LLM 调用搬回 cloud（执行仍在 local）

---

## 2. 阶段看板

| 阶段 | 文档 | 状态 | 备注 |
|------|------|------|------|
| Phase 0 基线与契约 | [00-overview](./00-overview.md) · [审计](./00-audit-findings.md) | 已完成 | 审计完成；S1 确认 |
| Phase 1 执行稳定 (A) · S1 | [规格](./01-execution-stability.md) · [计划](./01-execution-stability-plan.md) · [验收](./01-execution-stability-acceptance.md) | 待手工验收 | 代码 + 终审修复已合入工作区；**未 commit** |
| Phase 2 设备可用 (B) | [02-device-lifecycle.md](./02-device-lifecycle.md) | 未开始 | 租约/claim、双 WS 收敛 |
| Phase 3 AI 能力面 (C) | [03-ai-capability.md](./03-ai-capability.md) | 未开始 | |
| Phase 4 工程成熟度 (D) | [04-engineering-maturity.md](./04-engineering-maturity.md) | 贯穿 | S1 已带测试/日志；债务见下 |

**状态枚举**: `未开始` | `进行中` | `待手工验收` | `阻塞` | `已完成` | `搁置`

---

## 3. 当前焦点

- **已完成（代码）**: S1 全链路 + 终审修复（C1/I1/I2/I3/M1）
- **正在等**: 用户本地 Stop E2E（[验收清单](./01-execution-stability-acceptance.md)）
- **下一步（验收通过后）**:
  1. Phase 1 标为「已完成」
  2. 用户授权后整理/commit（工作区可能含无关删除，需先核对 `git status`）
  3. 可选启动 Phase 2（设备租约 / 双 WS）
- **阻塞**: 无

---

## 4. S1 交付摘要（已实现）

| 层 | 内容 |
|----|------|
| Local | `ExecutionRegistry`（按 handle 注销）；`AbortSignal`→CLI kill / API；`message.abort` WS；`reportAbort` 最多 3 次重试 |
| Cloud | `message.abort`=`protectedProcedure`（成员校验）；**仅广播同 realm 在线设备**；`reportAbort` 设备鉴权；`agent.response.aborted`；pending `success` 解除、不重试 |
| Frontend | Stop → `message.abort`；仅权威 id（`accepted\|thinking\|tool_use\|responding`）可停；`aborted` 气泡保留部分内容 |

### 终审已修

| ID | 修复 |
|----|------|
| C1 | realm 范围广播 + abort 鉴权；reportAbort 设备身份 |
| I1 | `unregister(handle)` 不误删同 id 新执行 |
| I2 | 禁止 provisional pending 假停止 |
| I3 | reportAbort 失败不再吞掉；有界重试 |
| M1 | 强制携带 `userMessageId` |

### 仍可后置（终审 Minor）

- M2：abort `reason` 全链路透传  
- M3：Anthropic/OpenAI abort 单测  
- M4：`startConversation` 未接 abort  
- M5：既有 chunk-retry / lockfile / 部分 router 断言失败（与 S1 主路径无关）

---

## 5. 决策日志

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-08-14 | 模式移植，不依赖 Cherry 源码 | 避免 Electron/IPC 耦合 |
| 2026-08-14 | 优先 A/B/C/D；前端保持 Cove；桌面/手机后置 | 稳定优先 |
| 2026-08-14 | 主进度板 + 阶段规格 | 防丢上下文 |
| 2026-08-14 | Phase 0→1→2→3，D 贯穿 | 先执行/设备再扩能力 |
| 2026-08-14 | 切片 S1：注册表 + abort + Stop | 用户确认关键 |
| 2026-08-14 | 执行键=`agentMessageId`；落库 aborted；禁止重试 | 契约 OK |
| 2026-08-14 | S1 初版：广播所有在线设备 | 最小切片 |
| 2026-08-14 | **修订**：abort 仅广播目标 channel 所属 realm；`protectedProcedure` | 终审 C1 |
| 2026-08-14 | Stop 仅在权威 `agentMessageId` 出现后可用 | 终审 I2 |
| 2026-08-14 | 实现未自动 commit | 需用户明确授权 |

---

## 6. 会话交接摘要

> 新会话先读本节。

- Phase 0 完成；Phase 1 S1 **代码完成 + 终审修复**，状态 **待手工验收**。
- 关键钥：`agentMessageId`；解除 cloud 等待靠 `userMessageId`；执行键勿平行造 `executionId`。
- 手工验收：起 backend + frontend + local → 等 Agent 进入 thinking/responding → Stop → 勾选验收清单。
- **未 commit**；工作区可能混有无关删除，commit 前务必 `git status` / `git diff`。
- 验收通过 → Phase 1 标完成 → 再谈 Phase 2（claim/lease、双 WebSocket）。

---

## 7. 相关路径速查

| 区域 | 路径 |
|------|------|
| Local 注册表 / 执行 | `code/local/src/domain/agent-runtime/execution-registry.ts`、`device-processor.ts` |
| Local 入口 | `code/local/src/device-client.ts` |
| Adapter signal | `code/local/src/infrastructure/adapters/llm/` |
| Cloud abort | `code/cloud/backend/src/infrastructure/trpc/routers/message.router.ts` |
| Cloud pending | `code/cloud/backend/src/domain/message-orchestrator/device-processor.ts` |
| Frontend Stop | `code/cloud/frontend/src/features/channel/components/ChannelPanel/` |
| Cherry 参考（只读） | `/Users/kp/项目/Proj/cherry-studio/docs/references/` |
| 本改造文档 | `doc/design/2026-08-14-cherry-pattern-adoption/` |
