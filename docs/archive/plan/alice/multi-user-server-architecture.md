# Cove 多用户系统架构规划

**作者**: Alice  
**日期**: 2026-05-18  
**状态**: 规划中 (Planning)  
**版本**: v2.0 - 调整为 Server + Device 方案

---

## 方案调整说明

**用户反馈**：保留 Server 名称，新增 Device 实体

**调整内容**：
- Server = 工作空间/团队空间（顶层容器）
- Device = 物理设备/计算资源（新增实体）
- 职责清晰：Server 专注逻辑隔离，Device 专注物理资源

---

## 1. 问题分析

### 1.1 当前状态

通过代码分析发现：

1. **Server Entity 存在但未使用**
   - 文件位置：`src/domain/models/server/server.entity.ts`
   - 定义完整：包含资源管理、网络配置、安全设置、限制等
   - **但在 Prisma Schema 中不存在**：没有 Server 表
   - **其他实体未引用**：Channel, Message, Agent, Project 等都没有 `server_id` 字段

2. **当前架构是单 Server 模式**
   - Project 是顶层容器
   - Channel, Agent, Task 等都直接关联到 Project
   - 没有 Server 层的隔离

3. **权限模型不完整**
   - User 通过 Member 表加入 Channel
   - 但缺少 Server 级别的成员管理
   - 没有 Server 级别的权限控制

### 1.2 理想架构

```
Server (服务器/工作空间)
  ├── Members (成员管理)
  │   ├── Owner (所有者)
  │   ├── Admin (管理员)
  │   └── Member (普通成员)
  ├── Projects (项目)
  │   ├── Channels (频道)
  │   ├── Agents (智能体)
  │   └── Tasks (任务)
  └── Settings (设置)
      ├── Permissions (权限)
      ├── Resources (资源限制)
      └── Security (安全配置)
```

**核心理念**：
- **Server 是最顶层的隔离边界**（类似 Slack Workspace, Discord Server）
- **所有资源都属于某个 Server**
- **用户通过 Server 成员身份访问资源**
- **支持多租户**：一个用户可以属于多个 Server

---

## 2. 架构设计

### 2.1 Server 的定位

**Server 应该是什么？**

根据当前 Entity 定义，Server 被设计为"运行 Agent 的计算资源"，但这个定位**不适合多用户系统**。

**建议重新定位**：

```typescript
// 当前定义（不合适）
Server = 物理/虚拟服务器 + 资源管理 + 网络配置

// 建议定义（适合多用户）
Server = 工作空间 (Workspace) + 成员管理 + 权限控制
```

**两种方案对比**：

| 方案 | Server 定位 | 优点 | 缺点 |
|------|------------|------|------|
| **方案 A：重命名为 Workspace** | 工作空间/团队空间 | 语义清晰，符合多用户场景 | 需要重构现有 Server Entity |
| **方案 B：保留 Server 名称** | 服务器实例（但语义扩展） | 不需要重命名 | 语义混淆（Server 既是物理概念又是逻辑概念） |

**最终方案：保留 Server 名称 + 新增 Device 实体**

根据用户反馈，采用以下方案：
- **Server** 重新定位为工作空间/团队空间（移除物理资源细节）
- **Device** 新增实体，承接物理设备和资源管理
- 优势：保留 Server 名称，职责更清晰，符合直觉

---

### 2.2 实体关系重构

#### 2.2.1 新的层级结构

```
User (用户)
  └── ServerMember (服务器成员)
        └── Server (服务器/工作空间)
              ├── Projects (项目)
              │     ├── Channels (频道)
              │     ├── Agents (智能体)
              │     └── Tasks (任务)
              ├── Devices (设备) - 新增
              │     └── Agent 运行实例
              └── Settings (设置)
```

#### 2.2.2 实体字段变更

**重构实体：Server**

```typescript
// Server 重新定位为工作空间（移除物理资源细节）
interface ServerEntityProps {
  readonly server_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly owner_id: string;
  readonly status: 'active' | 'suspended' | 'archived';
  readonly visibility: 'public' | 'private';
  readonly settings: WorkspaceSettings;
  readonly limits: WorkspaceLimits;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface WorkspaceSettings {
  readonly allow_public_channels: boolean;
  readonly allow_private_channels: boolean;
  readonly allow_dm: boolean;
  readonly require_approval: boolean;
  readonly default_member_role: 'member' | 'guest';
}

interface WorkspaceLimits {
  readonly max_members: number;
  readonly max_projects: number;
  readonly max_channels: number;
  readonly max_agents: number;
  readonly max_storage_gb: number;
}
```

**新增实体：WorkspaceMember**

```typescript
interface WorkspaceMemberEntityProps {
  readonly member_id: string;
  readonly workspace_id: string;
  readonly user_id: string;
  readonly role: 'owner' | 'admin' | 'member' | 'guest';
  readonly status: 'active' | 'invited' | 'suspended';
  readonly permissions: string[]; // ['manage_projects', 'manage_members', ...]
  readonly joined_at: Date;
  readonly invited_by?: string;
}
```

**修改现有实体**

1. **Project**
   ```typescript
   interface ProjectEntityProps {
     // 新增
     readonly workspace_id: string;
     
     // 保留
     readonly project_id: string;
     readonly name: string;
     readonly owner_id: string;
     // ...
   }
   ```

2. **Channel**
   ```typescript
   interface ChannelEntityProps {
     // 新增
     readonly workspace_id: string;
     
     // 保留
     readonly channel_id: string;
     readonly project_id?: string; // 可选：Channel 可以不属于 Project
     // ...
   }
   ```

3. **Agent**
   ```typescript
   interface AgentEntityProps {
     // 新增
     readonly workspace_id?: string; // 可选：built-in agents 不属于任何 workspace
     
     // 保留
     readonly agent_id: string;
     readonly scope: 'built-in' | 'workspace' | 'project' | 'user';
     // ...
   }
   ```

4. **Message, Task** 等
   - 通过 Channel/Project 间接关联到 Workspace
   - 不需要直接添加 `workspace_id` 字段

---

### 2.3 权限模型

#### 2.3.1 三层权限体系

```
1. Workspace 级别权限
   - manage_workspace (管理工作空间设置)
   - manage_members (管理成员)
   - manage_projects (创建/删除项目)
   - manage_channels (创建/删除频道)
   - manage_agents (创建/删除 Agent)

2. Project 级别权限
   - manage_project (管理项目设置)
   - manage_channels (管理项目内的频道)
   - manage_tasks (管理任务)

3. Channel 级别权限
   - send_messages (发送消息)
   - manage_members (管理频道成员)
   - manage_threads (管理讨论串)
```

#### 2.3.2 角色与权限映射

| 角色 | Workspace 权限 | Project 权限 | Channel 权限 |
|------|---------------|-------------|-------------|
| **Owner** | 全部 | 全部 | 全部 |
| **Admin** | 除 delete_workspace 外全部 | 全部 | 全部 |
| **Member** | 创建 Project/Channel | 自己创建的 Project | 加入的 Channel |
| **Guest** | 无 | 被邀请的 Project | 被邀请的 Channel |

#### 2.3.3 权限检查流程

```typescript
// 伪代码
async function checkPermission(
  userId: string,
  resource: 'workspace' | 'project' | 'channel',
  resourceId: string,
  action: string
): Promise<boolean> {
  // 1. 获取资源所属的 workspace
  const workspaceId = await getWorkspaceId(resource, resourceId);
  
  // 2. 检查用户是否是 workspace 成员
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member) return false;
  
  // 3. 检查角色权限
  if (member.role === 'owner') return true;
  if (member.role === 'admin' && action !== 'delete_workspace') return true;
  
  // 4. 检查具体权限
  return member.permissions.includes(action);
}
```

---

### 2.4 数据库 Schema 变更

#### 2.4.1 新增表

```prisma
// Workspace 表
model Workspace {
  id            String   @id
  name          String
  displayName   String
  description   String?
  ownerId       String
  status        String   // active | suspended | archived
  visibility    String   // public | private
  settingsPath  String   // 指向 .cove/storage/workspaces/{id}/settings.json
  createdAt     DateTime
  updatedAt     DateTime

  members       WorkspaceMember[]
  projects      Project[]
  channels      Channel[]
  agents        Agent[]

  @@index([ownerId])
  @@index([status])
}

// WorkspaceMember 表
model WorkspaceMember {
  id            String   @id
  workspaceId   String
  userId        String
  role          String   // owner | admin | member | guest
  status        String   // active | invited | suspended
  permissions   String   @default("[]") // JSON array
  joinedAt      DateTime
  invitedBy     String?

  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  user          User      @relation(fields: [userId], references: [id])

  @@unique([workspaceId, userId])
  @@index([workspaceId])
  @@index([userId])
  @@index([status])
}
```

#### 2.4.2 修改现有表

```prisma
// Project 表 - 添加 workspaceId
model Project {
  id          String   @id
  workspaceId String   // 新增
  name        String
  // ...

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  
  @@index([workspaceId])
}

// Channel 表 - 添加 workspaceId
model Channel {
  id          String   @id
  workspaceId String   // 新增
  projectId   String?  // 改为可选
  // ...

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  
  @@index([workspaceId])
}

// Agent 表 - 添加 workspaceId
model Agent {
  id          String   @id
  workspaceId String?  // 新增，可选（built-in agents 为 null）
  scope       String   // built-in | workspace | project | user
  // ...

  workspace   Workspace? @relation(fields: [workspaceId], references: [id])
  
  @@index([workspaceId])
}
```

---

## 3. 实施计划

### 3.1 Phase 1: 基础架构（1-2 周）

**目标**：建立 Workspace 实体和数据库表

**任务**：
1. ✅ 创建 `WorkspaceEntity` 和 `WorkspaceMemberEntity`
2. ✅ 创建 Prisma Schema 迁移
3. ✅ 实现 `WorkspaceRepository` 和 `WorkspaceMemberRepository`
4. ✅ 编写单元测试

**产出**：
- `src/domain/models/workspace/workspace.entity.ts`
- `src/domain/models/workspace/workspace-member.entity.ts`
- `src/infrastructure/repositories/workspace.repository.ts`
- `prisma/migrations/xxx_add_workspace_tables.sql`

---

### 3.2 Phase 2: 实体关联（1 周）

**目标**：将现有实体关联到 Workspace

**任务**：
1. ✅ 修改 Project Entity 添加 `workspace_id`
2. ✅ 修改 Channel Entity 添加 `workspace_id`
3. ✅ 修改 Agent Entity 添加 `workspace_id`
4. ✅ 更新所有 Repository 实现
5. ✅ 更新数据库迁移
6. ✅ 数据迁移脚本（将现有数据迁移到默认 Workspace）

**产出**：
- 更新的 Entity 文件
- 数据迁移脚本：`scripts/migrate-to-workspace.ts`

---

### 3.3 Phase 3: Service 层（1 周）

**目标**：实现 Workspace 业务逻辑

**任务**：
1. ✅ 创建 `WorkspaceService`
   - createWorkspace()
   - getWorkspace()
   - updateWorkspace()
   - deleteWorkspace()
   - listWorkspaces()
2. ✅ 创建 `WorkspaceMemberService`
   - addMember()
   - removeMember()
   - updateMemberRole()
   - listMembers()
3. ✅ 创建 `PermissionService`
   - checkPermission()
   - grantPermission()
   - revokePermission()
4. ✅ 更新现有 Service（ProjectService, ChannelService 等）
   - 添加 workspace 权限检查
5. ✅ 编写集成测试

**产出**：
- `src/application/services/workspace.service.ts`
- `src/application/services/workspace-member.service.ts`
- `src/application/services/permission.service.ts`

---

### 3.4 Phase 4: API 层（1 周）

**目标**：暴露 Workspace API

**任务**：
1. ✅ 创建 `workspace.router.ts`
   - workspace.create
   - workspace.get
   - workspace.update
   - workspace.delete
   - workspace.list
2. ✅ 创建 `workspace-member.router.ts`
   - member.add
   - member.remove
   - member.updateRole
   - member.list
3. ✅ 更新现有 Router
   - 添加 workspaceId 参数
   - 添加权限检查中间件
4. ✅ API 文档更新

**产出**：
- `src/infrastructure/trpc/routers/workspace.router.ts`
- `src/infrastructure/trpc/routers/workspace-member.router.ts`
- 更新的 API 文档

---

### 3.5 Phase 5: 前端集成（2 周）

**目标**：前端支持多 Workspace

**任务**：
1. ✅ Workspace 选择器 UI
2. ✅ Workspace 设置页面
3. ✅ 成员管理页面
4. ✅ 权限管理 UI
5. ✅ 更新现有页面（添加 workspace 上下文）

**产出**：
- 前端 Workspace 功能完整实现

---

### 3.6 Phase 6: 数据迁移和测试（1 周）

**目标**：迁移现有数据，全面测试

**任务**：
1. ✅ 运行数据迁移脚本
2. ✅ 端到端测试
3. ✅ 性能测试
4. ✅ 安全测试（权限隔离）
5. ✅ 文档完善

**产出**：
- 完整的多用户系统
- 测试报告
- 用户文档

---

## 4. 技术细节

### 4.1 默认 Workspace 策略

**问题**：现有数据没有 workspace_id，如何处理？

**方案**：
1. 系统启动时自动创建 "Default Workspace"
2. 所有现有数据迁移到 Default Workspace
3. 用户可以创建新的 Workspace 并迁移资源

```typescript
// 数据迁移脚本
async function migrateToWorkspace() {
  // 1. 创建默认 Workspace
  const defaultWorkspace = await createWorkspace({
    name: 'default',
    displayName: 'Default Workspace',
    ownerId: 'system',
  });

  // 2. 迁移所有 Project
  await prisma.project.updateMany({
    data: { workspaceId: defaultWorkspace.id },
  });

  // 3. 迁移所有 Channel
  await prisma.channel.updateMany({
    data: { workspaceId: defaultWorkspace.id },
  });

  // 4. 迁移所有 Agent（除了 built-in）
  await prisma.agent.updateMany({
    where: { scope: { not: 'built-in' } },
    data: { workspaceId: defaultWorkspace.id },
  });
}
```

---

### 4.2 权限检查中间件

```typescript
// tRPC 中间件
const requireWorkspacePermission = (action: string) => {
  return middleware(async ({ ctx, next, rawInput }) => {
    const { workspaceId } = rawInput as { workspaceId: string };
    
    const hasPermission = await permissionService.checkPermission(
      ctx.userId,
      'workspace',
      workspaceId,
      action
    );
    
    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${action}`,
      });
    }
    
    return next();
  });
};

// 使用
export const workspaceRouter = router({
  create: publicProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // 任何用户都可以创建 workspace
      return workspaceService.create(input, ctx.userId);
    }),
    
  update: publicProcedure
    .input(updateWorkspaceSchema)
    .use(requireWorkspacePermission('manage_workspace'))
    .mutation(async ({ input }) => {
      return workspaceService.update(input);
    }),
});
```

---

### 4.3 多租户数据隔离

**关键原则**：所有查询必须包含 workspace 过滤

```typescript
// ❌ 错误：没有 workspace 过滤
const channels = await prisma.channel.findMany({
  where: { projectId },
});

// ✅ 正确：包含 workspace 过滤
const channels = await prisma.channel.findMany({
  where: {
    workspaceId,
    projectId,
  },
});
```

**Repository 层强制检查**：

```typescript
class ChannelRepository {
  async findMany(filters: ChannelFilters): Promise<Channel[]> {
    // 强制要求 workspaceId
    if (!filters.workspaceId) {
      throw new Error('workspaceId is required for data isolation');
    }
    
    return prisma.channel.findMany({
      where: {
        workspaceId: filters.workspaceId,
        ...filters,
      },
    });
  }
}
```

---

## 5. 风险和挑战

### 5.1 数据迁移风险

**风险**：现有数据量大，迁移可能失败或数据丢失

**缓解措施**：
1. 迁移前完整备份数据库
2. 先在测试环境验证迁移脚本
3. 提供回滚脚本
4. 分批迁移，逐步验证

---

### 5.2 性能影响

**风险**：增加 workspace 层级可能影响查询性能

**缓解措施**：
1. 在所有 workspace_id 字段上添加索引
2. 使用复合索引（workspaceId + 其他常用字段）
3. 缓存 workspace 成员信息
4. 定期性能测试

---

### 5.3 权限复杂度

**风险**：三层权限体系可能导致权限检查逻辑复杂

**缓解措施**：
1. 统一的权限检查接口
2. 权限缓存（Redis）
3. 详细的权限文档
4. 权限测试覆盖率 > 90%

---

## 6. 替代方案

### 6.1 方案 B：保留 Server 名称

如果不想重命名为 Workspace，可以保留 Server 但重新定义：

```typescript
// Server 既是物理概念又是逻辑概念
interface ServerEntityProps {
  readonly server_id: string;
  readonly name: string;
  readonly type: 'workspace' | 'physical' | 'virtual' | 'container';
  
  // 当 type = 'workspace' 时
  readonly workspace_settings?: WorkspaceSettings;
  
  // 当 type != 'workspace' 时
  readonly resources?: ServerResources;
  readonly network?: ServerNetwork;
}
```

**优点**：不需要重命名  
**缺点**：语义混淆，一个 Entity 承担两种职责

---

### 6.2 方案 C：Project 作为顶层

不引入 Workspace，直接用 Project 作为顶层隔离：

```
User
  └── ProjectMember
        └── Project
              ├── Channels
              ├── Agents
              └── Tasks
```

**优点**：架构简单  
**缺点**：
- 无法实现"一个团队多个项目"的场景
- 成员管理分散（每个 Project 独立管理）
- 不符合主流协作工具的模式（Slack, Discord, Notion 都有 Workspace 概念）

---

## 7. 总结

### 7.1 推荐方案

**方案 A：引入 Workspace 作为顶层容器**

**理由**：
1. ✅ 符合多用户协作工具的标准模式
2. ✅ 清晰的权限边界和数据隔离
3. ✅ 支持"一个团队多个项目"的场景
4. ✅ 易于扩展（未来可以支持跨 Workspace 协作）

### 7.2 实施时间线

- **Phase 1-2**：3 周（基础架构 + 实体关联）
- **Phase 3-4**：2 周（Service + API）
- **Phase 5**：2 周（前端集成）
- **Phase 6**：1 周（迁移和测试）

**总计**：约 8 周（2 个月）

### 7.3 下一步行动

1. **确认方案**：与团队讨论，确认是否采用 Workspace 方案
2. **创建 Epic**：在任务管理系统中创建 Epic 和子任务
3. **开始 Phase 1**：创建 Workspace Entity 和数据库表

---

## 8. 参考资料

### 8.1 类似产品的架构

- **Slack**: Workspace → Channels → Messages
- **Discord**: Server → Channels → Messages
- **Notion**: Workspace → Pages → Blocks
- **Linear**: Workspace → Projects → Issues

### 8.2 相关文档

- [DDD 聚合根设计](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [多租户架构模式](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
- [RBAC 权限模型](https://en.wikipedia.org/wiki/Role-based_access_control)

---

**文档版本**: v1.0  
**最后更新**: 2026-05-18  
**审阅者**: 待定
