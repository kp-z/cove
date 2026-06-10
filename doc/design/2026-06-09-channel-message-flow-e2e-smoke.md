# Channel 消息链路 E2E 冒烟测试与验证清单（契约优先重构）

- 类型：design / 验证规程
- 日期：2026-06-09
- 关联计划：`.cursor/plans/channel_message_flow_debug_4cf65a8c.plan.md`
- 适用范围：前端 → Cloud Backend → Local Device 的 channel 对话链路

本文件描述「契约优先」重构后的端到端（E2E）冒烟测试规程与验证清单。
由于真实链路需要同时运行 Backend、Local Device 与（前端或 tRPC 客户端），且依赖
本机 SQLite 与 WebSocket，无法在受限沙箱中自动执行，故以「可手动/CI 在具备真实
依赖时执行」的规程形式落地；自动化的关键回归测试见文末「自动化覆盖」一节。

---

## 1. 前置条件

1. Cloud Backend 已启动（默认 tRPC HTTP + WS 端点可达）。
2. 至少一个 Local Device 已上线并完成 agent 同步（`agentSync.sync`）。
3. 存在一个 `agentPool` 含目标 agent 的 channel（public/private/dm 任意）。
4. 目标 agent 状态为 `active` 或 `idle`。

## 2. 冒烟步骤（一来一回）

1. 以普通用户身份，向上述 channel 发送一条**不带 @mention** 的普通消息。
2. 观察前端（或 tRPC 订阅客户端）收到的 `agent.response.*` 事件序列。
3. 等待 agent 回复完成。

## 3. 期望结果（按契约逐条核对）

### 契约 0：触发策略

- [ ] 普通消息（无 @mention）即可触发：收到 `agent.response.accepted`。
- [ ] public / private / dm 三种 channel 行为一致（agentPool 内 agent 自动响应）。

### 契约 1：服务端权威消息 ID

- [ ] `accepted` 事件的 `payload.messageId` 即服务端预分配的权威 `agentMessageId`。
- [ ] 该 `agentMessageId` 贯穿：前端占位消息 id == 流式事件 `messageId` == 最终落库 `message_id`。
- [ ] 最终**唯一**一条 agent 气泡，无重复气泡、无 30s 超时误判、无占位残留。
- [ ] `accepted.inReplyTo` 指向触发的用户消息 id。

### 契约 2：类型化进度事件信封

- [ ] 思考阶段：收到 `agent.response.thinking`，正文区不出现思考文本。
- [ ] 工具阶段：收到 `agent.response.tool_use`，UI 进入工具态，正文区**不出现 JSON 文本**。
- [ ] 正文阶段：收到 `agent.response.streaming`，正文按增量追加。
- [ ] 完成：收到 `agent.response.completed`，占位收敛为完成态。
- [ ] 失败路径（可注入 adapter 失败模拟）：收到 `agent.response.failed`，占位进入失败态（`streamingPhase='failed'`）。

### 契约 3：channelId 归一化 / 跨进程契约

- [ ] 所有 `agent.response.*` 事件 `payload.channelId` 为**裸 id**（无 `realm:` 前缀），订阅过滤正常匹配，不丢事件。
- [ ] Local `getHistory` 返回 `{ role, content }`，对话历史中 user/assistant 角色正确，无 system 噪声。
- [ ] 落库 agent 消息 `sender_id` 为正确的 agentId（来自 `task.metadata.agentId`），非 `system`。

### 可观测性（correlation）

- [ ] 在 Backend / Local 日志中以 `agentMessageId` 为关键字可串联整条链路：
  - Backend：`Agent response accepted` → `Agent response enqueued` → `Agent response completed`
  - Local：`🚀 Processing agent task` → `💾 Agent response saved`
- [ ] 前端 `useAgentStreaming` 的 `Agent response event` 日志含同一 `messageId`。

## 4. 失败排查指引

- 收不到 `accepted`：检查 channel.agentPool 是否含该 agent、agent 状态、`shouldAgentRespond`。
- 收到 `accepted` 但无后续：检查 Local Device 是否在线、`message.process` 是否入队、metadata 是否带 `agentMessageId`。
- 正文出现 JSON 乱码：检查 Local `transmission-strategy` 是否按 `{phase,data}` 上报、Backend `pushChunk` 扇出是否正确。
- 出现重复气泡 / 占位不消失：检查前端占位 id 是否等于 `data.messageId`、落库 `message_id` 是否沿用权威 id。

---

## 5. 自动化覆盖（已落地的关键回归测试）

以下单元/集成测试在 CI 中自动执行，覆盖本次重构的核心契约：

- 契约 0/1 触发与权威 ID：
  `code/cloud/backend/src/infrastructure/events/handlers/message-agent-response.handler.test.ts`
  - public/private/dm 自动响应、idle 响应、状态/自回复/防循环护栏
  - `accepted.messageId === enqueue.metadata.agentMessageId`（占位 id == 落库 id 源头一致）
  - `accepted.channelId` 为裸 id
- 契约 2 类型化信封扇出：
  `code/cloud/backend/src/infrastructure/trpc/routers/message.router.test.ts`（`pushChunk fan-out`）
  - thinking → `agent.response.thinking`；content → `streaming`；tool → `tool_use`；status/usage 不扇出
  - channelId 归一化为裸 id
- 契约 3 channelId 归一化：
  `code/cloud/backend/src/common/channel-ref.test.ts`
  - `bareChannelId` / `qualifiedChannelId` / `isSameChannel` / `realmIdFromChannel`
- Local 流式与落库：
  `code/local/src/domain/agent-runtime/__tests__/device-processor.test.ts`
  - thinking 以 `{phase:'thinking',data:{text}}` 上报并支持重试
  - `saveResponse` 以顶层 `execution` 结构落库

> 手动 E2E 脚本入口（需真实依赖）：`code/local/src/test-full-e2e.ts`、`code/local/src/test-e2e-integration.ts`。
