# Phase 0 · 失败路径审计（代码事实）

> **日期**: 2026-08-14  
> **范围**: message → device → adapter → 回写  
> **结论摘要**: 流式回写与 `agentMessageId` 契约扎实；**abort / 租约认领 / 在飞执行注册表** 是最大缺口。

## 1. 现网主路径（Agent 聊天）

```
Frontend message.send
  → MessageCrudService (message.created)
  → MessageAgentResponseHandler
       · mint agentMessageId
       · agent.response.accepted
       · cloud MessageOrchestrator.enqueue
  → DeviceProcessor
       · pick online device
       · WS message.process
  → Local TrpcWebSocketClient → DeviceClient
  → Local MessageOrchestrator → DeviceProcessor
  → Adapter (默认 claude-cli)
  → ResilientTransmissionStrategy
       · pushChunk / saveResponse / reportFailure
  → agent.response.* → Frontend useAgentStreaming
```

**注意**: 另有一套 workflow `Task`（claim/cancel）与 legacy `AdapterExecutor.cancelTask`，**不是**当前聊天主路径。

## 2. 审计表

| ID | 路径 | 现状 | 失败表现 | 可恢复? | 归属 |
|----|------|------|----------|---------|------|
| F1 | 发消息 → 派发 device | 在线设备列表选一台；realm 不匹配可回退任意设备 | 无设备则失败重入队 | 部分（重试） | B |
| F2 | device 接收 → 跑 adapter | local 队列 + DeviceProcessor | adapter 失败 → reportFailure / 本地重试 | 部分 | A/C |
| F3 | 流式回写 cloud | ResilientTransmissionStrategy + agentMessageId | chunk 失败可终态重试 | 较强 | —（已扎实） |
| F4 | abort 进行中执行 | **主路径无 abort**；UI TODO stop | 只能等跑完或 30m 云端超时 | 否 | **A** |
| F5 | device 断线/崩溃 | tRPC WS 有重连；lifecycle 另有 raw WS（双栈） | 处理中任务可能卡在 PROCESSING | 弱 | **B** |
| F6 | cloud 完成信号 | 靠 DB 轮询 agent 行（30m）；`handleDeviceResponse` 仅测试 | 超时重派可能重复 process | 弱 | A/B |
| F7 | 幂等认领 | **无 lease/claim**；fire-and-forget | 重派可能双跑 | 否 | **B** |
| F8 | 在飞执行注册表 | 无；身份靠 agentMessageId + queue task.id；ExecutionEntity 未接入 | 无法按执行取消/查询 | 否 | **A** |
| F9 | Adapter 统一抽象 | 有 LlmAdapter；CLI/API 能力分裂 | fallback 列表可试 | 部分 | C |
| F10 | 工程双轨 | DeviceClient vs legacy websocket-client/AdapterExecutor | 取消能力留在死路径 | 混淆 | D |

## 3. 已扎实（勿重复造）

1. `agentMessageId` 贯穿 accepted → chunk → completed/failed  
2. 类型化 `phase` 流式信封  
3. Cloud 不跑 LLM（Device-only）  
4. pushChunk 失败隔离 + 终态重试  
5. `agent.response.failed` 可达 UI  
6. 云端 30m 等待（刻意减轻重复派发）

## 4. Cherry 可借模式 ↔ Cove 落点

| Cherry 模式 | 解决的问题 | Cove 建议落点 | Electron 需剥离 |
|-------------|------------|---------------|-----------------|
| AiStreamManager Open/Attach/Detach/Abort | 在飞流可管可取消；退订≠中止 | `code/local` execution registry，key=`agentMessageId` | WebContents/IPC |
| Persist-before-notify listeners | UI 完成早于落盘 | 终态：先 saveResponse 成功语义，再 completed 事件（已接近，需收紧） | WebContentsListener |
| Single-pass + AbortSignal | 清晰 turn 边界 | adapter 包装统一 AbortSignal | 无 |
| Phased lifecycle + disposables | 启动/ teardown 有序 | 收敛 DeviceClient 启动；消掉双 WS | app.whenReady |
| provider/endpoint/adapterFamily | 选择不靠猜 | Phase 3 收敛 AdapterManager | 无 |

## 5. Phase 1 切片候选（待选）

| 切片 | 内容 | 关闭的审计项 | 风险 |
|------|------|--------------|------|
| **S1（推荐）** | Local 在飞注册表 + abort；cloud/前端 stop → 下发 cancel | F4, F8 | 需接 CLI/API abort |
| S2 | 完成信号改为推送 ACK，弱化 30m 轮询 | F6 | 动云端等待逻辑 |
| S3 | 设备租约 claim + 防双派 | F7, F1 | 偏 B，可 Phase 2 |

推荐 **先 S1**：直接补上用户可感知的「停止生成」，并建立后续 B/C 都依赖的执行身份。
