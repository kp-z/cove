# Adapter 配置管理系统 - 详细实施计划

## 📋 计划状态

**当前阶段**: Phase 4 - Agent 集成和迁移 ✅ 已完成（包括实际迁移）  
**最后更新**: 2026-05-17  
**预计完成**: 3-4 天（仅剩 Phase 5 - 前端集成）

## ✨ P0/P1 改进项已集成

本计划已整合以下关键改进：

### P0（必须解决）✅
1. **敏感信息加密存储**：使用 `api_key_ref` 引用环境变量，集成 `SecretManager` 服务
2. **配置验证严格化**：使用 Zod discriminatedUnion 为每个 Adapter 类型定义严格 schema
3. **事务支持**：API 层使用事务确保 Adapter 创建和 Agent 创建的原子性

### P1（强烈建议）✅
4. **审计日志**：集成 `AuditLogger` 服务，记录所有配置变更
5. **并发控制**：使用 `LockManager` 和 proper-lockfile 防止文件并发写入冲突
6. **详细的迁移脚本**：Phase 4 包含完整的迁移策略

---

## 1. 概述

### 1.1 目标
设计并实现一个灵活、解耦、易于管理的 Adapter 配置系统，使每个 Agent 可以使用不同的 Adapter 和配置，同时保持代码结构简洁。

### 1.2 核心设计理念
- **配置与实体分离**：Adapter 配置独立于 Agent 实体
- **作用域管理**：通过 shared/private 区分共享和私有配置
- **推荐独立配置**：每个 Agent 默认创建私有 Adapter，互不影响
- **支持共享模式**：高级场景下支持多个 Agent 引用同一配置
- **安全优先**：敏感信息加密存储，严格的配置验证
- **可靠性保障**：事务支持、并发控制、审计日志

---

## 2. 数据模型设计

### 2.1 AdapterConfig 实体

```typescript
// src/domain/models/adapter/adapter-config.entity.ts

export type AdapterType = 'anthropic-api' | 'openai-api' | 'claude-code-cli';
export type AdapterScope = 'shared' | 'private';

export interface BaseAdapterConfig {
  id: string;                    // 唯一标识
  name: string;                  // 配置名称
  type: AdapterType;             // Adapter 类型
  scope: AdapterScope;           // 作用域
  owner_id?: string;             // 所有者（private 时必填）
  created_at: Date;
  updated_at: Date;
}

// Anthropic API 配置
export interface AnthropicAdapterConfig extends BaseAdapterConfig {
  type: 'anthropic-api';
  config: {
    api_key_ref: string;         // 密钥引用（如 "env:ANTHROPIC_API_KEY"）
    model: string;
    base_url?: string;
    temperature?: number;
    max_tokens?: number;
    context?: {
      max_context_tokens?: number;
    };
    retry?: {
      max_retries?: number;
      initial_delay_ms?: number;
    };
  };
}

// OpenAI API 配置
export interface OpenAIAdapterConfig extends BaseAdapterConfig {
  type: 'openai-api';
  config: {
    api_key_ref: string;         // 密钥引用（如 "env:OPENAI_API_KEY"）
    model: string;
    base_url?: string;
    temperature?: number;
    max_tokens?: number;
    context?: {
      max_context_tokens?: number;
    };
    retry?: {
      max_retries?: number;
      initial_delay_ms?: number;
    };
  };
}

// Claude Code CLI 配置
export interface ClaudeCodeCLIAdapterConfig extends BaseAdapterConfig {
  type: 'claude-code-cli';
  config: {
    cli_path?: string;
    model?: string;
    context_window?: number;
    retry?: {
      max_retries?: number;
      initial_delay_ms?: number;
    };
  };
}

export type AdapterConfig = 
  | AnthropicAdapterConfig 
  | OpenAIAdapterConfig 
  | ClaudeCodeCLIAdapterConfig;
```

### 2.2 Agent 实体更新

**设计原则：只修改 runtime_config 内部，不在外层新增字段。所有配置都移到 Adapter，Agent 只保留 adapter_id 引用。**

```typescript
// src/domain/models/agent/agent.entity.ts

export interface AgentRuntimeConfig {
  // 唯一保留的字段：引用 AdapterConfig
  adapter_id?: string;
  
  // 以下所有字段标记为 @deprecated，保留用于向后兼容
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  provider?: 'anthropic' | 'openai' | 'claude-code-cli';
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  model_name?: string;
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  temperature?: number;
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  max_tokens?: number;
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  api?: {
    base_url?: string;
    api_key?: string;
  };
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  cli?: {
    command?: string;
    args?: string[];
  };
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  context?: {
    max_context_tokens?: number;
  };
  
  /** @deprecated Use adapter_id instead. Will be removed in future version. */
  retry?: {
    max_retries?: number;
    initial_delay_ms?: number;
  };
}

export interface Agent {
  id: string;
  name: string;
  runtime_config: AgentRuntimeConfig;  // 包含 adapter_id 或旧的内联配置
  persona_config?: PersonaConfig;
  // ... 其他字段
}
```

**向后兼容加载逻辑：**

```typescript
// src/application/services/agent/agent-response.service.ts

async getAdapter(agent: Agent): Promise<LlmAdapter> {
  const config = agent.runtime_config;
  
  // 优先使用新的 adapter_id
  if (config.adapter_id) {
    return await this.adapterFactory.createFromAdapterId(config.adapter_id);
  }
  
  // 回退到旧的内联配置（向后兼容）
  if (config.provider) {
    console.warn(
      `Agent ${agent.id} using deprecated inline config. ` +
      `Consider migrating to adapter_id.`
    );
    return createLlmAdapterFromConfig(config);
  }
  
  throw new Error(`No adapter configuration found for agent ${agent.id}`);
}
```

### 2.3 配置文件结构

```
.cove/
├── adapters/
│   ├── shared/
│   │   ├── anthropic-default.yaml
│   │   ├── openai-gpt4.yaml
│   │   └── claude-cli-default.yaml
│   └── private/
│       ├── agent-123-anthropic.yaml
│       └── agent-456-openai.yaml
└── agents/
    ├── agent-123/
    │   └── runtime.yaml          # 包含 adapter_id: "agent-123-anthropic"
    └── agent-456/
        └── runtime.yaml          # 包含 adapter_id: "agent-456-openai"
```

**runtime.yaml 示例（新格式）：**

```yaml
# .cove/agents/agent-123/runtime.yaml
adapter_id: "agent-123-anthropic"
```

**runtime.yaml 示例（旧格式 - 仍然支持，但所有字段已 deprecated）：**

```yaml
# .cove/agents/agent-456/runtime.yaml
provider: "anthropic"
model_name: "claude-3-5-sonnet-20241022"
api:
  base_url: "https://api.anthropic.com"
  api_key: "sk-xxx"
temperature: 0.7
max_tokens: 4096
context:
  max_context_tokens: 100000
retry:
  max_retries: 3
  initial_delay_ms: 1000
```

---

## 2.4 配置验证 Schema

```typescript
// src/domain/models/adapter/adapter-config.validation.ts

import { z } from 'zod';

// 密钥引用格式：env:VAR_NAME 或 vault:path/to/secret
const apiKeyRefSchema = z.string().regex(/^(env|vault):.+$/);

const contextSchema = z.object({
  max_context_tokens: z.number().int().positive().optional(),
}).optional();

const retrySchema = z.object({
  max_retries: z.number().int().min(0).optional(),
  initial_delay_ms: z.number().int().positive().optional(),
}).optional();

export const anthropicConfigSchema = z.object({
  type: z.literal('anthropic-api'),
  config: z.object({
    api_key_ref: apiKeyRefSchema,
    model: z.string().min(1),
    base_url: z.string().url().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    context: contextSchema,
    retry: retrySchema,
  }),
});

export const openaiConfigSchema = z.object({
  type: z.literal('openai-api'),
  config: z.object({
    api_key_ref: apiKeyRefSchema,
    model: z.string().min(1),
    base_url: z.string().url().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    context: contextSchema,
    retry: retrySchema,
  }),
});

export const claudeCodeCLIConfigSchema = z.object({
  type: z.literal('claude-code-cli'),
  config: z.object({
    cli_path: z.string().optional(),
    model: z.string().optional(),
    context_window: z.number().int().positive().optional(),
    retry: retrySchema,
  }),
});

export const adapterConfigSchema = z.discriminatedUnion('type', [
  anthropicConfigSchema,
  openaiConfigSchema,
  claudeCodeCLIConfigSchema,
]);
```

## 2.5 SecretManager 服务

```typescript
// src/application/services/secret/secret-manager.service.ts

export interface ISecretManager {
  resolve(ref: string): Promise<string>;
}

export class SecretManager implements ISecretManager {
  async resolve(ref: string): Promise<string> {
    const [type, path] = ref.split(':', 2);
    
    switch (type) {
      case 'env':
        const value = process.env[path];
        if (!value) {
          throw new Error(`Environment variable not found: ${path}`);
        }
        return value;
      
      case 'vault':
        // TODO: 集成 Vault 或其他密钥管理服务
        throw new Error('Vault integration not implemented yet');
      
      default:
        throw new Error(`Unknown secret type: ${type}`);
    }
  }
}
```

## 2.6 AuditLogger 服务

```typescript
// src/application/services/audit/audit-logger.service.ts

export interface AuditLogEntry {
  id: string;
  action: string;
  actor_id: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, any>;
  timestamp: Date;
}

export interface IAuditLogger {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  query(filters: AuditLogFilters): Promise<AuditLogEntry[]>;
}

export class AuditLogger implements IAuditLogger {
  constructor(private storage: IAuditLogStore) {}

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: generateId(),
      ...entry,
      timestamp: new Date(),
    };
    
    await this.storage.save(logEntry);
  }

  async query(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    return await this.storage.query(filters);
  }
}
```

---

## 3. API 设计

### 3.1 Agent 相关端点

#### 3.1.1 创建 Agent（自动创建私有 Adapter）

**推荐模式**：创建 Agent 时自动创建私有 Adapter

```typescript
// agent.router.ts
create: protectedProcedure
  .input(z.object({
    name: z.string(),
    adapter: adapterConfigSchema,  // 使用严格的验证 schema
    persona_config: z.object({...}).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 使用事务确保原子性
    return await ctx.db.transaction(async (tx) => {
      // 1. 创建私有 Adapter
      const adapter = await ctx.adapterService.createPrivate({
        name: `${input.name}-adapter`,
        type: input.adapter.type,
        config: input.adapter.config,
        owner_id: ctx.user.id,
      }, tx);
      
      try {
        // 2. 创建 Agent，关联 Adapter
        const agent = await ctx.agentService.create({
          name: input.name,
          adapter_id: adapter.id,
          persona_config: input.persona_config,
        }, tx);
        
        return agent;
      } catch (error) {
        // 事务会自动回滚
        throw error;
      }
    });
  })
```

#### 3.1.2 更新 Agent 的私有 Adapter 配置

```typescript
updateAdapter: protectedProcedure
  .input(z.object({
    agent_id: z.string(),
    config: z.record(z.any()),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. 获取 Agent
    const agent = await ctx.agentService.getById(input.agent_id);
    
    // 2. 获取 Adapter
    const adapter = await ctx.adapterService.getById(agent.adapter_id);
    
    // 3. 权限检查：只能更新私有 Adapter
    if (adapter.scope !== 'private') {
      throw new Error('Cannot update shared adapter through agent');
    }
    if (adapter.owner_id !== ctx.user.id) {
      throw new Error('Permission denied');
    }
    
    // 4. 更新配置
    await ctx.adapterService.update(adapter.id, {
      config: input.config,
    });
    
    return { success: true };
  })
```

#### 3.1.3 切换 Agent 的 Adapter

```typescript
switchAdapter: protectedProcedure
  .input(z.object({
    agent_id: z.string(),
    adapter_id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. 权限检查
    const agent = await ctx.agentService.getById(input.agent_id);
    if (agent.owner_id !== ctx.user.id) {
      throw new Error('Permission denied');
    }
    
    // 2. 验证目标 Adapter 可访问性
    const targetAdapter = await ctx.adapterService.getById(input.adapter_id);
    if (targetAdapter.scope === 'private' && targetAdapter.owner_id !== ctx.user.id) {
      throw new Error('Cannot access private adapter');
    }
    
    // 3. 切换
    await ctx.agentService.update(input.agent_id, {
      adapter_id: input.adapter_id,
    });
    
    return { success: true };
  })
```

#### 3.1.4 Fork 共享 Adapter 为私有

```typescript
forkAdapter: protectedProcedure
  .input(z.object({
    agent_id: z.string(),
    source_adapter_id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. 获取源 Adapter
    const sourceAdapter = await ctx.adapterService.getById(input.source_adapter_id);
    
    // 2. 创建私有副本
    const newAdapter = await ctx.adapterService.createPrivate({
      name: `${sourceAdapter.name}-fork`,
      type: sourceAdapter.type,
      config: sourceAdapter.config,
      owner_id: ctx.user.id,
    });
    
    // 3. 切换 Agent 到新 Adapter
    await ctx.agentService.update(input.agent_id, {
      adapter_id: newAdapter.id,
    });
    
    return newAdapter;
  })
```

### 3.2 Adapter 管理端点

#### 3.2.1 创建共享 Adapter

```typescript
// adapter.router.ts
createShared: adminProcedure  // 需要管理员权限
  .input(z.object({
    name: z.string(),
    type: z.enum(['anthropic-api', 'openai-api', 'claude-code-cli']),
    config: z.record(z.any()),
  }))
  .mutation(async ({ input, ctx }) => {
    return await ctx.adapterService.createShared(input);
  })
```

#### 3.2.2 更新共享 Adapter

```typescript
updateShared: adminProcedure
  .input(z.object({
    adapter_id: z.string(),
    config: z.record(z.any()),
  }))
  .mutation(async ({ input, ctx }) => {
    const adapter = await ctx.adapterService.getById(input.adapter_id);
    if (adapter.scope !== 'shared') {
      throw new Error('Not a shared adapter');
    }
    
    return await ctx.adapterService.update(input.adapter_id, {
      config: input.config,
    });
  })
```

#### 3.2.3 列出可用 Adapter

```typescript
list: protectedProcedure
  .input(z.object({
    scope: z.enum(['shared', 'private', 'all']).optional(),
  }))
  .query(async ({ input, ctx }) => {
    return await ctx.adapterService.list({
      scope: input.scope,
      user_id: ctx.user.id,  // 用于过滤私有 Adapter
    });
  })
```

#### 3.2.4 删除 Adapter

```typescript
delete: protectedProcedure
  .input(z.object({
    adapter_id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    const adapter = await ctx.adapterService.getById(input.adapter_id);
    
    // 权限检查
    if (adapter.scope === 'shared' && !ctx.user.is_admin) {
      throw new Error('Permission denied');
    }
    if (adapter.scope === 'private' && adapter.owner_id !== ctx.user.id) {
      throw new Error('Permission denied');
    }
    
    // 检查是否有 Agent 在使用
    const usageCount = await ctx.agentService.countByAdapterId(input.adapter_id);
    if (usageCount > 0) {
      throw new Error(`Cannot delete: ${usageCount} agent(s) using this adapter`);
    }
    
    await ctx.adapterService.delete(input.adapter_id);
    return { success: true };
  })
```

---

## 4. Service 层实现

### 4.1 AdapterService

```typescript
// src/application/services/adapter/adapter.service.ts

export class AdapterService {
  constructor(
    private adapterStore: IAdapterConfigStore,
    private fileSystem: IFileSystem,
    private secretManager: ISecretManager,
    private auditLogger: IAuditLogger,
    private lockManager: ILockManager,
  ) {}

  async createShared(params: CreateSharedAdapterParams, tx?: Transaction): Promise<AdapterConfig> {
    const id = generateId();
    
    // 验证配置
    const validated = adapterConfigSchema.parse({
      type: params.type,
      config: params.config,
    });
    
    const adapter: AdapterConfig = {
      id,
      name: params.name,
      type: validated.type,
      scope: 'shared',
      config: validated.config,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // 获取文件锁
    const lockKey = `.cove/adapters/shared/${id}.yaml`;
    await this.lockManager.acquire(lockKey);
    
    try {
      // 保存到文件系统
      await this.fileSystem.writeYaml(lockKey, adapter);
      
      // 保存到内存存储
      await this.adapterStore.save(adapter, tx);
      
      // 记录审计日志
      await this.auditLogger.log({
        action: 'adapter.create',
        actor_id: params.actor_id,
        resource_type: 'adapter',
        resource_id: id,
        changes: { scope: 'shared', type: params.type },
      });
      
      return adapter;
    } finally {
      await this.lockManager.release(lockKey);
    }
  }

  async createPrivate(params: CreatePrivateAdapterParams, tx?: Transaction): Promise<AdapterConfig> {
    const id = generateId();
    
    // 验证配置
    const validated = adapterConfigSchema.parse({
      type: params.type,
      config: params.config,
    });
    
    const adapter: AdapterConfig = {
      id,
      name: params.name,
      type: validated.type,
      scope: 'private',
      owner_id: params.owner_id,
      config: validated.config,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // 获取文件锁
    const lockKey = `.cove/adapters/private/${id}.yaml`;
    await this.lockManager.acquire(lockKey);
    
    try {
      // 保存到文件系统
      await this.fileSystem.writeYaml(lockKey, adapter);
      
      // 保存到内存存储
      await this.adapterStore.save(adapter, tx);
      
      // 记录审计日志
      await this.auditLogger.log({
        action: 'adapter.create',
        actor_id: params.owner_id,
        resource_type: 'adapter',
        resource_id: id,
        changes: { scope: 'private', type: params.type },
      });
      
      return adapter;
    } finally {
      await this.lockManager.release(lockKey);
    }
  }

  async update(id: string, updates: Partial<AdapterConfig>, actorId: string, tx?: Transaction): Promise<AdapterConfig> {
    const adapter = await this.adapterStore.getById(id);
    if (!adapter) {
      throw new Error('Adapter not found');
    }
    
    // 如果更新配置，验证新配置
    if (updates.config) {
      const validated = adapterConfigSchema.parse({
        type: adapter.type,
        config: updates.config,
      });
      updates.config = validated.config;
    }
    
    const updated = {
      ...adapter,
      ...updates,
      updated_at: new Date(),
    };
    
    // 获取文件锁
    const path = adapter.scope === 'shared'
      ? `.cove/adapters/shared/${id}.yaml`
      : `.cove/adapters/private/${id}.yaml`;
    await this.lockManager.acquire(path);
    
    try {
      // 更新文件系统
      await this.fileSystem.writeYaml(path, updated);
      
      // 更新内存存储
      await this.adapterStore.save(updated, tx);
      
      // 记录审计日志
      await this.auditLogger.log({
        action: 'adapter.update',
        actor_id: actorId,
        resource_type: 'adapter',
        resource_id: id,
        changes: updates,
      });
      
      return updated;
    } finally {
      await this.lockManager.release(path);
    }
  }

  async getById(id: string): Promise<AdapterConfig> {
    const adapter = await this.adapterStore.getById(id);
    if (!adapter) {
      throw new Error('Adapter not found');
    }
    return adapter;
  }

  async list(filters: {
    scope?: 'shared' | 'private' | 'all';
    user_id?: string;
  }): Promise<AdapterConfig[]> {
    let adapters = await this.adapterStore.list();
    
    // 过滤作用域
    if (filters.scope === 'shared') {
      adapters = adapters.filter(a => a.scope === 'shared');
    } else if (filters.scope === 'private') {
      adapters = adapters.filter(a => a.scope === 'private');
    }
    
    // 过滤私有 Adapter（只返回用户自己的）
    if (filters.user_id) {
      adapters = adapters.filter(a => 
        a.scope === 'shared' || a.owner_id === filters.user_id
      );
    }
    
    return adapters;
  }

  async delete(id: string, actorId: string, tx?: Transaction): Promise<void> {
    const adapter = await this.adapterStore.getById(id);
    if (!adapter) {
      throw new Error('Adapter not found');
    }
    
    // 获取文件锁
    const path = adapter.scope === 'shared'
      ? `.cove/adapters/shared/${id}.yaml`
      : `.cove/adapters/private/${id}.yaml`;
    await this.lockManager.acquire(path);
    
    try {
      // 删除文件
      await this.fileSystem.delete(path);
      
      // 删除内存存储
      await this.adapterStore.delete(id, tx);
      
      // 记录审计日志
      await this.auditLogger.log({
        action: 'adapter.delete',
        actor_id: actorId,
        resource_type: 'adapter',
        resource_id: id,
      });
    } finally {
      await this.lockManager.release(path);
    }
  }
}
```

### 4.2 LlmAdapterFactory 重构

```typescript
// src/infrastructure/adapters/llm/llm-adapter.factory.ts

export class LlmAdapterFactory {
  constructor(
    private adapterService: AdapterService,
    private secretManager: ISecretManager,
  ) {}

  async createFromAdapterId(adapterId: string): Promise<LlmAdapter> {
    // 1. 获取配置
    const config = await this.adapterService.getById(adapterId);
    
    // 2. 解析密钥引用
    let resolvedConfig = { ...config.config };
    if ('api_key_ref' in resolvedConfig) {
      const apiKey = await this.secretManager.resolve(resolvedConfig.api_key_ref);
      resolvedConfig = { ...resolvedConfig, api_key: apiKey };
      delete resolvedConfig.api_key_ref;
    }
    
    // 3. 根据类型创建实例
    switch (config.type) {
      case 'anthropic-api':
        return new AnthropicAdapter(resolvedConfig);
      
      case 'openai-api':
        return new OpenAIAdapter(resolvedConfig);
      
      case 'claude-code-cli':
        return new ClaudeCodeCLIAdapter(resolvedConfig);
      
      default:
        throw new Error(`Unknown adapter type: ${config.type}`);
    }
  }
}
```

### 4.3 AgentService 更新

```typescript
// src/application/services/agent/agent.service.ts

export class AgentService {
  async create(params: CreateAgentParams): Promise<Agent> {
    // 验证 adapter_id 存在
    await this.adapterService.getById(params.adapter_id);
    
    const agent: Agent = {
      id: generateId(),
      name: params.name,
      adapter_id: params.adapter_id,
      persona_config: params.persona_config,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    await this.agentStore.save(agent);
    return agent;
  }

  async countByAdapterId(adapterId: string): Promise<number> {
    const agents = await this.agentStore.list();
    return agents.filter(a => a.adapter_id === adapterId).length;
  }
}
```

---

## 5. 实施步骤

### Phase 0: 基础设施（P0 优先级）- 2-3天 ✅ 已完成
1. ✅ 创建 `SecretManager` 服务（支持 env: 引用）
   - `src/application/services/secret/secret-manager.interface.ts`
   - `src/application/services/secret/secret-manager.service.ts`
   - 使用 AES-256-GCM 加密算法
2. ✅ 创建 `AuditLogger` 服务和存储接口
   - `src/application/services/audit/audit-logger.interface.ts`
   - `src/application/services/audit/audit-logger.service.ts`
   - `src/application/services/audit/audit-log-store.interface.ts`
   - `src/application/services/audit/file-system-audit-log-store.ts`
3. ✅ 创建 `LockManager` 服务（使用 proper-lockfile）
   - `src/application/services/lock/lock-manager.interface.ts`
   - `src/application/services/lock/file-lock-manager.service.ts`
   - 安装依赖: `proper-lockfile`
4. ✅ 创建配置验证 Schema（adapter-config.validation.ts）
   - `src/domain/models/adapter/adapter-config.validation.ts`
   - 支持 OpenAI, Anthropic, Claude CLI 配置验证
5. ✅ 添加事务支持接口
   - `src/application/interfaces/transaction.interface.ts`
6. ✅ 编写单元测试
   - `tests/services/secret/secret-manager.test.ts` (6 tests)
   - `tests/services/audit/audit-logger.test.ts` (3 tests)
   - `tests/services/lock/file-lock-manager.test.ts` (6 tests)
   - **测试结果: 15/15 通过 ✅**

### Phase 1: 数据模型和存储（1-2天）
1. ✅ 创建 `adapter-config.entity.ts`（使用 api_key_ref）
2. ✅ 创建 `IAdapterConfigStore` 接口
3. ✅ 实现 `FileSystemAdapterConfigStore`
4. ✅ 更新 `AgentRuntimeConfig` 接口，添加 `adapter_id?: string` 字段，标记所有旧字段为 @deprecated
5. ✅ 编写单元测试（15/15 tests passing）

### Phase 2: Service 层（2-3天）✅ 已完成
1. ✅ 实现 `AdapterService`（简化版，依赖注入仅需 store）
2. ✅ 重构 `LlmAdapterFactory`（支持从 AdapterConfig 创建适配器）
3. ✅ 更新 `AgentResponseService`（集成新适配器系统，优先使用 adapter_id）
4. ✅ 编写单元测试（20/20 tests passing）
5. ✅ 修复 TypeScript 编译错误
6. ✅ 所有测试通过（67 test files, 1090 tests passing）

### Phase 3: API 层（2-3天）✅ 已完成
1. ✅ 创建 `adapter.router.ts`（使用严格验证 schema）
2. ✅ 更新 `agent.router.ts`（添加 switchAdapter、forkAdapter 端点）
3. ✅ 集成到主路由系统（index.ts）
4. ✅ 初始化 AdapterService 及其依赖（main.ts）
5. ✅ 修复所有 TypeScript 编译错误
6. ✅ 所有测试通过（67 test files, 1090 tests passing）

### Phase 4: Agent 集成和迁移（1-2天）✅ 已完成

**重要：不需要 Feature Flag，因为设计已完全向后兼容**

1. ✅ 更新 `AgentRuntimeConfig` 接口
   - 添加 `adapter_id?: string` 字段
   - 标记旧字段为 `@deprecated`（provider, model_name, api, cli）
   - 保留通用配置字段（temperature, max_tokens, context, retry）

2. ✅ 更新 `agent-response.service.ts` 加载逻辑
   - 优先使用 `adapter_id` 加载配置
   - 回退到旧的内联配置（向后兼容）
   - 添加 deprecation warning

3. ✅ 更新 `agent.router.ts`
   - 添加 `switchAdapter` 端点
   - 添加 `forkAdapter` 端点

4. ✅ 编写迁移脚本（可选，用于批量迁移现有 Agent）
   - 读取现有 Agent 的 runtime.yaml
   - 为每个 Agent 创建私有 Adapter
   - 更新 runtime.yaml，添加 adapter_id
   - 保留旧字段（不删除，确保回滚安全）
   - 支持 dry-run 模式

5. ✅ 测试向后兼容性
   - 创建完整的集成测试套件（11个测试）
   - 测试 Adapter CRUD 操作
   - 测试权限控制（shared/private）
   - 测试 Adapter Factory 集成
   - 所有测试通过（1101 tests passed）

6. ✅ 增强 Agent API 返回 Adapter 详情
   - 更新 `AgentQueryService.getAgentDetail` 方法
   - 当 runtime.adapter_id 存在时，自动获取完整的 adapter 配置
   - 在返回的 detail 对象中包含 `adapter` 字段

7. ✅ 实际迁移验证
   - 修复迁移脚本支持嵌套的 runtime.yaml 结构（model.provider, model.model_name）
   - 成功迁移 cove-assistant agent 到新的 adapter 系统
   - 创建了 adapter 配置：`5d6822ff-43a4-443b-a5eb-65d5015a445c`
   - runtime.yaml 已更新，包含 adapter_id 字段
   - 验证了向后兼容性：旧字段保留，新字段添加

### Phase 5: 前端集成（3-4天）
1. ⬜ 更新 Agent 创建表单
2. ⬜ 添加 Adapter 配置管理界面
3. ⬜ 添加 Adapter 切换功能
4. ⬜ 添加审计日志查看界面
5. ⬜ 测试完整流程

---

## 6. 使用场景示例

### 场景 1: 创建新 Agent（推荐模式）

```typescript
// 前端调用
const agent = await trpc.agent.create.mutate({
  name: 'my-assistant',
  adapter: {
    type: 'anthropic-api',
    config: {
      api_key: 'sk-xxx',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
    },
  },
});

// 后端自动：
// 1. 创建私有 Adapter: "my-assistant-adapter"
// 2. 创建 Agent，关联该 Adapter
// 3. 保存配置到 .cove/adapters/private/{adapter-id}.yaml
```

### 场景 2: 更新 Agent 的配置

```typescript
// 只更新配置，不影响其他 Agent
await trpc.agent.updateAdapter.mutate({
  agent_id: 'agent-123',
  config: {
    temperature: 0.9,
    max_tokens: 4096,
  },
});
```

### 场景 3: 切换到共享 Adapter

```typescript
// 管理员创建共享 Adapter
const sharedAdapter = await trpc.adapter.createShared.mutate({
  name: 'production-anthropic',
  type: 'anthropic-api',
  config: {
    api_key: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  },
});

// 用户切换 Agent 到共享 Adapter
await trpc.agent.switchAdapter.mutate({
  agent_id: 'agent-123',
  adapter_id: sharedAdapter.id,
});
```

### 场景 4: Fork 共享配置进行定制

```typescript
// Fork 共享 Adapter，创建私有副本
const privateAdapter = await trpc.agent.forkAdapter.mutate({
  agent_id: 'agent-123',
  source_adapter_id: 'shared-adapter-id',
});

// 现在可以独立修改
await trpc.agent.updateAdapter.mutate({
  agent_id: 'agent-123',
  config: {
    temperature: 1.0,  // 只影响这个 Agent
  },
});
```

---

## 7. 优势总结

### 7.1 架构优势
- ✅ **关注点分离**：Adapter 配置与 Agent 实体解耦
- ✅ **灵活性**：支持独立配置和共享配置两种模式
- ✅ **可扩展性**：新增 Adapter 类型无需修改现有代码
- ✅ **类型安全**：TypeScript 类型系统保障配置正确性

### 7.2 使用优势
- ✅ **简单直观**：推荐模式下，创建 Agent 自动创建私有配置
- ✅ **互不影响**：每个 Agent 默认独立配置，修改不影响其他
- ✅ **支持共享**：高级场景下可以共享配置，统一管理
- ✅ **易于切换**：通过 API 轻松切换 Adapter

### 7.3 管理优势
- ✅ **权限清晰**：shared 需要管理员，private 只能所有者修改
- ✅ **生命周期管理**：删除前检查使用情况，防止误删
- ✅ **配置复用**：共享配置可被多个 Agent 引用
- ✅ **易于维护**：配置集中存储，便于备份和迁移

---

## 8. 最佳实践建议

### 8.1 推荐使用模式
1. **默认使用私有 Adapter**：每个 Agent 创建时自动创建私有配置
2. **共享用于标准化**：团队统一的配置（如生产环境）使用 shared
3. **Fork 用于定制**：需要基于共享配置定制时，使用 fork

### 8.2 配置管理
1. **敏感信息**：API Key 等敏感信息使用环境变量
2. **版本控制**：配置文件纳入版本控制（排除敏感信息）
3. **备份策略**：定期备份 `.cove/adapters/` 目录

### 8.3 权限控制
1. **最小权限原则**：普通用户只能管理自己的私有 Adapter
2. **管理员审核**：共享 Adapter 的创建和修改需要管理员权限
3. **删除保护**：删除前检查使用情况，防止误删

---

## 9. 潜在风险和缓解措施

### 9.1 风险
1. **配置冲突**：多个 Agent 引用同一共享配置，修改影响所有
2. **权限泄露**：私有配置的 API Key 可能被误共享
3. **孤儿配置**：Agent 删除后，私有 Adapter 可能残留

### 9.2 缓解措施
1. **推荐独立配置**：默认使用私有 Adapter，减少冲突
2. **权限检查**：严格的权限验证，防止越权访问
3. **级联删除**：删除 Agent 时，可选删除关联的私有 Adapter
4. **审计日志**：记录配置修改历史，便于追溯

---

## 10. 后续优化方向

### 10.1 短期优化（1-2周）
- [ ] 添加配置版本管理（支持回滚）
- [ ] 添加配置模板功能
- [ ] 优化配置验证逻辑

### 10.2 中期优化（1-2月）
- [ ] 添加配置导入/导出功能
- [ ] 支持配置继承（基于模板创建）
- [ ] 添加配置使用统计

### 10.3 长期优化（3-6月）
- [ ] 支持动态配置热更新
- [ ] 添加配置 A/B 测试功能
- [ ] 集成配置中心（如 Consul、etcd）

---

## 11. 总结

本设计方案通过引入独立的 `AdapterConfig` 实体和清晰的作用域管理，实现了：

1. **解耦清晰**：Adapter 配置与 Agent 实体完全分离
2. **灵活高效**：支持独立配置和共享配置两种模式
3. **简洁易用**：API 设计直观，代码结构清晰
4. **安全可控**：严格的权限管理和生命周期控制

推荐的使用模式（每个 Agent 自动创建私有 Adapter）既保证了灵活性，又避免了配置冲突，是最符合实际使用场景的设计。
