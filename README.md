# Cove

**AI Agent 协作平台**

Cove 是一个统一管理和编排 AI Agent 的协作平台，支持多 Agent 协同工作、工作流编排和任务管理。

## 特性

- 🤖 **Agent 管理** - 统一管理多个 AI Agent
- 📋 **任务编排** - 可视化工作流设计
- 👥 **团队协作** - 多 Agent 协同工作
- 📊 **实时监控** - 执行状态实时追踪
- 🔄 **框架集成** - 支持 Claude Code、OpenClaw 等框架

## 架构

```
docs/v4/architecture/         # V4 架构设计文档
code/backend/src/domain/      # 领域层：实体、值对象、领域服务
code/backend/src/application/ # 应用层：用例服务、运行时编排
code/backend/src/infrastructure/ # 基础设施层：tRPC、Repository、数据库、Agent Runtime
code/frontend/src/            # 表现层：React 页面、功能域、共享组件
deploy-toolkit/               # 部署协议和 CLI 工具
```

## 技术栈

**后端**:
- TypeScript + Node.js
- tRPC HTTP + WebSocket
- Prisma + SQLite
- Vitest
- 混合持久化：SQLite 存索引和元数据，`.cove/storage` 存实体 JSON 内容

**前端**:
- React 19 + TypeScript
- Vite
- React Router
- TanStack Query
- tRPC client
- Zustand
- MSW 开发和测试 Mock

**部署工具**:
- TypeScript CLI
- `cove.deploy.json` 协议配置
- Docker/Nginx 配置生成和校验

## 快速开始

> 当前实现位于 `code/backend` 和 `code/frontend`。根目录文档和 `docs/v4` 是架构与设计资料。

```bash
# 克隆项目
git clone https://github.com/kp-z/cove.git
cd cove

# 后端依赖和数据库客户端
cd code/backend
npm install
npm run db:generate

# 启动后端，默认监听 http://localhost:3001
npm run dev

# 另开终端启动前端，默认监听 http://localhost:5175
cd ../frontend
npm install
npm run dev
```

后端可用端点：

- tRPC HTTP: `http://localhost:3001/trpc`
- tRPC WebSocket: `ws://localhost:3001`
- Health: `http://localhost:3001/health`
- API Docs: `http://localhost:3001/docs`（仅开发环境）

## `.cove` 数据目录

项目根目录下的 `.cove/` 是当前统一数据目录，用于保存本地运行时数据和 Agent 配置。后端默认从项目根目录读取它；如需显式指定，可设置 `COVE_PROJECT_ROOT`。

```
.cove/
├── agents/      # Agent 配置
├── opp/         # OKR/规划资料
├── config/      # 本地配置
├── database/    # SQLite 数据库，默认 .cove/database/cove.db
├── storage/     # 实体 JSON 内容
├── cache/
├── logs/
├── temp/
└── metadata/
```

后端持久化策略：

- Prisma/SQLite 保存可查询字段、索引和元数据。
- `.cove/storage` 保存完整实体内容，例如 channel、message、project、user 等 JSON 文件。
- 数据目录已从历史上的多个 `.cove` 位置迁移到项目根目录，迁移记录见 [MIGRATION.md](MIGRATION.md)。

## 常用命令

后端：

```bash
cd code/backend
npm run dev
npm run build
npm test
npm run type-check
npm run db:migrate
npm run db:generate
```

前端：

```bash
cd code/frontend
npm run dev
npm run build
npm run lint
npm test
```

部署工具：

```bash
cd deploy-toolkit/cli
npm install
npm run build
npm run dev validate
```

## 文档

- [架构文档](docs/v4/architecture/)
- [代码实现说明](code/README.md)
- [后端说明](code/backend/README.md)
- [部署工具](deploy-toolkit/README.md)
- [`.cove` 迁移记录](MIGRATION.md)

## 开源协议

MIT License

---

Made by Cove Team
