# Frontend 适配指南：Agent Execution Metadata 展示

## 📋 背景

Backend 已完成 Agent Execution Metadata 的存储和 API 支持。现在需要前端实现 UI 展示，让用户能看到 Agent 的执行细节（thinking、tool use、token usage 等）。

---

## 🎯 适配目标

1. **读取数据** - 从 API 获取 `agent_execution_metadata`
2. **类型定义** - 添加 TypeScript 类型
3. **UI 展示** - 实现展示组件
4. **用户体验** - 优化交互和性能

---

## 📊 数据结构

### API 返回的消息格式

当调用 `message.list` API 时，Agent 消息会包含 `agent_execution_metadata` 字段：

```typescript
{
  message_id: "message-xxx",
  sender_type: "agent",
  content: "Agent 的回复内容",
  agent_execution_metadata: {
    // Thinking 内容
    thinking?: string;
    
    // Tool 使用日志
    tool_logs?: Array<{
      id: string;
      timestamp: string;
      toolName: string;
      action: string;
      params?: Record<string, unknown>;
      status: 'pending' | 'running' | 'success' | 'error';
      duration?: number;
      result?: {
        success?: string;
        error?: string;
        output?: string;
      };
      meta?: {
        fileCount?: number;
        linesChanged?: number;
        exitCode?: number;
      };
    }>;
    
    // Token 使用统计
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      cacheReadTokens?: number;
      cacheCreationTokens?: number;
    };
    
    // 执行模式
    execution_mode?: 'API' | 'CLI' | 'SDK';
    
    // 流式状态
    streaming_status?: 'thinking' | 'tool_use' | 'responding' | 'completed';
    
    // 时间戳
    started_at?: string;
    completed_at?: string;
  }
}
```

---

## 🔧 实现步骤

### Step 1: 添加 TypeScript 类型定义

创建 `src/types/agent-execution.ts`：

```typescript
export interface ToolLog {
  id: string;
  timestamp: string;
  toolName: string;
  action: string;
  params?: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  result?: {
    success?: string;
    error?: string;
    output?: string;
  };
  meta?: {
    fileCount?: number;
    linesChanged?: number;
    exitCode?: number;
  };
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface AgentExecutionMetadata {
  thinking?: string;
  tool_logs?: ToolLog[];
  usage?: TokenUsage;
  execution_mode?: 'API' | 'CLI' | 'SDK';
  streaming_status?: 'thinking' | 'tool_use' | 'responding' | 'completed';
  started_at?: string;
  completed_at?: string;
}

export interface MessageWithExecution {
  message_id: string;
  sender_type: string;
  content: string;
  agent_execution_metadata?: AgentExecutionMetadata;
  // ... 其他消息字段
}
```

---

### Step 2: 更新 Message 模型

修改 `src/features/channel/domain/models/Message.ts`：

```typescript
import { AgentExecutionMetadata } from '@/types/agent-execution';

export class Message {
  // ... 现有字段
  
  public readonly agentExecutionMetadata?: AgentExecutionMetadata;
  
  static fromRemote(data: any): Message {
    return new Message({
      // ... 现有字段映射
      agentExecutionMetadata: data.agent_execution_metadata,
    });
  }
  
  // 辅助方法
  hasThinking(): boolean {
    return !!this.agentExecutionMetadata?.thinking;
  }
  
  hasToolLogs(): boolean {
    return (this.agentExecutionMetadata?.tool_logs?.length ?? 0) > 0;
  }
  
  hasUsageStats(): boolean {
    return !!this.agentExecutionMetadata?.usage;
  }
}
```

---

### Step 3: 创建展示组件

#### 3.1 Thinking 展示组件

`src/features/channel/components/AgentThinking.tsx`：

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

interface AgentThinkingProps {
  thinking: string;
}

export function AgentThinking({ thinking }: AgentThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Brain className="w-4 h-4" />
          <span>Agent 思考过程</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {isExpanded && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
            {thinking}
          </pre>
        </div>
      )}
    </div>
  );
}
```

#### 3.2 Tool Logs 展示组件

`src/features/channel/components/ToolLogs.tsx`：

```typescript
import { useState } from 'react';
import { Wrench, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ToolLog } from '@/types/agent-execution';

interface ToolLogsProps {
  logs: ToolLog[];
}

export function ToolLogs({ logs }: ToolLogsProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const toggleLog = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };
  
  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Wrench className="w-4 h-4" />
          <span>工具使用记录 ({logs.length})</span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {logs.map((log) => (
          <div key={log.id} className="bg-white">
            <button
              onClick={() => toggleLog(log.id)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(log.status)}
                <span className="text-sm font-medium text-gray-700">{log.toolName}</span>
                <span className="text-xs text-gray-500">{log.action}</span>
              </div>
              {log.duration && (
                <span className="text-xs text-gray-400">{log.duration}ms</span>
              )}
            </button>
            
            {expandedLogs.has(log.id) && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 space-y-2">
                {log.params && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">输入参数:</div>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-2 rounded">
                      {JSON.stringify(log.params, null, 2)}
                    </pre>
                  </div>
                )}
                
                {log.result && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">执行结果:</div>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-2 rounded">
                      {log.result.success || log.result.error || log.result.output}
                    </pre>
                  </div>
                )}
                
                {log.meta && (
                  <div className="flex gap-4 text-xs text-gray-500">
                    {log.meta.fileCount !== undefined && <span>文件数: {log.meta.fileCount}</span>}
                    {log.meta.linesChanged !== undefined && <span>行数变更: {log.meta.linesChanged}</span>}
                    {log.meta.exitCode !== undefined && <span>退出码: {log.meta.exitCode}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 3.3 Token Usage 展示组件

`src/features/channel/components/TokenUsage.tsx`：

```typescript
import { BarChart3 } from 'lucide-react';
import { TokenUsage as TokenUsageType } from '@/types/agent-execution';

interface TokenUsageProps {
  usage: TokenUsageType;
}

export function TokenUsage({ usage }: TokenUsageProps) {
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    return num.toLocaleString();
  };
  
  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-700" />
        <span className="text-sm text-gray-700">Token 使用统计</span>
      </div>
      
      <div className="p-3 grid grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-gray-500 mb-1">输入</div>
          <div className="font-semibold text-gray-900">{formatNumber(usage.inputTokens)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">输出</div>
          <div className="font-semibold text-gray-900">{formatNumber(usage.outputTokens)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">总计</div>
          <div className="font-semibold text-blue-600">{formatNumber(usage.totalTokens)}</div>
        </div>
        
        {(usage.cacheReadTokens || usage.cacheCreationTokens) && (
          <>
            <div>
              <div className="text-gray-500 mb-1">缓存读取</div>
              <div className="font-semibold text-green-600">{formatNumber(usage.cacheReadTokens)}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">缓存创建</div>
              <div className="font-semibold text-gray-900">{formatNumber(usage.cacheCreationTokens)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

### Step 4: 集成到消息气泡

修改 `src/features/channel/components/MessageBubble.tsx`：

```typescript
import { AgentThinking } from './AgentThinking';
import { ToolLogs } from './ToolLogs';
import { TokenUsage } from './TokenUsage';
import { Message } from '../domain/models/Message';

export function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.senderType === 'agent';
  const metadata = message.agentExecutionMetadata;
  
  return (
    <div className={`message-bubble ${isAgent ? 'agent' : 'user'}`}>
      {/* 消息内容 */}
      <div className="message-content">
        {message.content}
      </div>
      
      {/* Agent 执行细节 */}
      {isAgent && metadata && (
        <div className="mt-2 space-y-2">
          {/* Thinking */}
          {metadata.thinking && (
            <AgentThinking thinking={metadata.thinking} />
          )}
          
          {/* Tool Logs */}
          {metadata.tool_logs && metadata.tool_logs.length > 0 && (
            <ToolLogs logs={metadata.tool_logs} />
          )}
          
          {/* Token Usage */}
          {metadata.usage && (
            <TokenUsage usage={metadata.usage} />
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 UI/UX 建议

### 默认状态
- **Thinking**: 默认折叠，点击展开
- **Tool Logs**: 默认显示列表，点击展开详情
- **Token Usage**: 默认展开（占用空间小）

### 视觉设计
- 使用浅灰色背景区分执行细节
- 成功状态用绿色图标
- 错误状态用红色图标
- 运行中状态用蓝色旋转图标

### 性能优化
- 大型 thinking 内容（>5KB）：默认只显示前 500 字符
- Tool logs 超过 10 条：分页显示
- 使用虚拟滚动优化长列表

---

## 📋 测试验证

### 1. 数据读取测试
```typescript
// 在浏览器控制台测试
const messages = await fetch('/trpc/message.list?...').then(r => r.json());
console.log(messages[0].result.data.messages[0].agent_execution_metadata);
```

### 2. UI 组件测试
- ✅ Thinking 可以展开/折叠
- ✅ Tool logs 显示正确的状态图标
- ✅ Token usage 数字格式化正确
- ✅ 大数据量性能良好

### 3. 边界情况
- ✅ metadata 为 undefined 时不报错
- ✅ tool_logs 为空数组时不显示
- ✅ thinking 为空字符串时不显示

---

## 🚀 实现优先级

### P0 - 必须实现
1. ✅ TypeScript 类型定义
2. ✅ Message 模型更新
3. ✅ 基础的 Thinking 展示
4. ✅ 基础的 Tool Logs 展示

### P1 - 重要
1. Token Usage 展示
2. Tool Logs 详情展开
3. 性能优化

### P2 - 可选
1. 执行时间线可视化
2. Tool use 统计图表
3. 导出执行日志

---

## 📞 协作方式

### 需要 Backend 配合
- ✅ API 已就绪，直接使用 `message.list`
- ✅ 数据格式已确定，见上述类型定义

### 遇到问题
1. 数据格式问题 → 联系 Backend 团队
2. UI 设计问题 → 联系 Design 团队
3. 性能问题 → 考虑虚拟滚动或分页

---

## ✅ 检查清单

在开始实现前，确认：
- [ ] 已阅读并理解数据结构
- [ ] 已查看 Backend API 返回的实际数据
- [ ] 已确定 UI 设计方案
- [ ] 已创建 TypeScript 类型定义

实现过程中：
- [ ] 添加类型定义到项目
- [ ] 更新 Message 模型
- [ ] 实现展示组件
- [ ] 集成到消息气泡
- [ ] 测试各种边界情况

完成后：
- [ ] 所有组件正常渲染
- [ ] 性能良好（无卡顿）
- [ ] 边界情况处理正确
- [ ] 代码 review 通过

---

**文档版本**: 1.0  
**创建日期**: 2026-06-04  
**Backend 版本**: Commit 9d7de21  
**状态**: ✅ 准备就绪，可以开始实现

