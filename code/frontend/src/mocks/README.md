# MSW (Mock Service Worker) 使用指南

## 概述

本项目已集成 MSW 2.x，提供统一的 API Mock 方案，支持开发环境和测试环境。

## 目录结构

```
src/mocks/
├── browser.ts              # 浏览器环境配置
├── server.ts               # Node 环境配置（测试）
├── config.ts               # 全局配置
├── handlers/               # API Handlers
│   ├── index.ts
│   └── channel.handlers.ts
├── fixtures/               # Mock 数据
│   ├── index.ts
│   └── channel.fixtures.ts
└── utils/                  # 工具函数
    ├── response.ts         # 响应构造
    └── database.ts         # 内存数据库
```

## 开发环境使用

### 启动开发服务器

```bash
npm run dev
```

MSW 会自动启动，拦截所有 API 请求并返回 Mock 数据。

### 查看日志

打开浏览器控制台，可以看到：
- `[MSW]` 启动日志
- `[MSW] Success Response:` 成功响应
- `[MSW] Error Response:` 错误响应

### 配置延迟

在 `src/mocks/config.ts` 中调整：

```typescript
delay: {
  default: 300,  // 默认延迟 300ms
  min: 100,
  max: 1000,
  random: true,  // 随机延迟
}
```

## 测试环境使用

### 运行测试

```bash
npm run test
```

MSW 会自动在测试环境启动，延迟设置为 0ms。

### 编写测试

#### 方式 1: 使用 MSW Handlers（推荐）

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentChannelApiClient } from './client';
import { resetMsw } from '@/test/msw-utils';

describe('API Tests', () => {
  const client = new AgentChannelApiClient();

  beforeEach(() => {
    resetMsw(); // 重置 MSW 状态
  });

  it('应该获取消息列表', async () => {
    const result = await client.getMessages('channel-1');
    expect(result.messages).toBeInstanceOf(Array);
  });
});
```

#### 方式 2: 模拟错误场景

```typescript
import { mockEndpointError } from '@/test/msw-utils';

it('应该处理 404 错误', async () => {
  mockEndpointError('get', '/api/channels/channel-1', 'notFound');
  
  await expect(
    client.getChannel('channel-1')
  ).rejects.toThrow('not found');
});
```

## 添加新的 API Handlers

### 1. 创建 Fixtures

在 `src/mocks/fixtures/` 创建新文件：

```typescript
// src/mocks/fixtures/project.fixtures.ts
export const projectFixtures = [
  {
    id: 'project-1',
    name: 'My Project',
    // ...
  },
];
```

### 2. 创建 Handlers

在 `src/mocks/handlers/` 创建新文件：

```typescript
// src/mocks/handlers/project.handlers.ts
import { http } from 'msw';
import { createSuccessResponse, ErrorResponses } from '../utils/response';

export const projectHandlers = [
  http.get('/api/projects/:id', async ({ params }) => {
    const { id } = params;
    // 实现逻辑
    return createSuccessResponse(data);
  }),
];
```

### 3. 注册 Handlers

在 `src/mocks/handlers/index.ts` 中导出：

```typescript
import { projectHandlers } from './project.handlers';

export const handlers = [
  ...channelHandlers,
  ...projectHandlers, // 添加新的 handlers
];
```

## 常见错误响应

MSW 提供了预定义的错误响应：

```typescript
import { ErrorResponses } from '@/mocks/utils/response';

// 401 未授权
ErrorResponses.unauthorized()

// 403 禁止访问
ErrorResponses.forbidden()

// 404 未找到
ErrorResponses.notFound('Resource', 'id-123')

// 422 验证错误
ErrorResponses.validationError('Invalid input')

// 500 服务器错误
ErrorResponses.serverError()

// 503 服务不可用
ErrorResponses.serviceUnavailable()
```

## 内存数据库

MSW 使用内存数据库管理状态：

```typescript
import { db } from '@/mocks/utils/database';

// 获取数据
const message = db.getMessage('msg-1');
const messages = db.getMessages('channel-1', { limit: 10 });

// 创建数据
db.createMessage(newMessage);

// 更新数据
db.updateMessage('msg-1', { content: 'Updated' });

// 删除数据
db.deleteMessage('msg-1', 'user-1');

// 重置数据库（测试隔离）
db.reset();
```

## 配置选项

在 `src/mocks/config.ts` 中配置：

```typescript
export const mswConfig = {
  enabled: true,           // 是否启用 MSW
  
  delay: {
    default: 300,          // 默认延迟（ms）
    min: 100,              // 最小延迟
    max: 1000,             // 最大延迟
    random: true,          // 是否随机延迟
  },
  
  errors: {
    enabled: false,        // 是否启用随机错误
    probability: 0.1,      // 错误概率（0-1）
  },
  
  logging: {
    requests: true,        // 是否记录请求
    responses: true,       // 是否记录响应
  },
};
```

## 最佳实践

1. **测试隔离**: 每个测试前调用 `resetMsw()` 重置状态
2. **类型安全**: 复用现有类型定义，避免重复
3. **响应格式**: 严格遵循 `ApiResponse<T>` 接口
4. **错误优先**: 优先实现错误场景，确保健壮性
5. **渐进迁移**: 保留现有 Mock，逐步迁移到 MSW

## 示例

完整示例请参考：
- `src/features/channel/api/client.msw.test.ts` - MSW 集成测试
- `src/mocks/handlers/channel.handlers.ts` - Handlers 实现
- `src/mocks/fixtures/channel.fixtures.ts` - Mock 数据

## 故障排查

### MSW 未启动

检查浏览器控制台是否有 `[MSW]` 日志。如果没有：
1. 确认 `public/mockServiceWorker.js` 存在
2. 检查 `src/main.tsx` 中的 MSW 初始化代码

### 请求未被拦截

1. 检查 handler 的 URL 是否匹配
2. 确认 HTTP 方法是否正确
3. 查看控制台是否有 `onUnhandledRequest` 警告

### 测试失败

1. 确认已调用 `resetMsw()` 重置状态
2. 检查是否有其他 Mock 冲突（如 `vi.fn()`）
3. 验证响应格式是否符合 `ApiResponse<T>`

## 参考资料

- [MSW 官方文档](https://mswjs.io/)
- [MSW GitHub](https://github.com/mswjs/msw)
- [MSW 2.0 迁移指南](https://mswjs.io/docs/migrations/1.x-to-2.x)
