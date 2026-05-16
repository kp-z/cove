# Agent Scope 设计文档

## 概述

Agent 实体已从基于职能的 `category` 分类重构为基于权限范围的 `scope` 分类，并新增 `projectIds` 字段支持项目关联。

## 变更内容

### 1. 字段变更

| 旧字段 | 新字段 | 说明 |
|--------|--------|------|
| `category: AgentCategory` | `scope: AgentScope` | 从职能分类改为权限范围分类 |
| - | `projectIds: string[]` | 新增：关联的项目 ID 列表 |
| - | `createdBy: string` | 新增：创建者 ID（数据库层面） |

### 2. Scope 类型定义

```typescript
export type AgentScope = 'built-in' | 'user' | 'project' | 'admin';
```

| Scope | 说明 | 使用场景 | projectIds 要求 |
|-------|------|----------|----------------|
| `built-in` | 系统内置 | Cove 预装的核心 agent（代码审查、测试生成等） | 可选 |
| `user` | 用户级别 | 用户个人创建，跨项目可用 | 可选 |
| `project` | 项目级别 | 特定项目专用，与项目生命周期绑定 | **必需**（至少一个） |
| `admin` | 管理员级别 | 系统管理、监控、审计等特权操作 | 可选 |

### 3. 业务规则

1. **Project scope 验证**：
   - 创建 `project` scope 的 agent 时，必须提供至少一个 `projectId`
   - 更新时不能移除 `project` scope agent 的最后一个项目关联

2. **项目关联管理**：
   - 使用 `linkToProject(projectId)` 添加项目关联
   - 使用 `unlinkFromProject(projectId)` 移除项目关联
   - 支持一个 agent 关联多个项目（特别适用于 `user` scope）

3. **默认值**：
   - 创建 agent 时，默认 `scope` 为 `user`
   - 默认 `projectIds` 为空数组 `[]`
   - 默认 `createdBy` 为 `system`

## API 变更

### Create Agent

```typescript
POST /trpc/agent.create
{
  "name": "string",
  "displayName": "string",
  "scope": "built-in" | "user" | "project" | "admin",  // 新增
  "projectIds": ["proj-1", "proj-2"],                  // 新增
  "createdBy": "string"
}
```

### Update Agent

```typescript
POST /trpc/agent.update
{
  "agentId": "string",
  "data": {
    "scope": "built-in" | "user" | "project" | "admin",  // 新增
    "projectIds": ["proj-1", "proj-2"],                  // 新增
    // ... 其他字段
  }
}
```

### Response Format

```json
{
  "agent_id": "agent-xxx",
  "name": "agent-name",
  "scope": "project",
  "project_ids": ["proj-1", "proj-2"],
  "created_by": "user-id",
  // ... 其他字段
}
```

## 数据库迁移

### Schema 变更

```sql
-- 旧 schema
CREATE TABLE Agent (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,  -- 旧字段
  ...
);

-- 新 schema
CREATE TABLE Agent (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'user',           -- 新字段
  projectIds TEXT NOT NULL DEFAULT '[]',        -- 新字段（JSON 数组）
  createdBy TEXT NOT NULL DEFAULT 'system',     -- 新字段
  ...
);
```

### 迁移步骤

1. 添加新字段（带默认值）
2. 迁移现有数据（所有现有 agent 变为 `user` scope）
3. 删除旧的 `category` 字段
4. 重建索引

## 使用示例

### 创建不同 scope 的 agent

```bash
# 1. User scope agent（默认）
curl -X POST '/trpc/agent.create' -d '{
  "name": "my-assistant",
  "displayName": "My Assistant",
  "createdBy": "user-123"
}'

# 2. Project scope agent（必须提供 projectIds）
curl -X POST '/trpc/agent.create' -d '{
  "name": "project-bot",
  "displayName": "Project Bot",
  "scope": "project",
  "projectIds": ["proj-1"],
  "createdBy": "user-123"
}'

# 3. Built-in agent
curl -X POST '/trpc/agent.create' -d '{
  "name": "code-reviewer",
  "displayName": "Code Reviewer",
  "scope": "built-in",
  "createdBy": "system"
}'

# 4. Admin agent
curl -X POST '/trpc/agent.create' -d '{
  "name": "system-monitor",
  "displayName": "System Monitor",
  "scope": "admin",
  "createdBy": "admin"
}'
```

### 管理项目关联

```bash
# 添加项目关联
curl -X POST '/trpc/agent.update' -d '{
  "agentId": "agent-xxx",
  "data": {
    "projectIds": ["proj-1", "proj-2", "proj-3"]
  }
}'

# 更改 scope
curl -X POST '/trpc/agent.update' -d '{
  "agentId": "agent-xxx",
  "data": {
    "scope": "admin"
  }
}'
```

## 架构优势

1. **清晰的权限边界**：通过 scope 明确定义 agent 的可见性和访问范围
2. **灵活的项目关联**：支持一个 agent 服务多个项目
3. **便于实现 RBAC**：scope 可以直接映射到权限控制策略
4. **支持多租户**：为未来的多租户架构打下基础
5. **生命周期管理**：project scope 的 agent 可以随项目归档而归档

## 未来扩展

1. **权限控制**：基于 scope 实现细粒度的访问控制
2. **可见性过滤**：根据用户角色和项目成员关系过滤 agent 列表
3. **自动归档**：项目归档时自动处理关联的 project scope agent
4. **跨项目共享**：user scope agent 可以在多个项目间共享使用
5. **审计日志**：记录 scope 和 projectIds 的变更历史

## 测试覆盖

- ✅ 创建不同 scope 的 agent
- ✅ Project scope 必须提供 projectIds 的验证
- ✅ 更新 agent 的 scope 和 projectIds
- ✅ 防止移除 project scope agent 的最后一个项目关联
- ✅ 数据库迁移和 Prisma 客户端生成
- ✅ API 端点的完整功能测试

## 相关文件

- `src/domain/models/agent/agent.entity.ts` - Agent 实体定义
- `src/application/services/agent/agent-crud.service.ts` - CRUD 服务
- `src/infrastructure/repositories/hybrid-agent.repository.ts` - 数据持久化
- `src/infrastructure/trpc/routers/agent.router.ts` - API 路由
- `prisma/schema.prisma` - 数据库 schema
