# 错误处理系统

## 概述

本项目采用统一的三层错误继承体系，提供类型安全的错误处理和自动的 HTTP 状态码映射。

## 错误层次结构

```
AppError (抽象基类)
├── BusinessError (4xx 业务错误)
│   ├── NotFoundError (404)
│   ├── ValidationError (400)
│   ├── ConflictError (409)
│   ├── StateError (422)
│   └── AuthorizationError (403)
└── SystemError (5xx 系统错误)
    ├── InternalError (500)
    └── ExternalServiceError (502)
```

## 核心概念

### 1. 错误码系统

每个错误都有一个唯一的错误码，格式为 `ENTITY_CONDITION`：

```typescript
// 示例错误码
AGENT_NOT_FOUND
USER_ALREADY_EXISTS
CHANNEL_NOT_ACTIVE
TASK_NOT_ASSIGNABLE
```

错误码在 `error-codes.ts` 中集中管理，便于维护和查找。

### 2. HTTP 状态码映射

错误类自动映射到相应的 HTTP 状态码：

- `NotFoundError` → 404
- `ValidationError` → 400
- `ConflictError` → 409
- `StateError` → 422
- `AuthorizationError` → 403
- `InternalError` → 500
- `ExternalServiceError` → 502

### 3. 上下文信息

所有错误都支持附加上下文信息：

```typescript
throw new UserNotFoundError('user-123', {
  requestId: 'req-456',
  timestamp: new Date().toISOString()
});
```

## 使用指南

### 创建新的错误类

1. **在相应的服务模块中定义错误类**

```typescript
// src/application/services/user/user.errors.ts
import { NotFoundError } from '../../../common/errors';
import { ErrorCode } from '../../../common/errors/error-codes';

export class UserNotFoundError extends NotFoundError {
  constructor(userId: string, context?: Record<string, any>) {
    super(
      ErrorCode.USER_NOT_FOUND,
      `User with ID ${userId} not found`,
      context
    );
    this.name = 'UserNotFoundError';
  }
}
```

2. **注册错误码**

```typescript
// src/common/errors/error-codes.ts
export const ErrorCode = {
  // ... 其他错误码
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;
```

### 在服务层抛出错误

```typescript
// src/application/services/user/user.service.ts
import { UserNotFoundError } from './user.errors';

export class UserService {
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    
    return user;
  }
}
```

### 在 tRPC 路由中处理错误

使用 `mapErrorToTRPC` 函数自动将应用错误映射为 tRPC 错误：

```typescript
// src/infrastructure/trpc/routers/user.router.ts
import { mapErrorToTRPC } from '../../../common/errors';

export const userRouter = (userService: UserService) =>
  router({
    getById: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        try {
          const user = await userService.getUserById(input.userId);
          return user.toJSON();
        } catch (error: any) {
          throw mapErrorToTRPC(error);
        }
      }),
  });
```

## 错误类型选择指南

### BusinessError 子类

用于表示客户端错误（4xx），通常是由于无效的请求或业务规则违反：

- **NotFoundError**: 资源不存在
  - 示例：用户不存在、项目不存在
  
- **ValidationError**: 输入验证失败
  - 示例：邮箱格式错误、必填字段缺失
  
- **ConflictError**: 资源冲突
  - 示例：用户名已存在、重复创建
  
- **StateError**: 状态不允许操作
  - 示例：任务状态不允许删除、工作流未激活
  
- **AuthorizationError**: 权限不足
  - 示例：非频道成员无法发送消息、无权删除他人消息

### SystemError 子类

用于表示服务器错误（5xx），通常是由于系统故障或外部依赖失败：

- **InternalError**: 内部系统错误
  - 示例：数据库连接失败、LLM 调用失败
  
- **ExternalServiceError**: 外部服务错误
  - 示例：第三方 API 超时、外部服务不可用

## 最佳实践

### 1. 错误消息应该清晰且可操作

❌ 不好：
```typescript
throw new NotFoundError('NOT_FOUND', 'Not found');
```

✅ 好：
```typescript
throw new UserNotFoundError(userId);
// 消息: "User with ID user-123 not found"
```

### 2. 使用具体的错误类而不是通用错误

❌ 不好：
```typescript
throw new Error('User not found');
```

✅ 好：
```typescript
throw new UserNotFoundError(userId);
```

### 3. 在适当的层级抛出错误

- **Domain/Service 层**: 抛出业务错误
- **Infrastructure 层**: 抛出系统错误
- **Router 层**: 使用 `mapErrorToTRPC` 转换错误

### 4. 添加有用的上下文信息

```typescript
throw new TaskNotAssignableError(taskId, {
  currentStatus: task.status,
  requiredStatus: 'pending',
  attemptedBy: userId
});
```

### 5. 不要捕获后重新抛出通用错误

❌ 不好：
```typescript
try {
  await userService.getUserById(userId);
} catch (error) {
  throw new Error('Failed to get user');
}
```

✅ 好：
```typescript
// 让原始错误向上传播
const user = await userService.getUserById(userId);
```

## 测试错误处理

### 单元测试示例

```typescript
describe('UserService', () => {
  it('should throw UserNotFoundError when user does not exist', async () => {
    const userService = new UserService(mockRepository);
    
    await expect(
      userService.getUserById('non-existent-id')
    ).rejects.toThrow(UserNotFoundError);
  });
});
```

### 集成测试示例

```typescript
describe('User Router', () => {
  it('should return 404 when user not found', async () => {
    const caller = router.createCaller({});
    
    await expect(
      caller.user.getById({ userId: 'non-existent-id' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('not found')
    });
  });
});
```

## 迁移指南

### 从旧的错误处理迁移

如果你的代码使用了旧的错误处理方式：

**旧方式：**
```typescript
if (!user) {
  throw new Error('User not found');
}
```

**新方式：**
```typescript
if (!user) {
  throw new UserNotFoundError(userId);
}
```

**旧方式（tRPC 路由）：**
```typescript
} catch (error: any) {
  if (error.message?.includes('not found')) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Failed to fetch user',
  });
}
```

**新方式（tRPC 路由）：**
```typescript
} catch (error: any) {
  throw mapErrorToTRPC(error);
}
```

## 常见问题

### Q: 什么时候应该创建新的错误类？

A: 当你需要表示一个特定的业务场景或错误条件时。如果现有的错误类（如 `NotFoundError`）不够具体，就创建一个新的子类。

### Q: 错误码应该如何命名？

A: 使用 `ENTITY_CONDITION` 格式，例如 `USER_NOT_FOUND`、`TASK_NOT_ASSIGNABLE`。保持简洁且描述性强。

### Q: 是否应该在每个层都捕获错误？

A: 不需要。让错误向上传播到 tRPC 路由层，在那里使用 `mapErrorToTRPC` 统一处理。只在需要添加上下文或转换错误类型时才捕获。

### Q: 如何处理未知错误？

A: `mapErrorToTRPC` 会自动将未知错误映射为 `INTERNAL_SERVER_ERROR`。确保记录这些错误以便调试。

## 相关文件

- `src/common/errors/base.errors.ts` - 基础错误类
- `src/common/errors/business.errors.ts` - 业务错误类
- `src/common/errors/system.errors.ts` - 系统错误类
- `src/common/errors/error-codes.ts` - 错误码注册表
- `src/common/errors/trpc-mapper.ts` - tRPC 错误映射器
