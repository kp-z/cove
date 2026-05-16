# 功能实现文档

本目录包含 Cove 项目各个功能模块的设计文档和实现说明。

## 目录结构

```
features/
├── backend/          # 后端功能设计文档
└── frontend/         # 前端功能实现文档
```

## 后端功能文档

### 架构设计
- [agent-scope-design.md](./backend/agent-scope-design.md) - Agent Scope 重构设计
  - 从 `category` 改为 `scope` 的权限范围分类
  - 新增 `projectIds` 字段支持项目关联
  - 业务规则和 API 变更
  - 数据库迁移方案

### 适配器与集成
- [claude-code-cli-adapter.md](./backend/claude-code-cli-adapter.md) - Claude Code CLI 适配器
  - CLI 适配器架构设计
  - 命令映射和参数转换
  - 错误处理机制

### 性能优化
- [optimization-summary.md](./backend/optimization-summary.md) - 后端性能优化总结
  - 数据库查询优化
  - 缓存策略
  - 并发处理改进

## 前端功能文档

### UI 功能
- [agent-two-tier-classification.md](./frontend/agent-two-tier-classification.md) - Agent 页面二层分类功能
  - 第一层：按 scope 分类（All, Built-in, User, Project, Admin）
  - 第二层：按 tags 分类（动态显示）
  - 实现细节和使用方式

### 集成测试
- [test-trpc-integration.md](./frontend/test-trpc-integration.md) - tRPC 集成测试
  - tRPC 客户端配置
  - 前后端类型安全集成
  - 测试用例和验证

## 文档规范

### 命名规范
- 使用小写字母和连字符：`agent-scope-design.md`
- 功能描述性命名，避免缩写

### 文档结构
每个功能文档应包含：
1. **概述** - 功能简介和背景
2. **设计方案** - 架构设计和技术选型
3. **实现细节** - 关键代码和配置
4. **使用方式** - 使用示例和注意事项
5. **测试验证** - 测试用例和验证步骤

## 相关资源

- [开发文档](../development/) - 开发环境和调试工具
- [V4 架构文档](../v4/architecture/) - 完整架构设计
- [评估报告](../report/) - 架构评估和代码审查
