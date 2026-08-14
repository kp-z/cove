# Phase 3 · AI 能力面 (C)

> **状态**: 未开始  
> **依赖**: Phase 1（执行包装稳定）；建议 Phase 2 基本可用  
> **Cherry 参考**: aiCore、provider-registry、MCP、Tool Registry — 只读模式

## 1. 目标

在 local 侧建立薄而统一的 Provider/Adapter 接口，再扩展 MCP/工具；配置与授权仍由 cloud 管理。

## 2. 非目标

- 不对齐 Cherry 的全量 Provider 列表
- 不把知识库/OCR 等桌面能力一次性搬入
- 不替换 Cove 消息/频道模型

## 3. 拟移植的模式

| Cherry 模式 | Cove 落点（预期） |
|-------------|-------------------|
| adapterFamily / endpoint 解析 | adapter 选择策略统一 |
| Tool Registry + MCP | local 工具注册；cloud 下发允许列表 |
| 中间件链（context/tools） | 可选的轻量 pipeline，避免过度抽象 |

## 4. 建议切片（草案）

1. 统一 `LlmAdapter` 接口（已有 Claude/OpenAI/CLI 收敛）
2. 一个 MCP 或内置 tool 的端到端样例
3. 失败重试/降级策略挂到 Phase 1 执行层

## 5. 开放问题

- MCP 进程由 local 托管还是可远端？
- Provider 密钥存在 cloud 还是仅 device 本地？

## 6. 完成标准

- [ ] 至少 2 个 adapter 走同一接口
- [ ] 一个可演示的 tool/MCP 路径
- [ ] `PROGRESS.md` 已更新
