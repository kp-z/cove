# Cove Backend 降熵计划（方案 B：全面 snake_case + 自动化 toJSON）

**日期**: 2026-05-16  
**负责人**: Alice  
**目标**: 降低后端代码熵值，实现真正的单一数据源

---

## 核心目标

**熵 = 混乱度 = 重复定义 + 类型不一致 + 分层混乱**

**降熵 = 单一数据源 + 清晰流向 + 类型安全 + 自动化**

---

## 方案选择：方案 B（全面 snake_case）

### 为什么选择方案 B？

**方案 A（当前）：后端 camelCase，API snake_case**
- 需要维护 3 处定义：Entity Props、EntityJSON、toJSON()
- 添加字段需要改 3 处
- 不是真正的单一数据源

**方案 B（选定）：全面 snake_case**
- ✅ 真正的单一数据源（Entity Props）
- ✅ 添加字段只需改 1 处
- ✅ 与 Prisma schema 完全一致
- ✅ 与 API 响应完全一致
- ✅ 最低熵、最简单、最易维护
- ❌ 违反 TypeScript 惯例（可接受的代价）

---

## 核心创新：自动化 toJSON()

### 问题

当前每个 Entity 都需要手动实现 toJSON()：

```typescript
// 14 个 Entity，每个都要写类似的代码
toJSON(): UserEntityJSON {
  return {
    user_id: this.props.userId,        // 手动映射
    username: this.props.username,     // 手动映射
    display_name: this.props.displayName, // 手动映射
    email: this.props.email,           // 手动映射
    created_at: this.props.createdAt.toISOString(), // 手动映射
    // ... 重复劳动
  };
}
```

### 解决方案：通用工具函数

```typescript
// domain/common/entity-serializer.ts

/**
 * 将 Entity Props 转换为 JSON
 * 自动处理 Date → ISO 8601 字符串
 */
export function entityToJSON<T extends Record<string, any>>(
  props: T
): EntityJSON<T> {
  const result: any = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (value instanceof Date) {
      // Date → ISO 8601 字符串
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      // 递归处理数组
      result[key] = value.map(item => 
        item instanceof Date ? item.toISOString() : item
      );
    } else if (value && typeof value === 'object' && 'toJSON' in value) {
      // 递归处理嵌套对象
      result[key] = value.toJSON();
    } else {
      // 其他类型直接复制
      result[key] = value;
    }
  }
  
  return result as EntityJSON<T>;
}

/**
 * 类型转换：Date → string
 */
type EntityJSON<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | undefined
    ? string | undefined
    : T[K] extends Array<infer U>
    ? U extends Date
      ? string[]
      : T[K]
    : T[K];
};
```

### 使用方式

```typescript
// domain/models/user/user.entity.ts
import { entityToJSON } from '@domain/common/entity-serializer';

interface UserEntityProps {
  user_id: string;           // snake_case
  username: string;
  display_name: string;      // snake_case
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
  created_at: Date;          // snake_case
}

export class UserEntity {
  private constructor(private readonly props: UserEntityProps) {}
  
  // 只需一行，调用通用工具函数
  toJSON() {
    return entityToJSON(this.props);
  }
  
  // Getters 保持 camelCase（对外接口）
  get userId() { return this.props.user_id; }
  get username() { return this.props.username; }
  get displayName() { return this.props.display_name; }
  get email() { return this.props.email; }
  get role() { return this.props.role; }
  get avatar() { return this.props.avatar; }
  get permissions() { return this.props.permissions; }
  get createdAt() { return this.props.created_at; }
}

// 类型自动推断
type UserEntityJSON = ReturnType<UserEntity['toJSON']>;
// 结果：
// {
//   user_id: string;
//   username: string;
//   display_name: string;
//   email: string;
//   role: UserRole;
//   avatar?: string;
//   permissions: string[];
//   created_at: string; // Date → string
// }
```

---

## 类型系统全景图（方案 B）

### 输入侧（前端 → 后端）

```
前端请求（camelCase）
  ↓
Zod schema (验证，camelCase)
  ↓
CreateUserDTO (z.infer，camelCase)
  ↓
Service（转换为 snake_case）
  ↓
Entity Props (snake_case)
```

### 处理侧（后端内部）

```
Entity Props (snake_case) ← 单一数据源
  ↓
Repository
  ↓
Prisma schema (snake_case)
```

### 输出侧（后端 → 前端）

```
Entity Props (snake_case)
  ↓
entityToJSON() (自动转换 Date → string)
  ↓
EntityJSON (snake_case，类型自动推断)
  ↓
Service 返回
  ↓
Router 返回
  ↓
前端响应 (snake_case)
```

---

## 降熵效果对比

### 添加字段（对比）

**方案 A（当前）：需要改 3 处**

```typescript
// 1. Entity Props
interface UserEntityProps {
  newField: string; // 添加
}

// 2. EntityJSON
interface UserEntityJSON {
  new_field: string; // 添加（手动映射）
}

// 3. toJSON()
toJSON(): UserEntityJSON {
  return {
    // ...
    new_field: this.props.newField, // 添加（手动映射）
  };
}
```

**方案 B（新方案）：只需改 1 处**

```typescript
// 1. Entity Props（唯一数据源）
interface UserEntityProps {
  new_field: string; // 添加（snake_case）
}

// toJSON() 自动处理，不需要修改
// EntityJSON 自动推断，不需要定义
```

### 代码行数

- **删除**：14 个 EntityJSON interface（约 400 行）
- **删除**：14 个手动 toJSON() 实现（约 300 行）
- **删除**：15+ 个 DTO interface（约 300 行）
- **删除**：15+ 个 generateXxxId() 方法（约 150 行）
- **删除**：50+ 个 toJSON() 调用（约 50 行）
- **新增**：1 个 entityToJSON() 工具函数（约 30 行）
- **新增**：1 个 IdGenerator 工具类（约 50 行）
- **净减少**：约 1,120 行

### 维护成本

| 操作 | 方案 A（当前） | 方案 B（新方案） | 降低 |
|------|--------------|----------------|------|
| 添加字段 | 改 3 处 | 改 1 处 | 67% |
| 添加 Entity | 5 个文件 | 2 个文件 | 60% |
| 修改 ID 格式 | 15 处 | 1 处 | 93% |

---

## 实施计划（5 天）

### 阶段 0：创建通用工具（0.5 天）

**目标**：创建 entityToJSON 工具函数和 IdGenerator

#### 任务清单

- [ ] 创建 `code/backend/src/domain/common/entity-serializer.ts`
  - [ ] 实现 `entityToJSON()` 函数
  - [ ] 实现 `EntityJSON<T>` 类型
  - [ ] 处理 Date → ISO 8601
  - [ ] 处理数组递归
  - [ ] 处理嵌套对象递归
- [ ] 创建 `code/backend/src/common/utils/id-generator.ts`
  - [ ] 实现 `IdGenerator.generateId(prefix)` 方法
  - [ ] 实现 `IdGenerator.uuid()` 方法
  - [ ] 实现 `IdGenerator.shortId()` 方法
- [ ] 编写单元测试
  - [ ] `entity-serializer.test.ts`
  - [ ] `id-generator.test.ts`
- [ ] 运行测试，确保通过

#### 验收标准

```typescript
// entity-serializer.test.ts
describe('entityToJSON', () => {
  it('should convert Date to ISO 8601 string', () => {
    const props = {
      user_id: 'user_123',
      created_at: new Date('2026-05-16T15:00:00.000Z'),
    };
    const json = entityToJSON(props);
    expect(json.created_at).toBe('2026-05-16T15:00:00.000Z');
  });
  
  it('should handle nested objects', () => {
    const props = {
      user_id: 'user_123',
      profile: {
        toJSON: () => ({ name: 'Alice' }),
      },
    };
    const json = entityToJSON(props);
    expect(json.profile).toEqual({ name: 'Alice' });
  });
});
```

---

### 阶段 1：重构 Entity Props 为 snake_case（2 天）

**目标**：将所有 Entity Props 改为 snake_case，使用 entityToJSON

#### 任务清单

**Day 1：重构 UserEntity（示例）**

- [ ] 修改 `UserEntityProps` interface
  - [ ] `userId` → `user_id`
  - [ ] `displayName` → `display_name`
  - [ ] `createdAt` → `created_at`
  - [ ] 所有字段改为 snake_case
- [ ] 删除 `UserEntityJSON` interface
- [ ] 修改 `toJSON()` 方法
  - [ ] 删除手动映射代码
  - [ ] 改为 `return entityToJSON(this.props)`
- [ ] 更新 Getters
  - [ ] `get userId() { return this.props.user_id; }`
  - [ ] 保持 Getter 名称为 camelCase（对外接口）
- [ ] 更新 `create()` 和 `fromJSON()` 方法
  - [ ] 参数改为 snake_case
- [ ] 更新 UserRepository
  - [ ] `fromDbRecord()` 方法适配 snake_case
- [ ] 更新 UserService
  - [ ] 适配 snake_case Props
- [ ] 运行测试，修复失败的测试
- [ ] 确保所有测试通过

**Day 2：推广到其他 Entity**

- [ ] AgentEntity
- [ ] MessageEntity
- [ ] TaskEntity
- [ ] ChannelEntity
- [ ] ThreadEntity
- [ ] ProjectEntity
- [ ] WorkflowEntity
- [ ] ExecutionEntity
- [ ] MemberEntity
- [ ] ServerEntity
- [ ] ConversationEntity
- [ ] DeviceEntity
- [ ] OKREntity

每个 Entity 重复 Day 1 的步骤。

#### 验收标准

```typescript
// user.entity.test.ts
describe('UserEntity', () => {
  it('should use snake_case props', () => {
    const user = UserEntity.create({
      user_id: 'user_123',
      username: 'alice',
      display_name: 'Alice',
      email: 'alice@example.com',
      role: 'user',
      permissions: ['read'],
    });
    
    expect(user.userId).toBe('user_123'); // Getter 是 camelCase
    expect(user.displayName).toBe('Alice');
  });
  
  it('should auto-convert Date to string in toJSON', () => {
    const user = UserEntity.create({ /* ... */ });
    const json = user.toJSON();
    
    expect(json.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    expect(typeof json.created_at).toBe('string');
  });
});
```

---

### 阶段 2：统一 Zod Schema（1 天）

**目标**：消除 DTO interface 和 Zod schema 的重复定义

#### 任务清单

- [ ] 创建 `code/backend/src/application/schemas/` 目录
- [ ] 创建 `user.schema.ts`
  - [ ] 移动 `user.router.ts` 中的 schema
  - [ ] 定义 `createUserSchema`
  - [ ] 定义 `updateUserSchema`
  - [ ] 导出 `type CreateUserDTO = z.infer<typeof createUserSchema>`
- [ ] 删除 `user.service.ts` 中的 DTO interface
- [ ] 更新 `user.service.ts`
  - [ ] 导入 `CreateUserDTO` from `../schemas/user.schema`
- [ ] 更新 `user.router.ts`
  - [ ] 导入 `createUserSchema` from `@application/schemas/user.schema`
- [ ] 运行测试，确保通过
- [ ] 推广到其他 Schema
  - [ ] agent.schema.ts
  - [ ] message.schema.ts
  - [ ] task.schema.ts
  - [ ] channel.schema.ts
  - [ ] project.schema.ts
  - [ ] workflow.schema.ts
  - [ ] 等等...

#### 目录结构

```
src/application/
├── schemas/
│   ├── user.schema.ts
│   ├── agent.schema.ts
│   ├── message.schema.ts
│   ├── task.schema.ts
│   └── ...
└── services/
    ├── user/
    │   └── user.service.ts
    └── ...
```

#### 验收标准

```typescript
// application/schemas/user.schema.ts
export const createUserSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;

// user.service.ts
import { CreateUserDTO } from '../schemas/user.schema';
// 不再定义 interface CreateUserDTO

// user.router.ts
import { createUserSchema } from '@application/schemas/user.schema';
// 不再定义 const createUserSchema
```

---

### 阶段 3：Service 返回 DTO（1 天）

**目标**：修复分层违反，Service 返回 DTO 而不是 Entity

#### 任务清单

- [ ] 修改 UserService
  - [ ] 定义 `export type UserDTO = ReturnType<UserEntity['toJSON']>`
  - [ ] 修改 `createUser()` 返回类型：`Promise<UserEntity>` → `Promise<UserDTO>`
  - [ ] 修改 `createUser()` 返回值：`return user` → `return user.toJSON()`
  - [ ] 修改所有其他方法（updateUser, getUser, listUsers...）
- [ ] 修改 user.router.ts
  - [ ] 删除 `user.toJSON()` 调用
  - [ ] 直接返回 Service 的结果
- [ ] 运行测试，修复失败的测试
- [ ] 推广到其他 Service
  - [ ] AgentService
  - [ ] MessageService
  - [ ] TaskService
  - [ ] ChannelService
  - [ ] 等等...

#### 验收标准

```typescript
// user.service.ts
export type UserDTO = ReturnType<UserEntity['toJSON']>;

export class UserService {
  async createUser(dto: CreateUserDTO): Promise<UserDTO> {
    const user = UserEntity.create({
      user_id: IdGenerator.generateId('user'),
      username: dto.username,
      display_name: dto.displayName,
      email: dto.email,
      role: 'user',
      permissions: ['read'],
    });
    
    await this.userRepository.save(user);
    
    return user.toJSON(); // Service 调用 toJSON()
  }
}

// user.router.ts
create: publicProcedure
  .input(createUserSchema)
  .mutation(async ({ input }) => {
    return await userService.createUser(input); // 直接返回
  })
```

---

### 阶段 4：统一 ID 生成器（0.5 天）

**目标**：统一 ID 生成逻辑

#### 任务清单

- [ ] 使用阶段 0 创建的 `IdGenerator` 类
- [ ] 替换 UserService 中的 ID 生成逻辑
  - [ ] 删除 `generateUserId()` 方法
  - [ ] 改为 `IdGenerator.generateId('user')`
- [ ] 推广到其他 Service
  - [ ] AgentService: `IdGenerator.generateId('agent')`
  - [ ] MessageService: `IdGenerator.generateId('message')`
  - [ ] TaskService: `IdGenerator.generateId('task')`
  - [ ] 等等...
- [ ] 运行测试，确保通过

#### 验收标准

```typescript
// user.service.ts
import { IdGenerator } from '@common/utils/id-generator';

async createUser(dto: CreateUserDTO): Promise<UserDTO> {
  const user = UserEntity.create({
    user_id: IdGenerator.generateId('user'), // 统一生成
    // ...
  });
  // ...
}

// 删除
// private generateUserId(): string { ... }
```

---

### 阶段 5：测试和文档（0.5 天）

**目标**：确保所有测试通过，更新文档

#### 任务清单

- [ ] 运行完整测试套件
  ```bash
  cd code/backend
  npm test
  ```
- [ ] 修复所有失败的测试
- [ ] 检查测试覆盖率（应保持 90%+）
- [ ] 更新架构文档
  - [ ] 更新 `doc/architecture/backend-architecture.md`
  - [ ] 添加 Entity Props snake_case 说明
  - [ ] 添加 entityToJSON 工具说明
- [ ] Code Review
  - [ ] 检查所有 Entity 是否使用 snake_case
  - [ ] 检查所有 Service 是否返回 DTO
  - [ ] 检查所有 Router 是否删除 toJSON() 调用
- [ ] 提交代码
  ```bash
  git add .
  git commit -m "refactor: 降熵重构 - 全面 snake_case + 自动化 toJSON

  - Entity Props 全面采用 snake_case
  - 创建 entityToJSON 通用工具函数
  - 删除所有 EntityJSON interface
  - Service 返回 DTO 而不是 Entity
  - 统一 Zod Schema 定义
  - 统一 ID 生成器
  - 减少约 1,120 行重复代码
  - 降低 67% 维护成本
  
  Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  ```

---

## 预期收益

### 代码质量

- ✅ 真正的单一数据源（Entity Props）
- ✅ 符合 Clean Architecture 分层原则
- ✅ 自动化类型转换（entityToJSON）
- ✅ 统一 ID 生成逻辑
- ✅ 消除重复定义

### 维护成本

- ✅ 添加字段：从改 3 处 → 改 1 处（降低 67%）
- ✅ 添加 Entity：从 5 个文件 → 2 个文件（降低 60%）
- ✅ 修改 ID 格式：从 15 处 → 1 处（降低 93%）
- ✅ 减少约 1,120 行重复代码

### 类型安全

- ✅ 编译时类型检查（TypeScript）
- ✅ 运行时验证（Zod schema）
- ✅ 类型自动推断（EntityJSON）

### 架构清晰度

- ✅ 分层清晰（符合 Clean Architecture）
- ✅ 依赖方向正确（Infrastructure 不依赖 Domain）
- ✅ 单一数据源（Entity Props）
- ✅ 自动化转换（entityToJSON）

---

## 风险评估

### 低风险 ✅

- 阶段 0：创建新工具，不影响现有代码
- 阶段 2：只移动代码，不改逻辑
- 阶段 4：纯工具类，不影响业务

### 中风险 ⚠️

- 阶段 1：修改 Entity Props 命名，需要仔细测试
- 阶段 3：修改返回类型，需要仔细测试

### 缓解措施

- ✅ 每个阶段都运行测试
- ✅ 先在 UserEntity 上验证，再推广
- ✅ 保持测试覆盖率 90%+
- ✅ Code Review 检查

---

## 关键决策记录

### 决策 1：为什么选择 snake_case？

**问题**：Entity Props 用 camelCase 还是 snake_case？

**选项**：
- A. camelCase（符合 TypeScript 惯例）
- B. snake_case（与数据库和 API 一致）

**决策**：选择 B（snake_case）

**理由**：
1. 真正的单一数据源（不需要 EntityJSON）
2. 与 Prisma schema 完全一致
3. 与 API 响应完全一致
4. 最低熵、最简单、最易维护
5. 虽然违反 TypeScript 惯例，但收益远大于代价

### 决策 2：为什么自动化 toJSON()？

**问题**：toJSON() 手动实现还是自动化？

**选项**：
- A. 每个 Entity 手动实现（当前）
- B. 创建通用工具函数
- C. 使用继承（BaseEntity）

**决策**：选择 B（通用工具函数）

**理由**：
1. 避免重复代码（14 个 Entity）
2. 统一转换逻辑（Date → ISO 8601）
3. 类型安全（EntityJSON<T> 自动推断）
4. 不引入继承复杂度（避免 C）
5. 每个 Entity 只需一行代码调用

### 决策 3：Getters 用 camelCase 还是 snake_case？

**问题**：虽然 Props 用 snake_case，但 Getters 应该用什么？

**选项**：
- A. snake_case（与 Props 一致）
- B. camelCase（对外接口自然）

**决策**：选择 B（camelCase）

**理由**：
1. Getters 是对外接口，应该自然
2. 使用时 `user.userId` 比 `user.user_id` 更自然
3. 内部用 snake_case，外部用 camelCase，两全其美

---

## 总结

### 核心原则

1. **单一数据源** - Entity Props（snake_case）
2. **自动化** - entityToJSON() 通用工具
3. **类型安全** - 编译时 + 运行时
4. **清晰流向** - 前端 → Zod → Service → Entity → JSON → 前端

### 降熵效果

- **P0（必须）**：降低 60% 熵，工作量 5 天
- **代码减少**：约 1,120 行
- **维护成本**：降低 67%

### 关键创新

1. **全面 snake_case** - 真正的单一数据源
2. **自动化 toJSON()** - 通用工具函数，避免重复
3. **类型自动推断** - EntityJSON 不需要手动定义

---

## 附录

### A. entityToJSON 完整实现

见 `阶段 0` 的代码示例。

### B. IdGenerator 完整实现

```typescript
// common/utils/id-generator.ts
import { randomUUID } from 'crypto';

export class IdGenerator {
  /**
   * 生成 UUID v4
   */
  static uuid(): string {
    return randomUUID();
  }

  /**
   * 生成带前缀的 ID
   * @example generateId('user') => 'user_01h2x3y4z5'
   */
  static generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}${random}`;
  }

  /**
   * 生成短 ID（8 字符）
   */
  static shortId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
```

### C. 类型系统完整示例

```typescript
// Entity Props（单一数据源，snake_case）
interface UserEntityProps {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: string[];
  created_at: Date;
}

// Entity
export class UserEntity {
  private constructor(private readonly props: UserEntityProps) {}
  
  // 自动化 toJSON
  toJSON() {
    return entityToJSON(this.props);
  }
  
  // Getters（camelCase）
  get userId() { return this.props.user_id; }
  get displayName() { return this.props.display_name; }
  get createdAt() { return this.props.created_at; }
}

// EntityJSON（自动推断）
type UserEntityJSON = ReturnType<UserEntity['toJSON']>;
// 结果：
// {
//   user_id: string;
//   username: string;
//   display_name: string;
//   email: string;
//   role: UserRole;
//   avatar?: string;
//   permissions: string[];
//   created_at: string; // Date → string
// }

// Service DTO（类型别名）
export type UserDTO = UserEntityJSON;

// Zod Schema（输入验证）
export const createUserSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;

// Prisma Schema（数据库）
model User {
  user_id      String   @id
  username     String   @unique
  display_name String
  email        String   @unique
  role         String
  avatar       String?
  permissions  String[]
  created_at   DateTime @default(now())
}
```

---

**计划制定日期**: 2026-05-16  
**计划负责人**: Alice  
**预计完成日期**: 2026-05-23（5 个工作日）
