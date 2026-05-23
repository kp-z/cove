# Claude Code CLI Adapter 系统对接架构

## 概述

Claude Code CLI Adapter 通过标准的 **LlmAdapter 接口**与 Cove 系统对接，采用**工厂模式**和**依赖注入**实现松耦合的架构设计。

## 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    前端 / API 客户端                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/tRPC
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer (tRPC Router)            │
│                  adapter.router.ts                       │
│  - create, list, getById, update, delete                │
│  - getAvailableModels, testConnection                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│            Application Layer (Service)                   │
│                 AdapterService                           │
│  - 配置管理（CRUD）                                       │
│  - 权限控制（shared/private）                            │
│  - API Key 解析                                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│           Infrastructure Layer (Factory)                 │
│              LlmAdapterFactory                           │
│  - 根据配置创建 Adapter 实例                              │
│  - 支持多种 Adapter 类型                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Anthropic    │ │   OpenAI     │ │ Claude Code CLI  │
│   Adapter    │ │   Adapter    │ │     Adapter      │
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘
       │                │                   │
       ▼                ▼                   ▼
  Anthropic API    OpenAI API         Claude CLI
```

## 核心接口协议

### 1. LlmAdapter 接口

所有 Adapter 必须实现的统一接口：

```typescript
// src/infrastructure/adapters/llm/llm-adapter.interface.ts

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateParams {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface LlmAdapter {
  generateResponse(params: GenerateParams): Promise<string>;
}
```

**协议说明**：
- **输入**: `GenerateParams` - 包含系统提示、消息历史、可选的 token 限制
- **输出**: `Promise<string>` - 返回 LLM 生成的文本响应
- **异步**: 所有实现都是异步的，支持长时间运行的 API 调用

### 2. AdapterConfig 配置协议

```typescript
// src/domain/models/adapter/adapter-config.entity.ts

export type AdapterType = 'anthropic-api' | 'openai-api' | 'claude-code-cli';
export type AdapterScope = 'shared' | 'private';

export interface BaseAdapterConfig {
  id: string;
  name: string;
  description?: string;
  type: AdapterType;
  scope: AdapterScope;
  owner_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClaudeCodeCLIAdapterConfig extends BaseAdapterConfig {
  type: 'claude-code-cli';
  config: {
    cli_path?: string;
    model?: string;
    working_dir?: string;
    timeout_ms?: number;
    enable_streaming?: boolean;
    // ... 其他配置选项
  };
}
```

**配置说明**：
- **类型安全**: 使用 TypeScript 联合类型确保配置正确
- **作用域**: 支持 shared（共享）和 private（私有）两种作用域
- **验证**: 使用 Zod schema 进行运行时验证

## 数据流程

### 创建 Adapter 配置

```
1. 前端发送请求
   POST /trpc/adapter.create
   {
     "name": "My Claude CLI",
     "scope": "private",
     "adapter": {
       "type": "claude-code-cli",
       "config": {
         "cli_path": "claude",
         "model": "opus"
       }
     }
   }

2. tRPC Router 接收请求
   adapter.router.ts: create()
   ↓
3. AdapterService 处理
   - 生成 UUID
   - 验证配置（Zod schema）
   - 检查权限
   - 保存到数据库
   ↓
4. 返回配置对象
   {
     "id": "uuid-xxx",
     "name": "My Claude CLI",
     "type": "claude-code-cli",
     "config": {...},
     "created_at": "2026-05-23T...",
     "updated_at": "2026-05-23T..."
   }
```

### 使用 Adapter 生成响应

```
1. 获取 Adapter 配置
   const config = await adapterService.getById(adapterId, actorId);

2. 创建 Adapter 实例
   const factory = new LlmAdapterFactory(adapterService);
   const adapter = await factory.createFromConfig(config);
   
   // 工厂根据 config.type 创建对应的实例
   // 'claude-code-cli' → ClaudeCodeCLIAdapter

3. 调用 Adapter
   const response = await adapter.generateResponse({
     systemPrompt: 'You are a helpful assistant',
     messages: [
       { role: 'user', content: 'Hello!' }
     ]
   });

4. 返回响应
   response: "Hello! I'm claude-opus-4-7..."
```

## tRPC API 端点

### 配置管理 API

```typescript
// 创建 Adapter
adapter.create({
  name: string,
  description?: string,
  scope: 'shared' | 'private',
  owner_id?: string,
  adapter: {
    type: 'claude-code-cli',
    config: {...}
  }
})

// 列出所有 Adapter
adapter.list()

// 按作用域列出
adapter.listByScope({
  scope: 'shared' | 'private',
  owner_id?: string
})

// 获取单个 Adapter
adapter.getById({
  adapterId: string
})

// 更新 Adapter
adapter.update({
  adapterId: string,
  data: {
    name?: string,
    description?: string,
    adapter?: {...}
  }
})

// 删除 Adapter
adapter.delete({
  adapterId: string
})
```

### 功能 API

```typescript
// 获取可用模型列表
adapter.getAvailableModels({
  adapterId: string
})

// 测试连接
adapter.testConnection({
  adapterId: string
})

// 获取 Adapter 类型元数据
adapter.getAdapterTypes()

// 获取单个类型元数据
adapter.getAdapterType({
  type: 'claude-code-cli'
})
```

## 权限控制

### 作用域规则

1. **Shared Adapter**:
   - 所有用户可读
   - 只有 owner 可写
   - 创建时必须是自己的 owner_id

2. **Private Adapter**:
   - 只有 owner 可读写
   - 其他用户完全不可见

### 权限检查流程

```typescript
// AdapterService.getById()
if (config.scope === 'private' && config.owner_id !== actorId) {
  throw new Error('Access denied');
}

// AdapterService.update()
if (config.owner_id !== actorId) {
  throw new Error('Access denied');
}
```

## 工厂模式实现

### LlmAdapterFactory

```typescript
export class LlmAdapterFactory {
  constructor(private readonly adapterService: AdapterService) {}

  async createFromConfig(config: AdapterConfig): Promise<LlmAdapter> {
    switch (config.type) {
      case 'anthropic-api':
        return new AnthropicAdapter(...);
      
      case 'openai-api':
        return new OpenAIAdapter(...);
      
      case 'claude-code-cli':
        return new ClaudeCodeCLIAdapter({
          cliPath: config.config.cli_path,
          model: config.config.model,
          workingDir: config.config.working_dir,
          timeout: config.config.timeout_ms,
          enableStreaming: config.config.enable_streaming,
        });
      
      default:
        throw new Error(`Unknown adapter type: ${config.type}`);
    }
  }

  async createById(adapterId: string, actorId: string): Promise<LlmAdapter> {
    const config = await this.adapterService.getById(adapterId, actorId);
    return await this.createFromConfig(config);
  }
}
```

**优势**：
- **解耦**: 调用方不需要知道具体的 Adapter 实现
- **扩展**: 添加新 Adapter 只需修改工厂类
- **类型安全**: TypeScript 确保配置类型正确

## 依赖注入

### 主入口配置

```typescript
// src/main.ts

// 1. 创建存储层
const adapterStore = new HybridAdapterConfigStore(storageService, prisma);

// 2. 创建服务层
const adapterService = new AdapterService(adapterStore);
const adapterMetadataService = new AdapterMetadataService();

// 3. 创建工厂
const llmAdapterFactory = new LlmAdapterFactory(adapterService);

// 4. 创建路由
const adapterRouter = createAdapterRouter({
  adapterService,
  adapterMetadataService,
});

// 5. 注册到 tRPC
const appRouter = router({
  adapter: adapterRouter,
  // ... 其他路由
});
```

## 存储层

### 混合存储策略

```typescript
// HybridAdapterConfigStore

// 数据库存储（索引字段）
Prisma Model AdapterConfig {
  id: string
  name: string
  type: string
  scope: string
  owner_id: string
  created_at: DateTime
  updated_at: DateTime
}

// 文件存储（完整配置）
~/.cove/storage/adapters/{adapterId}.json
{
  "id": "uuid-xxx",
  "name": "My Claude CLI",
  "type": "claude-code-cli",
  "config": {
    "cli_path": "claude",
    "model": "opus",
    ...
  }
}
```

**优势**：
- 数据库：快速查询和过滤
- 文件：完整配置存储，易于备份

## 错误处理

### 错误映射

```typescript
// common/errors.ts

export function mapErrorToTRPC(error: any): TRPCError {
  if (error.message.includes('not found')) {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: error.message,
    });
  }
  
  if (error.message.includes('Access denied')) {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: error.message,
    });
  }
  
  // ... 其他错误映射
}
```

### Adapter 错误处理

```typescript
// ClaudeCodeCLIAdapter

async generateResponse(params: GenerateParams): Promise<string> {
  try {
    const output = await this.executeCli(args);
    return this.parseOutput(output);
  } catch (error) {
    throw new Error(`Claude CLI execution failed: ${error.message}`);
  }
}
```

## 测试策略

### 单元测试

```typescript
// claude-code-cli-adapter.test.ts
- Mock child_process.spawn
- 测试所有参数组合
- 测试错误场景
```

### 集成测试

```typescript
// claude-code-cli-adapter.integration.test.ts
- 实际调用 CLI（如果可用）
- 验证真实响应
- 性能测试
```

### E2E 测试

```typescript
// scripts/test-cli-adapter-e2e.ts
- 完整的配置 → 创建 → 调用流程
- 真实的 API 调用
- 验证系统集成
```

## 扩展性

### 添加新 Adapter

1. **创建 Adapter 类**:
   ```typescript
   export class NewAdapter implements LlmAdapter {
     async generateResponse(params: GenerateParams): Promise<string> {
       // 实现
     }
   }
   ```

2. **添加配置类型**:
   ```typescript
   export interface NewAdapterConfig extends BaseAdapterConfig {
     type: 'new-adapter';
     config: {
       // 配置字段
     };
   }
   ```

3. **更新工厂**:
   ```typescript
   case 'new-adapter':
     return new NewAdapter(config.config);
   ```

4. **添加验证 Schema**:
   ```typescript
   export const newAdapterConfigSchema = z.object({
     // Zod schema
   });
   ```

## 总结

### 核心协议

1. **接口协议**: `LlmAdapter` 接口
   - 输入: `GenerateParams`
   - 输出: `Promise<string>`

2. **配置协议**: `AdapterConfig` 类型
   - 类型: `AdapterType`
   - 作用域: `AdapterScope`
   - 配置: 类型特定的 `config` 对象

3. **API 协议**: tRPC 端点
   - 配置管理: CRUD 操作
   - 功能: 模型发现、连接测试

### 架构优势

- ✅ **松耦合**: 通过接口和工厂模式解耦
- ✅ **类型安全**: TypeScript + Zod 双重保障
- ✅ **可扩展**: 易于添加新 Adapter
- ✅ **权限控制**: 完善的作用域和权限检查
- ✅ **错误处理**: 统一的错误映射机制
- ✅ **测试友好**: 清晰的层次便于测试

### 关键文件

- `llm-adapter.interface.ts` - 核心接口定义
- `llm-adapter-factory.ts` - 工厂实现
- `adapter-config.entity.ts` - 配置类型定义
- `adapter.service.ts` - 业务逻辑
- `adapter.router.ts` - API 端点
- `claude-code-cli-adapter.ts` - CLI Adapter 实现
