# Cove 项目文档

欢迎来到 Cove 项目文档中心。本目录包含项目的完整文档体系。

## 📚 文档结构

```
docs/
├── development/          # 开发文档
├── features/            # 功能实现文档
├── report/              # 评估报告
├── superpowers/         # 超能力功能文档
├── v4/                  # V4 架构文档
└── README.md            # 本文件
```

## 🛠️ 开发文档

**路径**: [development/](./development/)

包含开发环境配置、调试工具、问题修复等技术文档。

**主要内容**：
- Chrome DevTools + MCP 调试环境配置
- CORS 跨域问题修复说明
- 开发环境启动脚本

**适用场景**：
- 搭建开发环境
- 调试前端应用
- 解决常见技术问题

## ✨ 功能实现文档

**路径**: [features/](./features/)

包含各个功能模块的设计文档和实现说明。

**后端功能** ([features/backend/](./features/backend/))：
- Agent Scope 重构设计
- Claude Code CLI 适配器
- 性能优化总结

**前端功能** ([features/frontend/](./features/frontend/))：
- Agent 页面二层分类功能
- tRPC 集成测试

**适用场景**：
- 了解功能设计思路
- 查看实现细节
- 参考类似功能开发

## 📊 评估报告

**路径**: [report/](./report/)

包含架构评估、代码审查等专业报告。

**主要报告**：
- `alice/backend-architecture-assessment.md` - 后端架构全面评估（9个维度）
- `alice/directory-restructure-plan.md` - 目录结构整理方案
- `frontend_engineer/frontend-code-review-2026-05-15.md` - 前端代码审查

**适用场景**：
- 了解项目架构质量
- 查看改进建议
- 制定优化计划

## 🚀 超能力功能

**路径**: [superpowers/](./superpowers/)

包含 Cove 项目的高级功能和创新特性文档。

**适用场景**：
- 探索高级功能
- 了解创新特性

## 🏗️ V4 架构文档

**路径**: [v4/architecture/](./v4/architecture/)

包含 Cove V4 版本的完整架构设计文档。

**架构分层**：
- **Backend**
  - [01-domain/](./v4/architecture/backend/01-domain/) - 领域层（实体、值对象、领域服务）
  - [02-application/](./v4/architecture/backend/02-application/) - 应用层（应用服务、运行时组件）
  - [03-infrastructure/](./v4/architecture/backend/03-infrastructure/) - 基础设施层（API、数据库、CLI）
- **Frontend**
  - [04-presentation/](./v4/architecture/frontend/04-presentation/) - 表现层（UI 组件、状态管理）

**适用场景**：
- 理解系统架构
- 查看领域模型定义
- 了解技术选型

## 🔍 快速导航

### 我想...

**搭建开发环境** → [development/debugging.md](./development/debugging.md)

**了解某个功能如何实现** → [features/](./features/)

**查看架构设计** → [v4/architecture/](./v4/architecture/)

**了解项目质量状况** → [report/alice/backend-architecture-assessment.md](./report/alice/backend-architecture-assessment.md)

**解决 CORS 问题** → [development/cors-fix.md](./development/cors-fix.md)

**了解 Agent Scope 设计** → [features/backend/agent-scope-design.md](./features/backend/agent-scope-design.md)

## 📝 文档规范

### 命名规范
- 使用小写字母和连字符：`agent-scope-design.md`
- 避免使用大写和下划线：~~`AGENT_SCOPE_DESIGN.md`~~
- 保持文件名简洁且描述性强

### 目录组织
- **development/** - 开发环境、调试、问题修复
- **features/** - 功能设计和实现说明
- **report/** - 评估报告和审查结果
- **v4/** - 架构设计文档

### 文档更新
- 新增开发文档 → `development/`
- 新增功能文档 → `features/backend/` 或 `features/frontend/`
- 新增评估报告 → `report/<author>/`
- 更新架构设计 → `v4/architecture/`

## 🔗 相关资源

- **项目仓库**: https://github.com/kp-z/cove
- **代码目录**: [../code/](../code/)
- **根目录 README**: [../README.md](../README.md)

## 📮 反馈与贡献

如发现文档问题或有改进建议，请：
1. 在相关文档中添加注释
2. 联系文档维护者
3. 提交 Pull Request

---

**最后更新**: 2026-05-15  
**维护者**: @Alice (架构与文档专家)
