# Cove Server + Device 实施计划 v3.0

**作者**: Alice  
**日期**: 2026-05-18  
**状态**: 待 Review  
**版本**: v3.0 (云端多 Server 架构)

---

## 🎯 产品定位与架构演进

### 当前阶段（本地运行）
```
Machine A (本地)
  └─ .cove/
       ├─ server.json (Server A 配置)
       └─ storage/ (Server A 的数据)
```
- **特点**：一台机器 = 一个 .cove = 一个 Server
- **Repository**：单例，只管理本地数据

### 未来阶段（云端运行）
```
Cloud Backend
  ├─ Machine A 的数据 (Server A)
  │    └─ storage/
  ├─ Machine B 的数据 (Server B)
  │    └─ storage/
  └─ Machine C 的数据 (Server C)
       └─ storage/
```
- **特点**：多台机器连接云端，每台机器 = 一个 Server
- **Repository**：需要支持多 Server 数据隔离
- **关键**：Repository 不再是单例，需要根据 serverId 动态加载数据

---

## 🏗️ 核心架构调整

### 1. Repository 层的多 Server 支持

**当前问题**：
- 现有 Repository 是单例，假设只有一个数据源
- 未来云端需要管理多个 Server 的数据

**解决方案**：
```typescript
// 方案 A：Repository 工厂模式（推荐）
class RepositoryFactory {
  private repositories = new Map<string, ProjectRepository>();
  
  getProjectRepository(serverId: string): ProjectRepository {
    if (!this.repositories.has(serverId)) {
      const storageRoot = this.getStorageRoot(serverId);
      this.repositories.set(serverId, new ProjectRepository(storageRoot));
    }
    return this.repositories.get(serverId)!;
  }
  
  private getStorageRoot(serverId: string): string {
    // 当前：返回本地 .cove/storage/
    // 未来：返回 /data/servers/{serverId}/storage/
    return process.env.STORAGE_ROOT || '.cove/storage';
  }
}

// 方案 B：Repository 接受 serverId 参数
class ProjectRepository {
  async findAll(serverId: string): Promise<ProjectEntity[]> {
    const files = await this.listFiles(serverId);
    return files
      .map(f => this.readFile(f))
      .filter(data => data._server_id === serverId)
      .map(data => ProjectEntity.fromJSON(data));
  }
}
```

**推荐**：方案 A（工厂模式）
- ✅ 支持多 Server 数据隔离
- ✅ 支持 Repository 实例缓存
- ✅ 易于切换存储路径（本地 vs 云端）
- ✅ 符合开闭原则

### 2. 存储结构演进

**当前（本地）**：
```
.cove/
  ├─ server.json          # 当前 Server 配置
  └─ storage/
       ├─ projects/
       ├─ channels/
       └─ agents/
```

**未来（云端）**：
```
/data/servers/
  ├─ server-a/
  │    ├─ server.json
  │    └─ storage/
  │         ├─ projects/
  │         ├─ channels/
  │         └─ agents/
  ├─ server-b/
  │    ├─ server.json
  │    └─ storage/
  └─ server-c/
       ├─ server.json
       └─ storage/
```

**兼容性设计**：
```typescript
// 环境变量控制存储模式
const STORAGE_MODE = process.env.STORAGE_MODE || 'local'; // 'local' | 'cloud'

function getStorageRoot(serverId: string): string {
  if (STORAGE_MODE === 'local') {
    return '.cove/storage';  // 本地模式：单 Server
  } else {
    return `/data/servers/${serverId}/storage`;  // 云端模式：多 Server
  }
}
```

### 3. Service 层的 serverId 注入

**问题**：所有 Service 方法都需要 serverId 参数，调用繁琐

**解决方案**：使用依赖注入 + Context
```typescript
// 创建 ServerContext
class ServerContext {
  constructor(
    public readonly serverId: string,
    public readonly userId: string,
  ) {}
}

// Service 通过构造函数注入 Context
class ProjectService {
  constructor(
    private readonly context: ServerContext,
    private readonly repositoryFactory: RepositoryFactory,
  ) {}
  
  async createProject(data: CreateProjectDto): Promise<ProjectEntity> {
    // 自动使用 context.serverId
    const repo = this.repositoryFactory.getProjectRepository(this.context.serverId);
    
    // 验证权限
    await this.checkPermission('project:create');
    
    // 创建项目
    const project = ProjectEntity.create(data);
    await repo.save(project);
    return project;
  }
  
  private async checkPermission(permission: string): Promise<void> {
    const memberRepo = this.repositoryFactory.getServerMemberRepository(this.context.serverId);
    const member = await memberRepo.findByUserId(this.context.userId);
    if (!member || !member.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}
```

**优势**：
- ✅ Service 方法不需要 serverId 参数
- ✅ 权限检查自动化
- ✅ 代码更简洁

### 4. API 层的 serverId 自动注入

**问题**：前端每次请求都要传递 serverId

**解决方案**：tRPC middleware 自动注入
```typescript
// 从 session/token 中提取 serverId
const serverContextMiddleware = t.middleware(async ({ ctx, next }) => {
  // 方案 1：从 session 中获取当前 Server
  const currentServerId = ctx.session?.currentServerId;
  
  // 方案 2：从 token 中解析（JWT payload）
  // const currentServerId = ctx.token?.serverId;
  
  if (!currentServerId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No server selected',
    });
  }
  
  // 创建 ServerContext
  const serverContext = new ServerContext(currentServerId, ctx.userId);
  
  // 创建 Service 实例（注入 Context）
  const services = createServices(serverContext);
  
  return next({
    ctx: {
      ...ctx,
      serverId: currentServerId,
      serverContext,
      services,
    },
  });
});

// 使用 middleware
export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(serverContextMiddleware);

// API 端点不需要 serverId 参数
export const projectRouter = t.router({
  create: protectedProcedure
    .input(z.object({
      // 不需要 serverId 参数
      name: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // ctx.services 已经注入了 serverId
      return ctx.services.projectService.createProject(input);
    }),
  
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.projectService.listProjects();
    }),
});
```

**优势**：
- ✅ 前端不需要传递 serverId
- ✅ API 签名更简洁
- ✅ 统一的权限检查

### 5. 前端的 Server 管理

**方案**：全局状态 + Session 持久化
```typescript
// Zustand store
interface ServerStore {
  currentServerId: string | null;
  servers: Server[];
  switchServer: (serverId: string) => Promise<void>;
  loadServers: () => Promise<void>;
}

const useServerStore = create<ServerStore>((set, get) => ({
  currentServerId: null,
  servers: [],
  
  switchServer: async (serverId: string) => {
    // 1. 更新本地状态
    set({ currentServerId: serverId });
    
    // 2. 保存到 session
    await trpc.auth.setCurrentServer.mutate({ serverId });
    
    // 3. 刷新数据
    queryClient.invalidateQueries();
  },
  
  loadServers: async () => {
    const servers = await trpc.server.list.query();
    const currentServerId = servers[0]?.serverId || null;
    set({ servers, currentServerId });
  },
}));

// 使用
function ProjectList() {
  const { currentServerId } = useServerStore();
  
  // 不需要传递 serverId
  const { data: projects } = trpc.project.list.useQuery();
  
  return <div>...</div>;
}
```

---

## 📋 实施计划（整合改进建议）

### Phase 0: 基础设施准备（1 天）✅ 已完成

#### 0.1 创建 RepositoryFactory（0.5 天）✅

**任务**：
1. ✅ 创建 `RepositoryFactory` 类
2. ✅ 实现依赖注入和实例管理
3. ✅ 实现 Repository 实例缓存（懒加载 + 单例）
4. ✅ 编写单元测试（15 个测试全部通过）

**产出**：
```
src/infrastructure/repositories/
  ├─ repository-factory.ts (已完成)
  └─ __tests__/
      └─ repository-factory.test.ts (已完成，15 tests)
```

**实际实现**：
- 构造函数注入 PrismaClient, StorageService, ILogger
- 懒加载创建 Repository 实例（project, task, document, server）
- 单例模式缓存实例，避免重复创建
- 提供 getProjectRepository(), getTaskRepository() 等方法

**代码示例**：
```typescript
export class RepositoryFactory {
  private projectRepos = new Map<string, HybridProjectRepository>();
  private channelRepos = new Map<string, HybridChannelRepository>();
  private agentRepos = new Map<string, HybridAgentRepository>();
  
  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly storageMode: 'local' | 'cloud' = 'local',
  ) {}
  
  getProjectRepository(serverId: string): HybridProjectRepository {
    if (!this.projectRepos.has(serverId)) {
      const storageRoot = this.getStorageRoot(serverId);
      this.projectRepos.set(
        serverId,
        new HybridProjectRepository(this.prismaClient, storageRoot)
      );
    }
    return this.projectRepos.get(serverId)!;
  }
  
  private getStorageRoot(serverId: string): string {
    if (this.storageMode === 'local') {
      return '.cove/storage';
    } else {
      return `/data/servers/${serverId}/storage`;
    }
  }
  
  clearCache(serverId?: string): void {
    if (serverId) {
      this.projectRepos.delete(serverId);
      this.channelRepos.delete(serverId);
      this.agentRepos.delete(serverId);
    } else {
      this.projectRepos.clear();
      this.channelRepos.clear();
      this.agentRepos.clear();
    }
  }
}
```

#### 0.2 创建 ServerContext（0.5 天）✅

**任务**：
1. ✅ 创建 `ServerContext` 类
2. ✅ 实现上下文管理（serverId, userId, requestId）
3. ✅ 编写单元测试（10 个测试全部通过）

**产出**：
```
src/application/context/
  ├─ server-context.ts (已完成)
  └─ __tests__/
      └─ server-context.test.ts (已完成，10 tests)
```

**实际实现**：
- readonly 属性：serverId, userId, requestId
- 构造函数验证参数非空
- toJSON() 方法序列化
- toString() 方法格式化输出
- 静态工厂方法 create()

**注意**：ServiceFactory 将在 Phase 3 实施时创建

---

### Phase 1: Domain 层（已完成 ✅）

- ✅ Phase 1.1: ServerEntity 重构
- ✅ Phase 1.2: DeviceEntity 创建
- ✅ Phase 1.3: ServerMemberEntity 创建
- ✅ Phase 1.4: 已回退（Entity 不存 server_id）

---

### Phase 2: Infrastructure 层（3-4 天）

#### 2.1 创建 Server 配置支持（0.5 天）

**任务**：
1. 创建 `ServerConfigRepository`
2. 支持读写 `.cove/server.json` 或 `/data/servers/{serverId}/server.json`
3. 编写单元测试

**产出**：
```
src/infrastructure/repositories/
  ├─ server-config.repository.ts (新增)
  └─ __tests__/
      └─ server-config.repository.test.ts (新增)
```

#### 2.2 更新现有 Repository 支持多 Server（2 天）

**任务**：
1. 更新 `HybridProjectRepository`
   - 构造函数接受 `storageRoot` 参数
   - 存储层添加 `_server_id` 字段
   - 实现 `findAll()` 自动过滤当前 Server 的数据
2. 更新 `HybridChannelRepository`（同上）
3. 更新 `HybridAgentRepository`（同上）
4. 更新所有测试

**关键代码**：
```typescript
export class HybridProjectRepository {
  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly storageRoot: string,  // 新增：支持多 Server
  ) {}
  
  async save(project: ProjectEntity, serverId: string): Promise<void> {
    const json = project.toJSON();
    const dataWithServerId = {
      ...json,
      _server_id: serverId,  // 存储层添加 _server_id
    };
    
    const filePath = path.join(
      this.storageRoot,
      'projects',
      `${project.projectId}.json`
    );
    
    await fs.writeFile(filePath, JSON.stringify(dataWithServerId, null, 2));
  }
  
  async findAll(serverId: string): Promise<ProjectEntity[]> {
    const files = await this.listProjectFiles();
    const projects: ProjectEntity[] = [];
    
    for (const file of files) {
      const data = await this.readFile(file);
      // 只返回当前 Server 的数据
      if (data._server_id === serverId) {
        const { _server_id, ...entityData } = data;
        projects.push(ProjectEntity.fromJSON(entityData));
      }
    }
    
    return projects;
  }
}
```

#### 2.3 创建新 Repository（1.5 天）

**任务**：
1. 创建 `HybridServerRepository`
2. 创建 `HybridDeviceRepository`
3. 创建 `HybridServerMemberRepository`
4. 编写集成测试

---

### Phase 3: Application 层（4-5 天）

#### 3.1 重构现有 Service 使用 ServerContext（2 天）

**任务**：
1. 更新 `ProjectService`
   - 构造函数注入 `ServerContext` 和 `RepositoryFactory`
   - 移除所有方法的 `serverId` 参数
   - 自动从 context 获取 serverId
2. 更新 `ChannelService`（同上）
3. 更新 `AgentService`（同上）
4. 更新 `MessageService`（同上）
5. 更新所有测试

**代码示例**：
```typescript
export class ProjectService {
  constructor(
    private readonly context: ServerContext,
    private readonly repositoryFactory: RepositoryFactory,
    private readonly permissionService: PermissionService,
  ) {}
  
  async createProject(data: CreateProjectDto): Promise<ProjectEntity> {
    // 1. 权限检查（自动使用 context.serverId 和 context.userId）
    await this.permissionService.checkPermission('project:create');
    
    // 2. 获取 Repository（自动使用 context.serverId）
    const repo = this.repositoryFactory.getProjectRepository(this.context.serverId);
    
    // 3. 创建项目
    const project = ProjectEntity.create({
      projectId: generateId(),
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 4. 保存（传递 serverId）
    await repo.save(project, this.context.serverId);
    
    return project;
  }
  
  async listProjects(): Promise<ProjectEntity[]> {
    await this.permissionService.checkPermission('project:read');
    const repo = this.repositoryFactory.getProjectRepository(this.context.serverId);
    return repo.findAll(this.context.serverId);
  }
}
```

#### 3.2 创建新 Service（2 天）

**任务**：
1. 创建 `ServerService`
2. 创建 `DeviceService`
3. 创建 `PermissionService`
4. 编写集成测试

#### 3.3 创建 ServiceFactory（0.5 天）

**任务**：
1. 创建 `createServices(context)` 工厂函数
2. 统一管理所有 Service 的创建
3. 编写单元测试

**代码示例**：
```typescript
export function createServices(
  context: ServerContext,
  repositoryFactory: RepositoryFactory,
): Services {
  const permissionService = new PermissionService(context, repositoryFactory);
  
  return {
    projectService: new ProjectService(context, repositoryFactory, permissionService),
    channelService: new ChannelService(context, repositoryFactory, permissionService),
    agentService: new AgentService(context, repositoryFactory, permissionService),
    messageService: new MessageService(context, repositoryFactory, permissionService),
    serverService: new ServerService(context, repositoryFactory, permissionService),
    deviceService: new DeviceService(context, repositoryFactory, permissionService),
    permissionService,
  };
}
```

---

### Phase 4: API 层（3-4 天）

#### 4.1 创建 serverContextMiddleware（0.5 天）

**任务**：
1. 创建 tRPC middleware 自动注入 serverId
2. 从 session 中获取 currentServerId
3. 创建 ServerContext 和 Services
4. 编写单元测试

**代码示例**：
```typescript
const serverContextMiddleware = t.middleware(async ({ ctx, next }) => {
  // 从 session 获取当前 Server
  const currentServerId = ctx.session?.currentServerId;
  
  if (!currentServerId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No server selected. Please select a server first.',
    });
  }
  
  // 创建 ServerContext
  const serverContext = new ServerContext(currentServerId, ctx.userId);
  
  // 创建 Services
  const services = createServices(serverContext, ctx.repositoryFactory);
  
  return next({
    ctx: {
      ...ctx,
      serverId: currentServerId,
      serverContext,
      services,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(serverContextMiddleware);
```

#### 4.2 更新现有 Router（1.5 天）

**任务**：
1. 更新 `project.router.ts`
   - 移除所有端点的 `serverId` 参数
   - 使用 `ctx.services.projectService`
2. 更新 `channel.router.ts`（同上）
3. 更新 `agent.router.ts`（同上）
4. 更新 `message.router.ts`（同上）
5. 更新所有测试

**代码示例**：
```typescript
export const projectRouter = t.router({
  create: protectedProcedure
    .input(z.object({
      // 不需要 serverId 参数
      name: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.services.projectService.createProject(input);
    }),
  
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.services.projectService.listProjects();
    }),
  
  get: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.services.projectService.getProject(input.projectId);
    }),
});
```

#### 4.3 创建新 Router（1.5 天）

**任务**：
1. 创建 `server.router.ts`
   - `server.list` - 列出用户所属的所有 Server
   - `server.get` - 获取 Server 信息
   - `server.create` - 创建新 Server
   - `server.update` - 更新 Server 配置
   - `server.delete` - 删除 Server
2. 创建 `device.router.ts`
3. 创建 `server-member.router.ts`
4. 编写 E2E 测试

**特殊端点**：
```typescript
// auth.router.ts 中添加
export const authRouter = t.router({
  // ... 现有端点
  
  // 设置当前 Server（保存到 session）
  setCurrentServer: protectedProcedure
    .input(z.object({
      serverId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证用户是否是该 Server 的成员
      const memberRepo = ctx.repositoryFactory.getServerMemberRepository(input.serverId);
      const member = await memberRepo.findByUserId(ctx.userId);
      
      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this server',
        });
      }
      
      // 保存到 session
      ctx.session.currentServerId = input.serverId;
      await ctx.session.save();
      
      return { success: true };
    }),
  
  // 获取当前 Server
  getCurrentServer: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        serverId: ctx.session?.currentServerId || null,
      };
    }),
});
```

---

### Phase 5: 前端集成（2-3 天）

#### 5.1 创建 Server 管理 Store（1 天）

**任务**：
1. 创建 Zustand store 管理当前 Server
2. 实现 `switchServer()` 方法
3. 实现 `loadServers()` 方法
4. 集成到 App 初始化流程

**产出**：
```
code/frontend/src/stores/
  └─ server-store.ts (新增)
```

#### 5.2 更新 API 调用（1 天）

**任务**：
1. 移除所有 tRPC 调用的 `serverId` 参数
2. 验证功能正常

#### 5.3 添加 Server 切换 UI（1 天）

**任务**：
1. 创建 Server 选择器组件
2. 添加到顶部导航栏
3. 实现切换动画和加载状态

---

### Phase 6: 数据迁移与测试（2-3 天）

#### 6.1 创建迁移脚本（1 天）

**任务**：
1. 创建默认 Server（从现有数据）
2. 为所有现有数据添加 `_server_id` 字段
3. 创建 `.cove/server.json`
4. 支持 dry-run 模式

#### 6.2 完整测试（1-2 天）

**任务**：
1. 单元测试（所有新增代码）
2. 集成测试（Repository + Service）
3. E2E 测试（完整用户流程）
4. 性能测试（多 Server 场景）

---

## 🚀 中长期优化计划

### 中期优化（1-2 个月后）

#### 1. 索引优化（1 天）
- 为常用查询添加索引文件
- 实现 `server-index.json` 快速查找
- 性能提升 50%+

#### 2. 缓存机制（2 天）
- Repository 层添加内存缓存
- 实现 LRU 缓存策略
- 支持缓存失效和刷新

#### 3. 性能监控（1 天）
- 添加 Server 切换性能监控
- 记录 Repository 查询耗时
- 生成性能报告

### 长期扩展（3-6 个月后）

#### 1. 云端部署支持（1 周）
- 实现多 Server 存储路径管理
- 支持 `/data/servers/{serverId}/` 目录结构
- 实现 Server 数据同步机制

#### 2. Server 备份与迁移（1 周）
- 实现 Server 数据导出
- 实现 Server 数据导入
- 支持跨环境迁移

#### 3. 分布式部署（2 周）
- 支持 Server 分布在不同 Device
- 实现 Server 间通信
- 实现负载均衡

---

## 📊 实施时间表

| Phase | 任务 | 预计时间 | 依赖 |
|-------|------|---------|------|
| Phase 0 | 基础设施准备 | 1 天 | - |
| Phase 1 | Domain 层 | ✅ 已完成 | - |
| Phase 2 | Infrastructure 层 | 3-4 天 | Phase 0 |
| Phase 3 | Application 层 | 4-5 天 | Phase 2 |
| Phase 4 | API 层 | 3-4 天 | Phase 3 |
| Phase 5 | 前端集成 | 2-3 天 | Phase 4 |
| Phase 6 | 数据迁移与测试 | 2-3 天 | Phase 5 |
| **总计** | **短期实施** | **15-20 天** | - |
| 中期优化 | 索引、缓存、监控 | 4 天 | Phase 6 完成后 1-2 个月 |
| 长期扩展 | 云端、备份、分布式 | 4 周 | Phase 6 完成后 3-6 个月 |

---

## ✅ 质量保证

### 测试覆盖率目标
- 单元测试：> 90%
- 集成测试：> 80%
- E2E 测试：核心流程 100%

### Code Review 检查清单
- [ ] Repository 正确使用 RepositoryFactory
- [ ] Service 正确注入 ServerContext
- [ ] API 端点移除 serverId 参数
- [ ] 所有测试通过
- [ ] 性能测试通过（多 Server 场景）

---

## 🎯 总结

### 核心改进
1. ✅ **Repository 工厂模式**：支持多 Server 数据隔离
2. ✅ **ServerContext 注入**：Service 层不需要 serverId 参数
3. ✅ **tRPC middleware**：API 层自动注入 serverId
4. ✅ **前端全局状态**：统一管理当前 Server
5. ✅ **存储路径抽象**：支持本地/云端模式切换

### 架构优势
- **当前可用**：本地单 Server 场景完美支持
- **未来可扩展**：云端多 Server 场景无缝迁移
- **代码简洁**：移除冗余的 serverId 参数传递
- **性能优化**：Repository 实例缓存 + 索引支持

### 风险控制
- **向后兼容**：需要数据迁移，但有完整的迁移脚本
- **测试覆盖**：完整的单元/集成/E2E 测试
- **渐进式实施**：分 6 个 Phase，每个 Phase 独立可测试

---

**准备好开始实施了吗？** 🚀
