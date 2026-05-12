# Backend API 实现命令集

> **创建日期**: 2026-05-12
> **维护者**: @Alice
> **用途**: 给后端 AI（Claude Code / Cursor 等）的标准化命令模板，用于实现 Channel 对话功能所需的 Backend API。

## 文件清单

| 文件 | 用途 | 何时使用 |
|------|------|---------|
| [00-总纲.md](./00-总纲.md) | 架构约束、依赖规则、目录结构、防走偏检查清单 | **必先发** —— 建立全局上下文 |
| [01-message-channel.md](./01-message-channel.md) | Message + Channel 基础 CRUD | P0 第一步 |
| [02-thread.md](./02-thread.md) | Thread 管理 | P0 第二步 |
| [03-websocket.md](./03-websocket.md) | WebSocket 实时推送 | P0 第三步 |
| [04-task.md](./04-task.md) | Task 管理（消息→任务、claim、状态流转） | P1 |
| [05-agent.md](./05-agent.md) | Agent CRUD + 配置管理 + 生命周期 | P1 |

## 使用方法

1. **首次会话**：把 [00-总纲.md](./00-总纲.md) 完整内容发给后端 AI
2. **逐个模块**：按顺序发送 01 → 05，**一次只发一个**
3. **每个模块开始前**，要求 AI 先输出：
   - 将创建/修改的文件清单
   - 每个文件的职责（一句话）
   - 文件之间的依赖关系图
4. **确认后再写代码**
5. 实施过程中如发现 AI 走偏，复述总纲中的"防走偏检查清单"

## 核心原则

- **强约束架构边界** —— 用"禁止"+"必须"列表把 AI 圈在正确的目录里
- **依赖倒置** —— Service 只依赖 Protocol，Repository/Adapter 通过 DI 注入
- **TDD 顺序** —— Domain 测试（无依赖最快）→ Service（mock）→ Infrastructure
- **小步快走** —— 一次一个模块，先输出计划再写代码
