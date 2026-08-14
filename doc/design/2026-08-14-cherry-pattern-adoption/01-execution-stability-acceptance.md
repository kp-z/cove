# S1 Abort · 手工验收清单

> 前置：本地同时运行 **backend**、**frontend**、**local device**；登录后进入有 Agent 的 channel。  
> 来源：[规格](./01-execution-stability.md) · [计划](./01-execution-stability-plan.md) · 终审修复见 `.superpowers/sdd/final-fix-report.md`

## 步骤

1. 启动三端（backend、frontend、local device）。
2. 发送用户消息，**等到** Agent 出现权威进度（`accepted` / thinking / tool_use / responding）——此时应出现可用的 **Stop**（provisional pending 阶段不应假停止）。
3. 点击 **Stop**，观察 local 日志（进程/请求取消）与 UI（`aborted`、停止 loading）。
4. （可选）再点 Stop；或对未知 `agentMessageId` 调 abort，验证幂等 / no-op。
5. 确认同一次用户消息**没有**因 abort 被云端重新 `message.process` 派发。

## 验收项

| # | 检查项 | 通过 |
|---|--------|------|
| 1 | 进程/请求停止（CLI SIGTERM 或 API AbortSignal） | ☐ |
| 2 | UI 进入 `aborted`，停止转圈；已流式内容仍可见（若有） | ☐ |
| 3 | 再点 Stop 幂等（无报错、无重复副作用） | ☐ |
| 4 | 未知 `agentMessageId` abort 为 no-op | ☐ |
| 5 | 日志可关联 `agentMessageId`（及 `userMessageId`） | ☐ |
| 6 | 云端队列无因 abort 重派同一 turn | ☐ |
| 7 | （安全抽查）abort 不会打到其他 realm 的在线设备 | ☐ |

## 通过后

1. 在 [PROGRESS.md](./PROGRESS.md) 将 Phase 1 标为 **已完成**，并更新「会话交接摘要」。
2. 由用户授权后再 git commit（先核对工作区是否含无关变更）。
3. 可选：开 Phase 2（设备租约 / 双 WS）。
