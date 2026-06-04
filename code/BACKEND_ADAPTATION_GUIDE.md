# Backend 适配需求：Agent Execution Metadata 支持

## 📋 背景

Local 端已实现完整的 Agent Execution Metadata 收集框架，通过现有的 `message.saveResponse` 接口传输元数据到 Backend。当前 Backend 的 `metadata: z.record(z.unknown())` 已经可以接收数据，但需要以下适配工作以完整支持该功能。

## 🎯 适配目标

1. **数据存储** - 确保数据库字段能存储大型 JSON
2. **数据验证** - 可选：添加 ExecutionMetadata 的 Zod schema 验证
3. **前端支持** - 确保前端可以正确读取和展示元数据
4. **性能优化** - 针对大型元数据的存储和查询优化

## 📊 数据结构

### ExecutionMetadata 类型定义

```typescript
interface ExecutionMetadata {
  // Thinking 内容（可能很大，50-500KB）
  thinking?: {
    content: string          // 完整的思考内容
    chunks: number           // 接收的 chunk 数量
    firstTokenMs?: number    // 首 token 延迟
  }
  
  // 工具调用记录
  toolUses: Array<{
    id: string
    toolName: string
    action: string
    params?: Record<string, unknown>
    status: 'pending' | 'running' | 'success' | 'error'
    duration?: number
    result?: {
      success?: string
      error?: string
      output?: string
    }
  }>
  
  // Token 使用统计
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cache?: {
      creationTokens: number
      readTokens: number
      hitRate?: number
    }
    cost?: {
      inputCost: number
      outputCost: number
      cacheCost: number
      totalCost: number
    }
    model?: string
    latency?: {
      firstTokenMs?: number
      totalMs?: number
      tokensPerSecond?: number
    }
  }
  
  // 状态转换历史
  statusHistory: Array<{
    status: 'thinking' | 'tool_use' | 'responding' | 'completed'
    timestamp: number  // 相对于开始的毫秒数
  }>
  
  // 执行元信息
  executionMode: 'streaming' | 'batch'
  adapter: string                    // 'claude-cli', 'anthropic-adapter', etc.
  timestamp: string                  // ISO 8601
  processingTime: number             // 总处理时间（毫秒）
  plugins?: Record<string, any>      // 插件扩展元数据
}
```

### 传输格式

Local 通过 `message.saveResponse` 发送：
```typescript
{
  channelId: "realm:channel-id",
  messageId: "msg-id",
  content: "响应内容",
  metadata: {
    execution: ExecutionMetadata  // ← 嵌套在 metadata.execution
  }
}
```

## 🔧 需要的适配工作

### 1. 数据库 Schema 检查（必需）

**检查项**：
```sql
-- 检查 messages 表的 metadata 字段类型
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'metadata';
```

**要求**：
- ✅ **推荐**：PostgreSQL 的 `JSONB` 类型（支持索引和查询）
- ✅ **可接受**：`TEXT` 类型（足够大）
- ❌ **不足**：`VARCHAR(255)` 或其他长度限制的类型

**如果不满足要求**，需要迁移：
```sql
-- 迁移示例（根据实际情况调整）
ALTER TABLE messages 
ALTER COLUMN metadata TYPE JSONB 
USING metadata::JSONB;
```

### 2. Zod Schema 验证（可选，推荐）

在 `message.router.ts` 中增强验证：

```typescript
// 添加 ExecutionMetadata 的 Zod schema
const executionMetadataSchema = z.object({
  thinking: z.object({
    content: z.string(),
    chunks: z.number(),
    firstTokenMs: z.number().optional()
  }).optional(),
  
  toolUses: z.array(z.object({
    id: z.string(),
    toolName: z.string(),
    action: z.string(),
    status: z.enum(['pending', 'running', 'success', 'error']),
    duration: z.number().optional(),
    // ... 其他字段
  })),
  
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
    cache: z.object({
      creationTokens: z.number(),
      readTokens: z.number(),
      hitRate: z.number().optional()
    }).optional(),
    cost: z.object({
      totalCost: z.number(),
      // ...
    }).optional(),
    // ... 其他字段
  }).optional(),
  
  statusHistory: z.array(z.object({
    status: z.enum(['thinking', 'tool_use', 'responding', 'completed']),
    timestamp: z.number()
  })),
  
  executionMode: z.enum(['streaming', 'batch']),
  adapter: z.string(),
  timestamp: z.string(),
  processingTime: z.number(),
  plugins: z.record(z.unknown()).optional()
}).optional();

// 更新 saveResponse 的 metadata 验证
saveResponse: publicProcedure
  .input(z.object({
    // ... 现有字段
    metadata: z.object({
      execution: executionMetadataSchema  // ← 增强验证
    }).passthrough().optional()  // passthrough 允许其他字段
  }))
  .mutation(async ({ input, ctx }) => {
    // ... 现有逻辑
  })
```

**优势**：
- ✅ 类型安全
- ✅ 数据验证
- ✅ 自动生成 TypeScript 类型
- ✅ 前端可以使用相同的类型

### 3. 前端类型定义（必需）

在前端添加类型定义：

```typescript
// frontend/src/types/execution-metadata.ts
export interface ExecutionMetadata {
  thinking?: {
    content: string
    chunks: number
    firstTokenMs?: number
  }
  toolUses: ToolUseMetadata[]
  usage?: UsageMetadata
  statusHistory: StatusEvent[]
  executionMode: 'streaming' | 'batch'
  adapter: string
  timestamp: string
  processingTime: number
  plugins?: Record<string, any>
}

// ... 其他子类型
```

### 4. 前端 UI 展示（必需）

添加组件显示执行元数据：

```typescript
// MessageExecutionDetails.tsx
interface Props {
  metadata?: {
    execution?: ExecutionMetadata
  }
}

export function MessageExecutionDetails({ metadata }: Props) {
  if (!metadata?.execution) return null
  
  const { thinking, toolUses, usage, statusHistory } = metadata.execution
  
  return (
    <div className="execution-details">
      {/* Thinking 内容 */}
      {thinking && (
        <details>
          <summary>Thinking ({thinking.chunks} chunks)</summary>
          <pre>{thinking.content}</pre>
        </details>
      )}
      
      {/* Tool 使用 */}
      {toolUses.length > 0 && (
        <div className="tool-uses">
          <h4>Tools Used</h4>
          {toolUses.map(tool => (
            <div key={tool.id}>
              {tool.toolName}: {tool.status}
            </div>
          ))}
        </div>
      )}
      
      {/* Usage 统计 */}
      {usage && (
        <div className="usage-stats">
          <span>Tokens: {usage.totalTokens}</span>
          {usage.cost && <span>Cost: ${usage.cost.totalCost}</span>}
        </div>
      )}
      
      {/* 状态历史 */}
      <div className="status-timeline">
        {statusHistory.map((event, i) => (
          <span key={i}>{event.status} ({event.timestamp}ms)</span>
        ))}
      </div>
    </div>
  )
}
```

### 5. 性能优化（推荐）

#### 索引优化（如果需要按元数据查询）

```sql
-- 如果使用 JSONB，可以创建 GIN 索引
CREATE INDEX idx_messages_metadata_execution 
ON messages USING GIN ((metadata->'execution'));

-- 针对特定字段的索引
CREATE INDEX idx_messages_execution_adapter 
ON messages ((metadata->'execution'->>'adapter'));

CREATE INDEX idx_messages_execution_mode 
ON messages ((metadata->'execution'->>'executionMode'));
```

#### 查询优化

```typescript
// 如果需要按 adapter 查询
const messages = await prisma.message.findMany({
  where: {
    metadata: {
      path: ['execution', 'adapter'],
      equals: 'claude-cli'
    }
  }
})
```

#### 大小监控

```typescript
// 在 saveResponse 中添加监控
const metadataSize = JSON.stringify(input.metadata).length
if (metadataSize > 1024 * 1024) {  // 1MB
  console.warn('[saveResponse] Large metadata detected', {
    size: metadataSize,
    messageId: input.messageId
  })
}
```

### 6. 数据迁移（如果有历史数据）

如果有现有的消息需要迁移：

```sql
-- 为现有消息添加默认的 execution 结构
UPDATE messages 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{execution}', 
  '{
    "toolUses": [],
    "statusHistory": [],
    "executionMode": "batch",
    "adapter": "unknown",
    "timestamp": "2026-06-04T00:00:00Z",
    "processingTime": 0
  }'::jsonb
)
WHERE metadata IS NULL 
   OR metadata->>'execution' IS NULL;
```

## ✅ 验证清单

完成适配后，验证以下功能：

- [ ] 数据库可以存储大型 JSON（测试 100KB+ 的 metadata）
- [ ] Backend API 可以接收并保存 ExecutionMetadata
- [ ] 前端可以正确读取 `metadata.execution`
- [ ] 前端 UI 正确展示所有元数据字段
- [ ] 性能测试：保存和读取包含大型元数据的消息
- [ ] 错误处理：metadata 格式错误时的处理
- [ ] 向后兼容：旧消息（无 execution 字段）仍能正常显示

## 🧪 测试用例

### 测试数据

```json
{
  "channelId": "test-channel",
  "messageId": "test-msg-1",
  "content": "Test response",
  "metadata": {
    "execution": {
      "thinking": {
        "content": "Let me analyze this...",
        "chunks": 5,
        "firstTokenMs": 234
      },
      "toolUses": [
        {
          "id": "tool-1",
          "toolName": "file_reader",
          "action": "read",
          "status": "success",
          "duration": 123
        }
      ],
      "usage": {
        "inputTokens": 150,
        "outputTokens": 300,
        "totalTokens": 450,
        "cost": {
          "totalCost": 0.0225
        }
      },
      "statusHistory": [
        { "status": "thinking", "timestamp": 0 },
        { "status": "tool_use", "timestamp": 500 },
        { "status": "responding", "timestamp": 1000 },
        { "status": "completed", "timestamp": 2500 }
      ],
      "executionMode": "batch",
      "adapter": "claude-cli",
      "timestamp": "2026-06-04T14:30:00Z",
      "processingTime": 2500
    }
  }
}
```

### API 测试

```bash
# 发送包含 ExecutionMetadata 的消息
curl -X POST http://localhost:3000/trpc/message.saveResponse \
  -H "Content-Type: application/json" \
  -d @test-metadata.json

# 读取消息并验证 metadata
curl http://localhost:3000/trpc/message.getById?messageId=test-msg-1
```

## 📞 协作方式

如果你是 Backend 开发者，请：

1. **检查数据库字段** - 确认 `metadata` 字段类型
2. **可选：增强验证** - 添加 ExecutionMetadata 的 Zod schema
3. **通知前端** - 提供 TypeScript 类型定义
4. **协调测试** - 端到端测试 Local → Backend → Frontend

如有问题，请联系 Local 开发团队或查看：
- Local 端实现：`local/src/domain/agent-runtime/execution-metadata/`
- 类型定义：`local/src/domain/agent-runtime/execution-metadata/types.ts`

## 🎯 优先级

1. **P0（必需）** - 数据库字段检查
2. **P0（必需）** - 前端类型定义和 UI 展示
3. **P1（推荐）** - Zod schema 验证
4. **P1（推荐）** - 性能优化和监控
5. **P2（可选）** - 数据迁移（如果需要）

---

**文档版本**: 1.0  
**创建日期**: 2026-06-04  
**Local 端版本**: Commit 83a037b
