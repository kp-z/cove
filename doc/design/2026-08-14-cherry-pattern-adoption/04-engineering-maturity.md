# Phase 4 · 工程成熟度 (D) · 贯穿

> **状态**: 贯穿（非独立末尾大爆炸）  
> **Cherry 参考**: Vitest 多 project、目录治理、可观测 — 只读模式

## 1. 目标

让 A/B/C 的每次改动可测、可观测、可交接；降低回归与上下文丢失。

## 2. 贯穿清单（S1 进度）

| 项 | Phase 0 | Phase 1 (S1) | Phase 2 | Phase 3 |
|----|---------|--------------|---------|---------|
| 更新 `PROGRESS.md` 交接摘要 | ☑ | ☑ | ☐ | ☐ |
| 单元测试覆盖新状态机/注册表 | — | ☑（registry/abort 聚焦） | ☐ | ☐ |
| 结构化日志带 `executionId`/`deviceId` | ☐ | ☑（`agentMessageId` / `userMessageId`） | ☐ | ☐ |
| 避免双轨实现（删旧或标 deprecated） | ☐ | 部分（未启用 legacy AdapterExecutor） | ☐ | ☐ |
| 文档与代码路径一致 | ☑ | ☑ | ☐ | ☐ |

## 3. S1 已知工程债务（可后置）

- 既有 local「chunk 重试」单测失败（与 abort 无关）
- 个别 backend router 既有断言失败（如 pushChunk status）
- frontend lockfile / Vitest 环境偶发不稳定
- API adapter abort 单测、`startConversation` abort、abort reason 透传

## 4. 后置评估（不阻塞 A/B）

- 是否合并为 pnpm monorepo
- 是否引入统一 metrics（Prometheus 已有 monitor 目录可复用）
- 前端 e2e 是否覆盖 abort/断线场景

## 5. 完成标准（整体改造线）

- [ ] A/B 核心路径有自动化回归
- [x] 新人只读 `PROGRESS.md` 能接上当前焦点（S1 待验收）
- [ ] 无长期 `xxx-new` / 双实现并存
