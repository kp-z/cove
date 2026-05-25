# Channel Panel 消息气泡架构设计方案（优化版）

> 本文档描述了 Channel Panel 中 Agent 消息气泡的执行详情展示功能的完整架构设计。
> 
> **版本**: v2.0 (优化版)  
> **日期**: 2026-05-25  
> **作者**: 布玛 (@OA_DESIGNER)

---

## 📋 需求分析

基于 Claude Code CLI adapter 的使用场景，消息气泡需要展示：

1. **Thinking 过程** - Agent 的思考内容（可能很长）
2. **Tool 使用记录** - 文件修改、命令执行等操作日志
3. **Token 消耗信息** - input/output tokens、成本统计
4. **流式状态** - 实时显示 agent 正在做什么

参考 claude_manager 的优秀设计，提出以下高内聚低耦合的架构方案。

---

## 🏗️ 架构设计

### 1. 数据层设计

#### 1.1 后端数据结构

**AgentExecutionMetadata** (后端使用 snake_case):

```typescript
export interface AgentExecutionMetadata {
  // Thinking 内容
  thinking?: string;
  
  // 工具使用日志（流式追加）
  tool_logs?: ToolLog[];
  
  // Token 使用统计
  usage?: TokenUsage;
  
  // 执行模式
  execution_mode?: 'API' | 'CLI' | 'SDK';
  
  // 流式状态
  streaming_status?: 'thinking' | 'tool_use' | 'responding' | 'completed';
}
```

**ToolLog** (增强版):

```typescript
export interface ToolLog {
  // 基础信息
  id: string;  // 唯一标识，用于 React key
  timestamp: string;
  tool_name: string;
  
  // 操作信息
  action: string;
  params?: Record<string, unknown>;  // 工具参数
  
  // 状态信息
  status: 'pending' | 'running' | 'success' | 'error';
  
  // 结果信息
  duration?: number;
  result?: {
    success?: string;
    error?: string;
    output?: string;
  };
  
  // 元数据
  meta?: {
    file_count?: number;
    lines_changed?: number;
    exit_code?: number;
  };
}
```

**TokenUsage** (增强版):

```typescript
export interface TokenUsage {
  // Token 统计
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  
  // 缓存统计
  cache?: {
    creation_tokens: number;
    read_tokens: number;
    hit_rate?: number;
  };
  
  // 成本统计
  cost?: {
    input_cost: number;
    output_cost: number;
    cache_cost: number;
    total_cost: number;
  };
  
  // 模型信息
  model?: string;
  
  // 性能指标
  latency?: {
    first_token_ms?: number;
    total_ms?: number;
    tokens_per_second?: number;
  };
}
```

#### 1.2 前端数据结构

前端使用 camelCase，通过 tRPC 自动转换：

```typescript
export interface AgentMetadata {
  thinking?: string;
  toolLogs?: ToolLog[];
  usage?: TokenUsage;
  executionMode?: 'API' | 'CLI' | 'SDK';
  streamingStatus?: 'thinking' | 'tool_use' | 'responding' | 'completed';
}

export interface Message {
  // ... 现有字段
  agentMetadata?: AgentMetadata;
  is_streaming?: boolean;
}
```

---

### 2. 组件架构

```
MessageBubble (容器组件)
├── MessageContent (内容展示)
│   ├── UserMessage (用户消息)
│   └── AgentMessage (Agent 消息)
│       ├── MessageText (Markdown 渲染)
│       ├── MessageAttachments (附件)
│       └── AgentExecutionPanel (执行详情) ⭐ 新增
│           ├── ThinkingSection (思考过程)
│           ├── ToolLogsSection (工具日志)
│           └── UsageSection (Token 统计)
└── MessageFooter (时间戳、操作按钮)
```

---

### 3. 核心组件设计

#### 3.1 AgentExecutionPanel

**职责**: 展示 Agent 执行过程的详细信息

**状态管理**: 使用 useReducer 统一管理

```typescript
interface ExecutionPanelState {
  expanded: boolean;
  activeTab: 'thinking' | 'tools' | 'usage' | 'all';
  logsExpanded: boolean;
  thinkingExpanded: boolean;
}

type ExecutionPanelAction =
  | { type: 'TOGGLE_PANEL' }
  | { type: 'SET_TAB'; tab: ExecutionPanelState['activeTab'] }
  | { type: 'TOGGLE_LOGS' }
  | { type: 'TOGGLE_THINKING' };

export const AgentExecutionPanel = memo(function AgentExecutionPanel({ 
  metadata, 
  isStreaming 
}: Props) {
  const [state, dispatch] = useReducer(executionPanelReducer, {
    expanded: false,
    activeTab: 'all',
    logsExpanded: false,
    thinkingExpanded: false,
  });
  
  // 没有任何执行数据时不显示
  if (!metadata || (!metadata.thinking && !metadata.toolLogs?.length && !metadata.usage)) {
    return null;
  }
  
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <div className="mt-2 border-t border-white/10 pt-2">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
          aria-expanded={state.expanded}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300"
        >
          {state.expanded ? <ChevronUp /> : <ChevronDown />}
          <span>执行详情</span>
          {isStreaming && <Loader2 className="animate-spin" />}
        </button>
        
        {state.expanded && (
          <div className="mt-2 space-y-2">
            {metadata.thinking && (
              <ThinkingSection 
                content={metadata.thinking} 
                isStreaming={isStreaming} 
              />
            )}
            
            {metadata.toolLogs && metadata.toolLogs.length > 0 && (
              <ToolLogsSection 
                logs={metadata.toolLogs}
                expanded={state.logsExpanded}
                onToggle={() => dispatch({ type: 'TOGGLE_LOGS' })}
                isStreaming={isStreaming}
              />
            )}
            
            {metadata.usage && (
              <UsageSection usage={metadata.usage} />
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});
```

#### 3.2 ThinkingSection

**职责**: 展示 Agent 的思考过程

```typescript
export const ThinkingSection = memo(function ThinkingSection({ 
  content, 
  isStreaming 
}: Props) {
  return (
    <div className="bg-purple-500/10 border-l-2 border-purple-500/50 rounded p-2">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-3 h-3 text-purple-400" />
        <span className="text-xs text-purple-400 font-semibold">Thinking</span>
        {isStreaming && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <div className="text-xs prose prose-sm prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});
```

#### 3.3 ToolLogsSection

**职责**: 展示工具使用记录

**性能优化**: 使用虚拟滚动 + 防抖

```typescript
export const ToolLogsSection = memo(function ToolLogsSection({ 
  logs, 
  expanded, 
  onToggle,
  isStreaming
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // 虚拟滚动
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 5,
  });
  
  // 防抖滚动
  const scrollToBottom = useDebouncedCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, 100);
  
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [logs.length, isStreaming, scrollToBottom]);
  
  // 缓存统计信息
  const stats = useMemo(() => {
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount = logs.filter(l => l.status === 'error').length;
    const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
    return { successCount, errorCount, totalDuration };
  }, [logs]);
  
  return (
    <div className="bg-blue-500/10 border-l-2 border-blue-500/50 rounded p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Wrench className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-blue-400 font-semibold">Tool Logs</span>
          <span className="text-xs text-gray-500">{logs.length} operations</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{stats.successCount} success</span>
          <span>{stats.errorCount} errors</span>
          <span>{formatDuration(stats.totalDuration)}</span>
        </div>
      </div>
      
      <div ref={parentRef} className="max-h-48 overflow-y-auto">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ToolLogItem log={logs[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
```

#### 3.4 ToolLogItem

**职责**: 渲染单条工具日志

```typescript
const TOOL_ICONS: Record<string, React.ComponentType> = {
  Edit: FileEdit,
  Read: FileText,
  Bash: Terminal,
  Write: FilePlus,
  Grep: Search,
  Glob: FolderSearch,
  Agent: Bot,
  WebFetch: Globe,
  WebSearch: Search,
};

const TOOL_COLORS: Record<string, string> = {
  Edit: 'text-blue-400',
  Read: 'text-green-400',
  Bash: 'text-purple-400',
  Write: 'text-yellow-400',
  Grep: 'text-orange-400',
};

export const ToolLogItem = memo(function ToolLogItem({ log }: Props) {
  const Icon = TOOL_ICONS[log.toolName] || Wrench;
  const iconColor = TOOL_COLORS[log.toolName] || 'text-gray-400';
  
  return (
    <div className="flex items-center gap-2 text-xs font-mono group hover:bg-white/5 rounded px-1 py-0.5">
      <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
      <span className="text-gray-300 font-semibold">{log.toolName}</span>
      <span className="text-gray-500 truncate flex-1">{log.action}</span>
      
      {log.params && (
        <Tooltip content={JSON.stringify(log.params, null, 2)}>
          <span className="text-gray-600 truncate max-w-[200px]">
            {formatParams(log.params)}
          </span>
        </Tooltip>
      )}
      
      {log.duration && (
        <span className="text-gray-500 shrink-0 tabular-nums">
          {formatDuration(log.duration)}
        </span>
      )}
      
      <StatusBadge status={log.status} result={log.result} />
      
      {log.status === 'error' && log.result?.error && (
        <Tooltip content={log.result.error}>
          <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
        </Tooltip>
      )}
    </div>
  );
});
```

#### 3.5 UsageSection

**职责**: 展示 Token 使用统计

```typescript
export const UsageSection = memo(function UsageSection({ usage }: Props) {
  return (
    <div className="bg-green-500/10 border-l-2 border-green-500/50 rounded p-2">
      <div className="flex items-center gap-2 mb-1">
        <Coins className="w-3 h-3 text-green-400" />
        <span className="text-xs text-green-400 font-semibold">Usage</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Input:</span>
          <span className="text-gray-200">{usage.inputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Output:</span>
          <span className="text-gray-200">{usage.outputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total:</span>
          <span className="text-gray-200 font-semibold">{usage.totalTokens.toLocaleString()}</span>
        </div>
        {usage.cost?.totalCost && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cost:</span>
            <span className="text-green-300 font-semibold">${usage.cost.totalCost.toFixed(4)}</span>
          </div>
        )}
        {usage.cache?.readTokens && (
          <div className="flex items-center justify-between col-span-2">
            <span className="text-gray-400">Cache Read:</span>
            <span className="text-blue-300">{usage.cache.readTokens.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
});
```

---

### 4. 流式更新机制

#### 4.1 WebSocket 消息格式

```typescript
interface StreamingUpdateEvent {
  messageId: string;
  sequence: number;  // 消息序列号
  type: 'thinking' | 'tool_log' | 'content' | 'usage' | 'completed';
  data: {
    thinking?: string;
    toolLog?: ToolLog;
    content?: string;
    usage?: TokenUsage;
    streamingStatus?: string;
  };
  timestamp: string;
}
```

#### 4.2 乱序处理

```typescript
const messageQueue = useRef<Map<string, StreamingUpdateEvent[]>>(new Map());
const lastSequence = useRef<Map<string, number>>(new Map());

function handleStreamingUpdate(event: StreamingUpdateEvent) {
  const msgId = event.messageId;
  const lastSeq = lastSequence.current.get(msgId) || 0;
  
  if (event.sequence === lastSeq + 1) {
    applyUpdate(event);
    lastSequence.current.set(msgId, event.sequence);
    processQueuedMessages(msgId);
  } else if (event.sequence > lastSeq + 1) {
    const queue = messageQueue.current.get(msgId) || [];
    queue.push(event);
    queue.sort((a, b) => a.sequence - b.sequence);
    messageQueue.current.set(msgId, queue);
  }
}
```

#### 4.3 断线重连

```typescript
trpc.subscription.onMessageStreaming.useSubscription(
  { channelId },
  {
    onData: handleStreamingUpdate,
    onError: (error) => {
      console.error('Streaming error:', error);
      markMessagesAsDisconnected(channelId);
    },
    onReconnect: async () => {
      const updates = await trpc.message.getMissedUpdates.query({
        channelId,
        since: lastUpdateTimestamp.current,
      });
      updates.forEach(applyUpdate);
    },
  }
);
```

---

### 5. 性能优化

#### 5.1 React.memo

```typescript
export const AgentExecutionPanel = memo(AgentExecutionPanel, (prev, next) => {
  return (
    prev.isStreaming === next.isStreaming &&
    prev.metadata.thinking === next.metadata.thinking &&
    prev.metadata.toolLogs?.length === next.metadata.toolLogs?.length &&
    prev.metadata.usage === next.metadata.usage
  );
});
```

#### 5.2 useMemo

```typescript
const stats = useMemo(() => {
  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;
  const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
  return { successCount, errorCount, totalDuration };
}, [logs]);
```

---

### 6. 可访问性

#### 6.1 ARIA 属性

```typescript
<button
  onClick={() => setExpanded(!expanded)}
  aria-expanded={expanded}
  aria-controls={panelId}
>
  执行详情
</button>

<div
  id={panelId}
  role="region"
  aria-label="Agent 执行详情"
  hidden={!expanded}
>
  {/* content */}
</div>
```

#### 6.2 键盘导航

```typescript
<div
  role="list"
  aria-label="工具使用日志"
  onKeyDown={handleKeyDown}
  tabIndex={0}
>
  {logs.map((log, idx) => (
    <div
      key={log.id}
      role="listitem"
      tabIndex={idx === focusedIndex ? 0 : -1}
      aria-selected={idx === focusedIndex}
    >
      <ToolLogItem log={log} />
    </div>
  ))}
</div>
```

---

### 7. 文件组织

```
features/channel/components/ChannelPanel/
├── MessageList.tsx
├── MessageBubble/
│   ├── index.tsx
│   ├── MessageBubble.tsx
│   ├── UserMessage.tsx
│   ├── AgentMessage.tsx
│   └── AgentExecution/
│       ├── index.tsx
│       ├── AgentExecutionPanel.tsx
│       ├── ThinkingSection.tsx
│       ├── ToolLogsSection.tsx
│       ├── ToolLogItem.tsx
│       ├── UsageSection.tsx
│       └── types.ts
└── types.ts
```

---

## ✅ 架构优势

### 1. 稳定性
- 统一的命名约定（后端 snake_case，前端 camelCase）
- 健壮的数据结构（完整的错误信息、元数据）
- 完善的错误处理（ErrorBoundary、空状态处理）
- 断线重连机制（自动恢复数据）
- 消息顺序保证（序列号 + 乱序处理）

### 2. 优雅性
- useReducer 统一状态管理
- 虚拟滚动优化性能
- React.memo 避免不必要的重渲染
- useMemo 缓存计算结果
- 完善的 TypeScript 类型

### 3. 易用性
- 完整的 ARIA 属性
- 键盘导航支持
- Tooltip 提示
- 加载状态和空状态处理
- 清晰的视觉反馈

### 4. 可维护性
- 清晰的组件职责
- 统一的错误处理
- 完善的类型定义
- 易于测试

---

## 📝 实施计划

### Phase 1: 数据层扩展（2 天）
- [ ] 后端 Message 实体添加 `agent_execution_metadata` 字段
- [ ] 增强 ToolLog 和 TokenUsage 结构
- [ ] WebSocket 流式更新事件定义（含序列号）
- [ ] 添加断线重连和数据恢复 API

### Phase 2: 核心组件开发（3 天）
- [ ] AgentExecutionPanel 容器组件（useReducer）
- [ ] ThinkingSection 组件（Markdown + 代码高亮）
- [ ] ToolLogsSection 组件（虚拟滚动 + 防抖）
- [ ] ToolLogItem 组件（增强视觉反馈）
- [ ] UsageSection 组件（详细统计）
- [ ] ErrorBoundary 和错误处理

### Phase 3: 集成和测试（2 天）
- [ ] 集成到 MessageBubble
- [ ] WebSocket 流式更新集成（乱序处理）
- [ ] 单元测试（每个组件）
- [ ] E2E 测试（流式更新场景）

### Phase 4: 优化和文档（1 天）
- [ ] 性能优化（React.memo, useMemo）
- [ ] 可访问性优化（ARIA, 键盘导航）
- [ ] 组件文档和 Storybook
- [ ] 使用示例和最佳实践

**总计：8 天**

---

## 📚 参考资料

- [Claude Code CLI Documentation](https://docs.anthropic.com/claude/docs/claude-code)
- [React Virtual](https://tanstack.com/virtual/latest)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [claude_manager 项目](https://github.com/example/claude_manager)

---

**文档版本**: v2.0  
**最后更新**: 2026-05-25  
**维护者**: 布玛 (@OA_DESIGNER)
