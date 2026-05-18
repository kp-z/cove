# Cove Server + Device 实施计划

**作者**: Alice  
**日期**: 2026-05-18  
**状态**: 执行中 (In Progress)  
**版本**: v2.0 (架构调整版)

---

## 🔄 架构调整说明 (2026-05-18 17:13)

### 重大架构决策：Server 作为上下文边界

经过与用户的深入讨论，我们对架构方案进行了重大调整，采用更简洁优雅的设计：

**核心理念**：
- **Server 是上下文边界，而非数据字段**
- **一个 `.cove` 目录对应一个 Server**
- **Entity 层不存储 server_id，保持数据模型简洁**

**最终架构**：
```
User (唯一感知多 Server 的实体)
  ├─ ServerMember (User-Server 关系表)
  │
  └─ Server (上下文容器)
       ├─ Project (Entity 不存 server_id)
       ├─ Channel (Entity 不存 server_id)
       ├─ Agent (Entity 不存 server_id)
       ├─ Message (Entity 不存 server_id)
       └─ Device (Entity 不存 server_id)
```

**实现策略**：
1. **Entity 层**：不包含 server_id 字段，保持简洁
2. **Repository 层**：存储层（JSON 文件）添加 `_server_id` 内部字段，提供 `findByServer()` 方法
3. **Service 层**：所有方法添加 `serverId` 参数，先验证 ServerMembership
4. **API 层**：所有端点添加 `serverId` 参数，统一权限检查

**目录结构**：
```
.cove/
  ├─ server.json          # Server 配置（单个文件）
  └─ storage/
       ├─ users/          # 全局用户
       ├─ server-members/ # User-Server 关系
       ├─ projects/       # 存储层有 _server_id，Entity 不暴露
       ├─ channels/       # 存储层有 _server_id，Entity 不暴露
       ├─ agents/         # 存储层有 _server_id，Entity 不暴露
       └─ devices/        # 存储层有 _server_id，Entity 不暴露
```

**优势**：
1. ✅ 数据模型更简单（Entity 不需要 server_id 字段）
2. ✅ 职责更清晰（Server 是边界，不是属性）
3. ✅ 符合用户心智模型（先选 workspace，再操作）
4. ✅ 减少数据冗余和关联复杂度
5. ✅ 类似 Slack/Discord 的成熟模式

**Phase 1.4 调整**：
- ❌ 已回退 ProjectEntity 和 ChannelEntity 的 server_id 字段修改
- ✅ 保留 ServerEntity、DeviceEntity、ServerMemberEntity
- ✅ 后续 Phase 将按新架构方案调整

---

## 📋 执行原则

本计划遵循以下原则：
- **高内聚低耦合**：每个模块职责单一，模块间依赖最小化
- **不增熵**：代码质量优雅简洁，不增加系统复杂度
- **全链路开发**：从 Domain → Application → Infrastructure → Presentation 完整实现
- **测试驱动**：单元测试覆盖率 > 90%，集成测试覆盖关键流程
- **持续 Review**：每个 Phase 完成后进行代码审查

---

## 🔍 Slock Server 实现对比分析

### Slock 的 Server 架构

根据 `slock server info` 输出分析：

```
Server (bd324e4d-c6ab-4b0a-b00e-aa9053d70cc3)
  ├── Channels (公开/私有频道)
  ├── Agents (AI 智能体)
  └── Humans (人类用户)
```

**Slock Server 的核心特性**：

1. **Server 是顶层容器**
   - 所有 Channel、Agent、User 都属于一个 Server
   - Server ID 是全局唯一标识符

2. **Channel 管理**
   - 支持公开/私有频道
   - 频道成员管理（joined/not joined）
   - 线程支持（thread follow/unfollow）

3. **成员管理**
   - Agents 和 Humans 都是 Server 成员
   - 统一的成员列表和权限管理

4. **运行时上下文**
   - Server ID 作为权威上下文
   - 与 Computer/Device 分离（Computer ID 独立）

### Cove vs Slock 对比

| 特性 | Slock | Cove (当前) | Cove (目标) |
|------|-------|------------|------------|
| **顶层容器** | Server | Project | Server |
| **成员管理** | Server 级别 | Channel 级别 | Server 级别 |
| **频道隔离** | Server 内 | Project 内 | Server 内 |
| **设备管理** | Computer (独立) | 无 | Device (独立) |
| **权限模型** | Server → Channel | Project → Channel | Server → Project → Channel |

### 借鉴 Slock 的设计

1. ✅ **Server 作为顶层容器**：与 Slock 一致
2. ✅ **Server 与 Device 分离**：类似 Slock 的 Server 与 Computer 分离
3. ✅ **统一成员管理**：Server 级别的成员和权限
4. ✅ **频道归属 Server**：Channel 直接属于 Server（可选关联 Project）

---

## 🏗️ 架构设计 Review

### 实体职责分析（单一职责原则）

#### Server Entity
**职责**：工作空间/团队空间的逻辑隔离
- ✅ 管理成员（ServerMember）
- ✅ 组织项目（Project）
- ✅ 配置设置（ServerSettings）
- ✅ 资源限制（ServerLimits）
- ❌ 不管理物理资源（交给 Device）

**评估**：✅ 职责单一，符合 SRP

#### Device Entity
**职责**：物理/虚拟设备的资源管理
- ✅ 管理计算资源（CPU、内存、磁盘）
- ✅ 管理网络配置（IP、端口、协议）
- ✅ 管理安全设置（SSH、SSL）
- ✅ 提供 Agent 运行环境
- ❌ 不管理业务逻辑（交给 Server）

**评估**：✅ 职责单一，符合 SRP

#### ServerMember Entity
**职责**：Server 成员关系和权限
- ✅ 关联 User 和 Server
- ✅ 管理角色（Owner、Admin、Member、Guest）
- ✅ 管理权限列表
- ❌ 不管理具体业务（交给 Service 层）

**评估**：✅ 职责单一，符合 SRP

### 模块耦合度分析（依赖倒置原则）

```
Domain Layer (核心业务逻辑)
  ├── ServerEntity
  ├── DeviceEntity
  └── ServerMemberEntity
  
Application Layer (应用服务)
  ├── ServerService (依赖 ServerRepository 接口)
  ├── DeviceService (依赖 DeviceRepository 接口)
  └── PermissionService (依赖 ServerMemberRepository 接口)
  
Infrastructure Layer (基础设施)
  ├── HybridServerRepository (实现 ServerRepository)
  ├── HybridDeviceRepository (实现 DeviceRepository)
  └── HybridServerMemberRepository (实现 ServerMemberRepository)
```

**评估**：
- ✅ Domain 层不依赖任何外部模块
- ✅ Application 层依赖 Domain 接口（抽象）
- ✅ Infrastructure 层实现 Domain 接口
- ✅ 符合依赖倒置原则（DIP）

### 复杂度评估（KISS 原则）

**新增复杂度**：
- 3 个新实体（Server, Device, ServerMember）
- 3 个新 Repository
- 3 个新 Service
- 2 个新 Router
- 1 个数据迁移脚本

**减少复杂度**：
- 统一权限模型（减少分散的权限检查）
- 清晰的层级结构（减少关系混乱）
- 职责分离（Server vs Device）

**净效果**：✅ 整体不增熵，反而降低了系统复杂度

---

## 📅 详细实施计划

### Phase 1: Domain 层实现（3-4 天）

#### 1.1 重构 ServerEntity（1 天）

**状态**: ✅ **已完成** (2026-05-18)

**任务**：
1. ✅ 读取现有 `server.entity.ts`
2. ✅ 移除物理资源相关字段（resources, network, security）
3. ✅ 添加工作空间相关字段（settings, limits）
4. ✅ 更新 Entity 方法（create, validate, suspend, activate, archive, unarchive）
5. ✅ 编写单元测试（23 个测试用例，全部通过）

**产出**：
```
src/domain/models/server/
  ├── server.entity.ts (已重构)
  └── __tests__/
      └── server.entity.test.ts (已更新，23/23 测试通过)
```

**Review 检查清单**：
- ✅ 所有字段使用 snake_case
- ✅ 所有字段标记为 readonly
- ✅ 提供 create() 静态工厂方法
- ✅ 提供 updateStatus() 方法返回新实例
- ✅ 业务规则验证完整（name 长度、status 枚举、limits 范围）
- ✅ 单元测试覆盖率 100%

#### 1.2 创建 DeviceEntity（1 天）

**状态**: ✅ **已完成** (2026-05-18)

**任务**：
1. ✅ 创建 `device.entity.ts`
2. ✅ 定义 DeviceEntityProps 接口
3. ✅ 创建相关类型（DeviceSpecs, DeviceNetwork, DeviceLocation）
4. ✅ 实现 Entity 方法（状态管理、资源更新、心跳等）
5. ✅ 编写单元测试（33 个测试用例，全部通过）

**产出**：
```
src/domain/models/device/
  ├── device.entity.ts (已创建)
  └── __tests__/
      └── device.entity.test.ts (已创建，33/33 测试通过)
```

**Review 检查清单**：
- ✅ 遵循 DDD 最佳实践
- ✅ 所有字段使用 snake_case
- ✅ 不可变更新模式
- ✅ 业务规则验证（CPU > 0, 内存 > 0, 存储 > 0）
- ✅ 单元测试覆盖率 100%
- ✅ 状态转换逻辑完整（online, offline, maintenance, error, decommissioned）
- ✅ 资源管理方法（updateSpecs, updateNetwork, updateLocation）

#### 1.3 创建 ServerMemberEntity（1 天）✅ **已完成** (2026-05-18 16:40)

**任务**：
1. ✅ 创建 `server-member.entity.ts`
2. ✅ 定义角色枚举（Owner, Admin, Member, Guest）
3. ✅ 定义权限列表（24 个权限）
4. ✅ 实现权限检查方法（hasPermission, hasAllPermissions, hasAnyPermission）
5. ✅ 编写单元测试（52 个测试用例全部通过）

**产出**：
```
src/domain/models/server-member/
  ├── server-member.entity.ts (新增，包含角色、权限、状态管理)
  └── __tests__/
      └── server-member.entity.test.ts (新增，52/52 测试通过)
```

**Review 检查清单**：
- ✅ 角色和权限映射清晰（ROLE_PERMISSIONS 定义完整）
- ✅ 权限检查方法高效（基于数组查找）
- ✅ 单元测试覆盖所有角色和权限组合
- ✅ 所有字段使用 snake_case
- ✅ 不可变更新模式
- ✅ 业务规则验证（角色、状态、权限）
- ✅ 单元测试覆盖率 100%
- ✅ 状态转换逻辑完整（active, suspended, left）
- ✅ 权限管理方法（updateRole, setCustomPermissions, clearCustomPermissions）
- ✅ 成员管理方法（suspend, activate, leave）

#### 1.4 更新关联实体 ✅ **已回退** (2026-05-18 17:13)

**原计划任务**：
1. ~~更新 ProjectEntity 添加 `server_id`~~
2. ~~更新 ChannelEntity 添加 `server_id`~~
3. ~~更新 AgentEntity 添加 `server_id` 和 `device_id`~~
4. ~~更新相关测试~~

**实际执行**：
- ✅ 曾添加 ProjectEntity 的 server_id 字段（21 tests 通过）
- ✅ 曾添加 ChannelEntity 的 server_id 字段（22 tests 通过）
- ✅ 已回退所有修改（采用新架构方案）
- ✅ ProjectEntity 回退验证（20 tests 通过）
- ✅ ChannelEntity 回退验证（21 tests 通过）

**架构调整原因**：
- Entity 层不存储 server_id，保持数据模型简洁
- Server 作为上下文边界，通过 API/Service 层传递
- Repository 层使用内部 `_server_id` 字段隔离数据

**Review 检查清单**：
- ✅ 回退完成，Entity 层保持原有结构
- ✅ 所有测试通过（41 个测试）

---

### Phase 2: Infrastructure 层实现（3-4 天）

#### 2.1 创建 Server 配置支持（0.5 天）

**任务**：
1. 创建 `.cove/server.json` 配置文件结构
2. 创建 `ServerConfigRepository` 读写 server.json
3. 实现 Server 配置的初始化逻辑
4. 编写单元测试

**产出**：
```
src/infrastructure/repositories/
  ├── server-config.repository.ts (新增)
  └── __tests__/
      └── server-config.repository.test.ts (新增)

.cove/
  └── server.json (配置文件示例)
```

**server.json 结构**：
```json
{
  "server_id": "server-001",
  "name": "My Workspace",
  "display_name": "My Workspace",
  "owner_id": "user-001",
  "status": "active",
  "visibility": "private",
  "settings": {
    "default_member_role": "member",
    "allow_guest_access": false
  },
  "limits": {
    "max_members": 100,
    "max_projects": 50,
    "max_channels": 200
  },
  "created_at": "2026-05-18T00:00:00Z",
  "updated_at": "2026-05-18T00:00:00Z"
}
```

**Review 检查清单**：
- [ ] server.json 结构与 ServerEntity 一致
- [ ] 读写操作支持原子性（文件锁）
- [ ] 错误处理完整（文件不存在、格式错误）
- [ ] 单元测试覆盖率 > 90%

#### 2.2 更新现有 Repository 添加 server_id 支持（1.5 天）

**任务**：
1. 更新 `HybridProjectRepository` 添加 `_server_id` 字段支持
2. 更新 `HybridChannelRepository` 添加 `_server_id` 字段支持
3. 更新 `HybridAgentRepository` 添加 `_server_id` 字段支持
4. 添加 `findByServer(serverId)` 方法
5. 更新现有测试，添加 server_id 相关测试

**实现策略**：
- 存储层（JSON 文件）添加 `_server_id` 字段（下划线前缀表示内部字段）
- Entity 的 `toJSON()` 不包含 `_server_id`
- Repository 的 `fromJSON()` 忽略 `_server_id`
- Repository 的 `save()` 自动添加 `_server_id`
- Repository 的 `findByServer()` 根据 `_server_id` 过滤

**产出**：
```
src/infrastructure/repositories/
  ├── hybrid-project.repository.ts (更新)
  ├── hybrid-channel.repository.ts (更新)
  ├── hybrid-agent.repository.ts (更新)
  └── __tests__/
      ├── hybrid-project.repository.test.ts (更新)
      ├── hybrid-channel.repository.test.ts (更新)
      └── hybrid-agent.repository.test.ts (更新)
```

**Review 检查清单**：
- [ ] `_server_id` 字段不暴露给 Entity 层
- [ ] `findByServer()` 方法正确过滤数据
- [ ] 所有 CRUD 操作包含 server_id 参数
- [ ] 测试覆盖 server_id 隔离逻辑

#### 2.3 创建 Prisma Schema（1 天）

**任务**：
1. 定义 Server 表
2. 定义 Device 表
3. 定义 ServerMember 表
4. 更新 Project/Channel/Agent 表添加 server_id 外键（存储层）
5. 创建迁移文件
6. 测试迁移（dry-run）

**注意**：Prisma 层的 server_id 是存储层字段，不映射到 Entity

**产出**：
```
prisma/
  ├── schema.prisma (更新)
  └── migrations/
      └── 20260518_add_server_device_tables/
          └── migration.sql
```

**Review 检查清单**：
- [ ] 所有外键约束正确
- [ ] 索引覆盖常用查询字段（server_id, user_id）
- [ ] 迁移脚本可逆（提供 down 脚本）
- [ ] 在测试数据库验证迁移成功

#### 2.4 实现 Repository 层（1 天）

**任务**：
1. 创建 `HybridServerRepository`
2. 创建 `HybridDeviceRepository`
3. 创建 `HybridServerMemberRepository`
4. 实现 CRUD 方法
5. 编写集成测试（15+ 测试用例）

**产出**：
```
src/infrastructure/repositories/
  ├── hybrid-server.repository.ts (新增)
  ├── hybrid-device.repository.ts (新增)
  ├── hybrid-server-member.repository.ts (新增)
  └── __tests__/
      ├── hybrid-server.repository.test.ts (新增)
      ├── hybrid-device.repository.test.ts (新增)
      └── hybrid-server-member.repository.test.ts (新增)
```

**Review 检查清单**：
- [ ] 所有查询包含 server_id 过滤（数据隔离）
- [ ] 错误处理完整
- [ ] 事务支持（create/update/delete）
- [ ] 集成测试覆盖率 > 90%

---

### Phase 3: Application 层实现（4-5 天）

#### 3.1 创建 ServerService（1.5 天）

**任务**：
1. 实现 `createServer()`
2. 实现 `getServer()`
3. 实现 `updateServer()`
4. 实现 `deleteServer()`
5. 实现 `listServers(userId)` - 列出用户所属的所有 Server
6. 添加权限检查
7. 编写集成测试（20+ 测试用例）

**产出**：
```
src/application/services/
  ├── server.service.ts (新增)
  └── __tests__/
      └── server.service.test.ts (新增)
```

**Review 检查清单**：
- [ ] 所有方法包含权限检查
- [ ] 错误处理和日志记录
- [ ] 事务支持（如删除 Server 时级联删除相关资源）
- [ ] 集成测试覆盖正常流程和异常流程

#### 3.2 创建 DeviceService（1 天）

**任务**：
1. 实现 CRUD 方法（所有方法添加 `serverId` 参数）
2. 实现资源监控方法
3. 实现 Agent 部署方法
4. 编写集成测试（15+ 测试用例）

**方法签名示例**：
```typescript
async createDevice(serverId: string, userId: string, data: CreateDeviceDto): Promise<DeviceEntity>
async listDevices(serverId: string, userId: string): Promise<DeviceEntity[]>
async getDevice(serverId: string, deviceId: string, userId: string): Promise<DeviceEntity>
```

**产出**：
```
src/application/services/
  ├── device.service.ts (新增)
  └── __tests__/
      └── device.service.test.ts (新增)
```

**Review 检查清单**：
- [ ] 所有方法包含 serverId 参数
- [ ] 先验证 ServerMembership，再执行操作
- [ ] 根据 serverId 过滤数据

#### 3.3 创建 PermissionService（1.5 天）

**任务**：
1. 实现 `checkServerMembership(serverId, userId)`
2. 实现 `checkPermission(serverId, userId, permission)`
3. 实现 `getUserRole(serverId, userId)`
4. 实现权限缓存机制
5. 编写集成测试（20+ 测试用例）

**产出**：
```
src/application/services/
  ├── permission.service.ts (新增)
  └── __tests__/
      └── permission.service.test.ts (新增)
```

**Review 检查清单**：
- [ ] 权限检查高效（缓存机制）
- [ ] 支持角色继承（Owner > Admin > Member > Guest）
- [ ] 错误消息清晰（权限不足时说明需要哪个权限）

#### 3.4 更新现有 Service 添加 serverId 参数（1 天）

**任务**：
1. 更新 `ProjectService` 所有方法添加 `serverId` 参数
2. 更新 `ChannelService` 所有方法添加 `serverId` 参数
3. 更新 `AgentService` 所有方法添加 `serverId` 参数
4. 更新 `MessageService` 所有方法添加 `serverId` 参数
5. 在每个方法开始处添加 ServerMembership 验证
6. 更新所有相关测试

**方法签名示例**：
```typescript
// ProjectService
async createProject(serverId: string, userId: string, data: CreateProjectDto): Promise<ProjectEntity>
async listProjects(serverId: string, userId: string): Promise<ProjectEntity[]>

// ChannelService
async createChannel(serverId: string, userId: string, data: CreateChannelDto): Promise<ChannelEntity>
async listChannels(serverId: string, projectId: string, userId: string): Promise<ChannelEntity[]>
```

**Review 检查清单**：
- [ ] 所有 Service 方法包含 serverId 参数
- [ ] 所有方法先验证 ServerMembership
- [ ] 所有 Repository 调用使用 findByServer()
- [ ] 测试覆盖权限检查逻辑

**任务**：
1. 实现 `checkPermission()`
2. 实现 `grantPermission()`
3. 实现 `revokePermission()`
4. 实现权限缓存（可选）
5. 编写集成测试（20+ 测试用例）

**产出**：
```
src/application/services/
  ├── permission.service.ts (新增)
  └── __tests__/
      └── permission.service.test.ts (新增)
```

**Review 检查清单**：
- [ ] 权限检查逻辑清晰高效
- [ ] 支持角色继承（Owner > Admin > Member > Guest）
- [ ] 测试覆盖所有权限组合

#### 3.4 更新现有 Service（1 天）

**任务**：
1. 更新 ProjectService 添加 server_id 参数和权限检查
2. 更新 ChannelService 添加 server_id 参数和权限检查
3. 更新 AgentService 添加 server_id 和 device_id 支持
4. 更新相关测试

**Review 检查清单**：
- [ ] 所有 Service 方法包含 server_id 参数
- [ ] 权限检查集成到现有流程
- [ ] 向后兼容（支持默认 Server）

---

### Phase 4: API 层实现（3-4 天）

#### 4.1 创建 server.router.ts（1.5 天）

**任务**：
1. 定义 tRPC procedures
   - `server.create` - 创建新 Server
   - `server.get` - 获取 Server 信息
   - `server.update` - 更新 Server 配置
   - `server.delete` - 删除 Server
   - `server.list` - 列出用户所属的所有 Server
2. 定义 Zod schemas
3. 添加权限中间件
4. 编写 E2E 测试（10+ 测试用例）

**产出**：
```
src/infrastructure/trpc/routers/
  ├── server.router.ts (新增)
  └── __tests__/
      └── server.router.test.ts (新增)
```

**Review 检查清单**：
- [ ] 所有输入使用 Zod 验证
- [ ] 错误处理返回标准格式
- [ ] E2E 测试覆盖完整流程

#### 4.2 创建 device.router.ts（1 天）

**任务**：
1. 定义 tRPC procedures（所有端点包含 `serverId` 参数）
   - `device.create` - 在指定 Server 下创建 Device
   - `device.list` - 列出指定 Server 的所有 Device
   - `device.get` - 获取指定 Device 信息
   - `device.update` - 更新 Device 配置
   - `device.delete` - 删除 Device
2. 定义 Zod schemas
3. 编写 E2E 测试（10+ 测试用例）

**端点签名示例**：
```typescript
device.create: protectedProcedure
  .input(z.object({
    serverId: z.string(),
    name: z.string(),
    type: z.enum(['physical', 'virtual', 'container']),
    // ...
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.deviceService.createDevice(input.serverId, ctx.userId, input);
  })
```

**产出**：
```
src/infrastructure/trpc/routers/
  ├── device.router.ts (新增)
  └── __tests__/
      └── device.router.test.ts (新增)
```

**Review 检查清单**：
- [ ] 所有端点包含 serverId 参数
- [ ] 权限检查在 Service 层完成
- [ ] 错误消息清晰（如"无权访问该 Server"）

#### 4.3 创建 server-member.router.ts（1 天）

**任务**：
1. 定义 tRPC procedures
   - `serverMember.add` - 添加成员到 Server
   - `serverMember.remove` - 从 Server 移除成员
   - `serverMember.updateRole` - 更新成员角色
   - `serverMember.list` - 列出 Server 的所有成员
   - `serverMember.get` - 获取成员信息
2. 定义 Zod schemas
3. 编写 E2E 测试（10+ 测试用例）

**产出**：
```
src/infrastructure/trpc/routers/
  ├── server-member.router.ts (新增)
  └── __tests__/
      └── server-member.router.test.ts (新增)
```

**Review 检查清单**：
- [ ] 只有 Owner/Admin 可以管理成员
- [ ] 不能移除 Server 的 Owner
- [ ] 测试覆盖权限边界情况

#### 4.4 更新现有 Router 添加 serverId 参数（1.5 天）

**任务**：
1. 更新 `project.router.ts` 所有端点添加 `serverId` 参数
2. 更新 `channel.router.ts` 所有端点添加 `serverId` 参数
3. 更新 `agent.router.ts` 所有端点添加 `serverId` 参数
4. 更新 `message.router.ts` 所有端点添加 `serverId` 参数
5. 更新所有相关测试

**端点签名示例**：
```typescript
// project.router.ts
project.create: protectedProcedure
  .input(z.object({
    serverId: z.string(),  // 新增
    name: z.string(),
    // ...
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.projectService.createProject(input.serverId, ctx.userId, input);
  })

project.list: protectedProcedure
  .input(z.object({
    serverId: z.string(),  // 新增
  }))
  .query(async ({ ctx, input }) => {
    return ctx.projectService.listProjects(input.serverId, ctx.userId);
  })
```

**Review 检查清单**：
- [ ] 所有端点包含 serverId 参数
- [ ] 所有 Service 调用传递 serverId
- [ ] 测试覆盖 serverId 验证
- [ ] 向后兼容性考虑（如果需要）

---

### Phase 5: 数据迁移（2-3 天）

#### 5.1 创建迁移脚本（1 天）

**任务**：
1. 创建 `migrate-to-server-model.ts`
2. 实现默认 Server 创建
3. 实现现有数据迁移（Project, Channel, Agent）
4. 实现回滚脚本
5. 添加 dry-run 模式

**产出**：
```
scripts/
  ├── migrate-to-server-model.ts (新增)
  └── rollback-server-migration.ts (新增)
```

**Review 检查清单**：
- [ ] 迁移前自动备份数据库
- [ ] 支持 dry-run 预览
- [ ] 详细的日志输出
- [ ] 回滚脚本经过测试

#### 5.2 测试迁移（1 天）

**任务**：
1. 在测试环境运行迁移
2. 验证数据完整性
3. 验证 API 功能正常
4. 性能测试

**Review 检查清单**：
- [ ] 所有数据正确迁移
- [ ] 无数据丢失
- [ ] API 响应时间无明显增加
- [ ] 权限检查正常工作

#### 5.3 生产环境迁移（0.5 天）

**任务**：
1. 备份生产数据库
2. 运行迁移脚本
3. 验证功能
4. 监控性能

---

### Phase 6: 文档和前端集成（3-4 天）

#### 6.1 更新文档（1 天）

**任务**：
1. 更新 API 文档
2. 更新架构文档
3. 创建迁移指南
4. 创建用户手册

**产出**：
```
docs/
  ├── api/
  │   ├── server-api.md (新增)
  │   ├── device-api.md (新增)
  │   └── server-member-api.md (新增)
  ├── architecture/
  │   └── server-device-architecture.md (更新)
  └── guides/
      ├── migration-guide.md (新增)
      └── user-manual.md (更新)
```

#### 6.2 前端集成（2-3 天）

**任务**：
1. 创建 Server 选择器组件
2. 创建 Server 设置页面
3. 创建成员管理页面
4. 更新现有页面添加 Server 上下文

**产出**：
```
frontend/src/
  ├── features/server/
  │   ├── components/
  │   │   ├── ServerSelector.tsx
  │   │   ├── ServerSettings.tsx
  │   │   └── MemberManagement.tsx
  │   └── hooks/
  │       └── useServer.ts
  └── contexts/
      └── ServerContext.tsx
```

---

## ✅ 质量保证策略

### 测试策略

#### 单元测试
- **目标覆盖率**: > 90%
- **工具**: Vitest
- **范围**: 所有 Entity、Value Object、Service 方法
- **运行频率**: 每次提交前

#### 集成测试
- **目标覆盖率**: > 80%
- **工具**: Vitest + 测试数据库
- **范围**: Repository、Service 层
- **运行频率**: 每次 PR 前

#### E2E 测试
- **目标覆盖率**: 关键流程 100%
- **工具**: Vitest + tRPC client
- **范围**: API 端点
- **运行频率**: 每次发布前

### Code Review 检查清单

#### Domain 层
- [ ] 所有字段使用 snake_case
- [ ] 所有字段标记为 readonly
- [ ] Entity 不可变（update 返回新实例）
- [ ] 业务规则验证完整
- [ ] 无外部依赖

#### Application 层
- [ ] Service 方法职责单一
- [ ] 依赖注入（构造函数注入）
- [ ] 错误处理完整
- [ ] 日志记录清晰
- [ ] 事务支持

#### Infrastructure 层
- [ ] Repository 实现接口
- [ ] 数据隔离（server_id 过滤）
- [ ] 错误转换（Prisma 错误 → Domain 错误）
- [ ] 性能优化（索引、批量操作）

#### API 层
- [ ] 输入验证（Zod）
- [ ] 权限检查
- [ ] 错误处理（标准格式）
- [ ] API 文档完整

### 性能基准

#### 数据库查询
- 单表查询: < 10ms
- 关联查询: < 50ms
- 复杂查询: < 100ms

#### API 响应时间
- 简单查询: < 100ms
- 复杂查询: < 500ms
- 写操作: < 200ms

#### 内存使用
- 单个 Entity: < 1KB
- Service 实例: < 10KB
- 总内存增长: < 50MB

---

## 📊 进度跟踪

### Phase 1: Domain 层（3-4 天）
- [ ] 1.1 重构 ServerEntity
- [ ] 1.2 创建 DeviceEntity
- [ ] 1.3 创建 ServerMemberEntity
- [ ] 1.4 更新关联实体

### Phase 2: Infrastructure 层（3-4 天）
- [ ] 2.1 创建 Prisma Schema
- [ ] 2.2 实现 Repository 层

### Phase 3: Application 层（4-5 天）
- [ ] 3.1 创建 ServerService
- [ ] 3.2 创建 DeviceService
- [ ] 3.3 创建 PermissionService
- [ ] 3.4 更新现有 Service

### Phase 4: API 层（3-4 天）
- [ ] 4.1 创建 server.router.ts
- [ ] 4.2 创建 device.router.ts
- [ ] 4.3 创建 server-member.router.ts
- [ ] 4.4 更新现有 Router

### Phase 5: 数据迁移（2-3 天）
- [ ] 5.1 创建迁移脚本
- [ ] 5.2 测试迁移
- [ ] 5.3 生产环境迁移

### Phase 6: 文档和前端（3-4 天）
- [ ] 6.1 更新文档
- [ ] 6.2 前端集成

**总计**: 18-24 天（约 4-5 周）

---

## 🎯 成功标准

### 功能完整性
- ✅ 所有 Phase 任务完成
- ✅ 所有测试通过
- ✅ 数据迁移成功
- ✅ API 功能正常

### 代码质量
- ✅ 单元测试覆盖率 > 90%
- ✅ 集成测试覆盖率 > 80%
- ✅ E2E 测试覆盖关键流程
- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 警告

### 性能指标
- ✅ API 响应时间符合基准
- ✅ 数据库查询性能符合基准
- ✅ 内存使用增长 < 50MB

### 文档完整性
- ✅ API 文档完整
- ✅ 架构文档更新
- ✅ 迁移指南清晰
- ✅ 用户手册完善

---

## 📝 下一步行动

1. **确认计划**：Review 本计划，确认方案和时间线
2. **创建任务**：在任务管理系统中创建所有子任务
3. **开始 Phase 1**：重构 ServerEntity，创建 DeviceEntity 和 ServerMemberEntity
4. **持续 Review**：每个 Phase 完成后进行代码审查

---

**文档版本**: v1.0  
**最后更新**: 2026-05-18  
**审阅者**: 待定
