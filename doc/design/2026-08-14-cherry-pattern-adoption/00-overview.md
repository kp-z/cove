# Phase 0 · 总览与契约

> **状态**: 进行中  
> **日期**: 2026-08-14  
> **策略**: 模式移植（Pattern Adoption）

## 1. 背景

Cherry Studio 是成熟的 Electron 桌面 AI 客户端；Cove 是云端编排 + 本地设备执行的多 Agent 协作平台。二者产品形态不同，但 Cherry 在以下方面更成熟，值得**按模式**迁入 Cove：

- 执行/流生命周期（注册、abort、重连、监听）
- 服务生命周期与状态纪律
- Provider / 工具 / MCP 抽象
- 工程治理（测试分层、目录封闭、可观测）

## 2. 移植原则

1. **只借模式，不借仓库**：不依赖 `@cherrystudio/*`，不复制 Electron Main/IPC。
2. **保住云边模型**：Prisma/tRPC 云端为真相源；LLM 调用在 `code/local`。
3. **前端保持 Cove 设计**：不引入 Cherry UI；多端（桌面/手机）后置。
4. **契约先行**：先冻结执行 ID、状态机、事件，再改实现。
5. **小步可验证**：每阶段至少一个可演示的失败场景被关闭。

## 3. 目标架构（逻辑）

```
[Frontend] --tRPC/WS--> [Cloud Backend]
                           |  message-orchestrator
                           |  device 认领 / 状态投影
                           v
                      [Local Device]
                           |  execution registry (借 Cherry Stream 模式)
                           |  adapter / provider (借 Cherry AI 抽象)
                           v
                        LLM / CLI / MCP
```

Cherry 对照（只读参考，非依赖）：

| Cove 概念 | Cherry 可借鉴模式 |
|-----------|-------------------|
| Local 执行注册表 | `AiStreamManager`（Open/Attach/Detach/Abort） |
| 设备/服务生命周期 | Main `core` lifecycle + IoC 分阶段 bootstrap |
| Adapter 统一接口 | provider-registry + adapterFamily |
| 工具扩展 | Tool Registry + MCP runtime |
| 工程纪律 | 封闭顶层目录、Vitest project 分层 |

## 4. Phase 0 交付物

- [x] 进度目录与 `PROGRESS.md`
- [ ] 失败路径审计清单（见下节模板）
- [ ] 最小稳定契约草案（执行/设备/事件）
- [ ] Phase 1 最小切片确认

## 5. 失败路径审计模板

对每条路径记录：现状、失败表现、是否可恢复、缺口。

| ID | 路径 | 现状 | 失败表现 | 可恢复? | 缺口归属 A/B/C/D |
|----|------|------|----------|---------|------------------|
| F1 | 用户发消息 → orchestrator → 派发 device | TBD | | | |
| F2 | device 认领任务 → 启动 adapter | TBD | | | |
| F3 | adapter 流式输出 → 回写 cloud | TBD | | | |
| F4 | 用户/系统 abort 进行中执行 | TBD | | | |
| F5 | device 断线 / 进程崩溃 | TBD | | | |
| F6 | cloud 重启后状态一致性 | TBD | | | |

## 6. 最小稳定契约（草案，待讨论冻结）

待 Phase 0 讨论后写入正式字段表。预期至少包含：

- `executionId`：全局唯一，云边共用
- `deviceId` / `realmId` / `channelId` 关联
- 状态枚举：`queued | running | streaming | succeeded | failed | aborted | orphaned`
- 控制：`abort(executionId)`、幂等
- 事件：`execution.started | .chunk | .completed | .failed | .aborted`（名称可调）

## 7. 下一阶段入口

审计与契约冻结后进入 [01-execution-stability.md](./01-execution-stability.md)。
