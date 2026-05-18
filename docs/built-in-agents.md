# Built-in Agents System

## 概述

Cove 项目支持在系统初始化时自动创建和配置官方的内置 agent。这些 agent 被标记为 `scope: "built-in"`，在任何环境下安装 Cove 时都会自动创建。

## 功能特性

- ✅ **自动初始化**：在数据库初始化时自动创建内置 agent
- ✅ **幂等性**：可以安全地多次运行，不会重复创建
- ✅ **可配置**：通过配置文件定义内置 agent
- ✅ **持久化**：内置 agent 的配置存储在文件系统中
- ✅ **系统级别**：标记为 `built-in` scope，与用户创建的 agent 区分

## 内置 Agent 列表

### 1. 小张 (zhang) - 项目管理专家

- **ID**: `agent-zhang`
- **角色**: 项目管理
- **描述**: 负责协调团队、跟踪任务进度、管理项目资源
- **能力**:
  - 项目规划 (project-planning)
  - 任务管理 (task-management)
  - 进度跟踪 (progress-tracking)
  - 资源分配 (resource-allocation)
  - 团队协调 (team-coordination)

## 工作原理

### 1. 配置文件

内置 agent 的配置定义在：
```
code/backend/src/infrastructure/database/built-in-agents.config.ts
```

每个内置 agent 包含：
- 基本信息（ID、名称、显示名称、描述）
- 角色定义
- Persona 配置（语言风格、行为模式）
- 能力列表
- 标签

### 2. 初始化流程

1. **数据库初始化时触发**
   - 在 `DatabaseInitializer.initialize()` 中自动调用
   - 仅在数据库首次创建或为空时执行

2. **创建 Agent 记录**
   - 在数据库中创建 agent 记录
   - 设置 `scope: "built-in"`
   - 设置 `createdBy: "system"`

3. **创建文件结构**
   ```
   .cove/
   └── storage/
       └── agents/
           ├── agent-zhang.json          # Agent 元数据
           └── agent-zhang/
               ├── persona.yaml          # Persona 配置
               └── runtime.yaml          # 运行时配置（可选）
   ```

4. **幂等性保证**
   - 使用 `upsert` 操作，不会重复创建
   - 已存在的 agent 只更新必要字段
   - 不覆盖用户自定义的 runtime 配置

## 使用方法

### 自动初始化（推荐）

内置 agent 会在以下情况自动创建：

1. **首次启动 Cove**
   ```bash
   cd code/backend
   npm run dev
   ```

2. **数据库为空时**
   - 系统检测到数据库文件不存在或为空
   - 自动运行迁移并初始化内置 agent

### 手动测试

运行测试脚本验证内置 agent 初始化：

```bash
cd code/backend
npx tsx scripts/test-built-in-agents.ts
```

### 查询内置 Agent

通过 API 查询所有内置 agent：

```typescript
// 查询所有内置 agent
const builtInAgents = await prisma.agent.findMany({
  where: { scope: 'built-in' }
});
```

## 添加新的内置 Agent

### 1. 编辑配置文件

在 `built-in-agents.config.ts` 中添加新的 agent 配置：

```typescript
export const BUILT_IN_AGENTS: BuiltInAgentConfig[] = [
  // 现有的 agent...
  {
    id: 'agent-reviewer',
    name: 'reviewer',
    displayName: 'Code Reviewer',
    description: '代码审查专家，负责代码质量检查和最佳实践建议',
    role: 'code-reviewer',
    persona: {
      title: '代码审查专家',
      description: '我是代码审查专家，专注于代码质量、安全性和最佳实践。',
      language_style: {
        formality: 'professional',
        verbosity: 'detailed',
        preferred_language: 'zh-CN',
      },
      behavior: {
        proactive: true,
        ask_before_action: true,
      },
    },
    capabilities: [
      'code-review',
      'security-analysis',
      'best-practices',
      'performance-optimization',
    ],
    tags: ['code-review', 'quality', 'built-in'],
  },
];
```

### 2. 重新构建

```bash
cd code/backend
npm run build
```

### 3. 初始化

新的内置 agent 会在下次数据库初始化时自动创建，或者运行：

```bash
npx tsx scripts/test-built-in-agents.ts
```

## 配置选项

### DatabaseInitializer 选项

```typescript
const dbInitializer = new DatabaseInitializer({
  databasePath: string,        // 数据库文件路径
  migrationsPath: string,      // 迁移文件路径
  logger: ILogger,             // 日志记录器
  autoMigrate?: boolean,       // 是否自动运行迁移（默认 true）
  prisma?: PrismaClient,       // Prisma 客户端（用于内置 agent）
  storageRoot?: string,        // .cove 目录路径（用于内置 agent）
});
```

### 环境变量

- `AUTO_MIGRATE=false` - 禁用自动数据库迁移和内置 agent 初始化

## 文件结构

```
code/backend/src/infrastructure/database/
├── built-in-agents.config.ts           # 内置 agent 配置
├── built-in-agents-initializer.ts      # 初始化逻辑
└── database-initializer.ts             # 数据库初始化（集成内置 agent）

code/backend/scripts/
└── test-built-in-agents.ts             # 测试脚本

.cove/storage/agents/
├── agent-zhang.json                    # 小张的元数据
└── agent-zhang/
    ├── persona.yaml                    # Persona 配置
    └── runtime.yaml                    # 运行时配置
```

## 注意事项

1. **Scope 保护**
   - 内置 agent 的 `scope` 字段始终为 `built-in`
   - 更新时不会修改 scope，确保标记不变

2. **Runtime 配置**
   - 首次创建时生成默认 runtime.yaml
   - 已存在的 runtime.yaml 不会被覆盖
   - 用户可以自定义 adapter 和模型配置

3. **幂等性**
   - 可以安全地多次运行初始化
   - 已存在的 agent 只更新必要字段
   - 不会删除或覆盖用户数据

4. **错误处理**
   - 内置 agent 初始化失败不会阻止数据库初始化
   - 错误会被记录但不会抛出异常
   - 可以稍后手动重试初始化

## 故障排查

### 内置 Agent 未创建

1. **检查日志**
   ```bash
   # 查看启动日志中的初始化信息
   npm run dev
   ```

2. **手动运行测试**
   ```bash
   npx tsx scripts/test-built-in-agents.ts
   ```

3. **检查数据库**
   ```bash
   npx prisma studio
   # 查看 Agent 表，筛选 scope = 'built-in'
   ```

### 文件未创建

检查 `.cove/storage/agents/` 目录：

```bash
ls -la .cove/storage/agents/
ls -la .cove/storage/agents/agent-zhang/
```

### 权限问题

确保应用有权限创建 `.cove` 目录和文件：

```bash
chmod -R 755 .cove/
```

## 最佳实践

1. **命名规范**
   - Agent ID: `agent-{name}` (例如: `agent-zhang`)
   - Agent name: 小写英文 (例如: `zhang`)
   - Display name: 中文或英文显示名称 (例如: `小张`)

2. **Persona 设计**
   - 明确定义角色和职责
   - 设置合适的语言风格和行为模式
   - 提供清晰的能力列表

3. **版本控制**
   - 内置 agent 配置纳入版本控制
   - 文档化每个 agent 的用途和能力
   - 记录配置变更历史

4. **测试**
   - 添加新 agent 后运行测试脚本
   - 验证文件结构正确创建
   - 确认数据库记录正确

## 未来扩展

可能的扩展方向：

1. **更多内置 Agent**
   - 代码审查专家 (reviewer)
   - 测试工程师 (tester)
   - 文档编写者 (documenter)
   - DevOps 专家 (devops)

2. **Agent 模板**
   - 支持从模板创建自定义 agent
   - 预定义常见角色的配置

3. **动态配置**
   - 支持通过 API 启用/禁用内置 agent
   - 允许用户自定义内置 agent 的行为

4. **Agent 市场**
   - 社区贡献的 agent 配置
   - 一键安装第三方 agent
