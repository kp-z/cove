# Channel 时间轴工具优化 Prompt

**创建时间**: 2026-06-15  
**Prompt 类型**: 功能优化  
**目标组件**: Channel Timeline 调试工具

---

## Prompt 内容

你是一个前端开发专家，现在需要优化 Channel 页面中的时间轴调试工具。

### 背景

当前时间轴工具存在两个问题：

1. **UI 问题**：点击展开节点时，详细内容显示在卡片下方的独立黑色背景区域（`bg-black/30`），视觉上与主卡片分离，不够紧凑
2. **信息不足**：当前只显示基础的消息信息和系统事件，缺少关键调试信息：
   - Agent 执行元数据（thinking、工具调用日志）
   - 性能指标（token 使用、缓存命中率、延迟、成本）
   - 消息关联信息（mentions、references、线程、反应）
   - 消息编辑历史

### 优化目标

**目标 1：UI 重构**
- 将展开内容从卡片下方的兄弟元素移到卡片内部
- 去除独立的黑色背景（`bg-black/30`），改用内边框分隔线（`border-t border-white/10`）
- 主行和展开内容在同一个视觉容器内，提供紧凑一致的体验
- 添加平滑的展开/收起动画

**目标 2：信息架构**
设计 6 大信息维度，全方位追踪 channel 对话链路：

**📊 基础信息**（所有消息）
```
├─ ID: msg-1234567890-abc (#abc)
├─ 状态: sent (创建于 2026-06-15 10:23:45)
├─ 类型: text/markdown
└─ 编辑: 否
```

**🤖 Agent 执行**（仅 Agent 消息）
```
├─ 模式: API
├─ 状态: completed
├─ 时长: 2.34s (10:23:45 → 10:23:47)
├─ 思考: [可展开] 用户想要优化时间轴...
└─ 工具调用: 3 个
    ├─ [✓] Read (245ms) - CompactTimelineNode.tsx
    ├─ [✓] Grep (180ms) - useTimelineNodes
    └─ [✓] Agent (1.2s) - Explore agent
```

**⚡ 性能指标**（仅 Agent 消息）
```
├─ 模型: claude-opus-4-7
├─ Tokens: 1,234 input + 3,567 output = 4,801 total
├─ 缓存: 85.3% 命中率 (2,100 read, 450 new)
├─ 延迟: 240ms TTFT | 2,340ms 总时长 | 45 tokens/s
└─ 成本: $0.0234 ($0.012 + $0.011 + $0.0004 cache)
```

**🔗 关联信息**（所有消息）
```
├─ Mentions: @agent-claude, @user-kp
├─ References: task-123 "优化时间轴"
├─ 线程: 根消息 (5 条回复)
└─ 反应: 👍 3, 🎉 1
```

**🐛 系统事件**（仅 system 消息）
```
├─ 类型: websocket.disconnected
├─ 级别: WARN
├─ 消息: Connection lost, reconnecting...
└─ Metadata: {"retry": 2, "next": "5s"}
```

**📝 编辑历史**（已编辑消息）
```
├─ [2] 2026-06-15 10:25:30 by user-kp
│   "这是第二版内容"
└─ [1] 2026-06-15 10:24:00 by user-kp
    "这是第一版内容"
```

### 关键文件

- `cloud/frontend/src/features/channel/components/Timeline/CompactTimelineNode.tsx` - 主要修改文件（第 111-217 行）
- `cloud/frontend/src/features/channel/hooks/useTimelineNodes.ts` - 确保传递完整 message 数据
- `cloud/backend/src/domain/models/message/message.types.ts` - 参考数据结构

### 实施要求

#### 1. UI 结构调整

**当前结构（问题）**：
```tsx
<div className="relative">
  <div className="grid grid-cols-[24px_1fr]">
    {/* 主行 */}
  </div>
  {/* 展开内容 - 兄弟元素，黑色背景 */}
  {isExpanded && <div className="ml-9 mt-2 bg-black/30">...</div>}
</div>
```

**优化后结构（目标）**：
```tsx
<div className="grid grid-cols-[24px_1fr]">
  {/* Timeline node */}
  <div>...</div>
  
  {/* Card - 包含主行和展开内容 */}
  <div className="rounded-lg border bg-white/5 overflow-hidden">
    {/* 主行 */}
    <button className="w-full px-3 py-2">...</button>
    
    {/* 展开内容 - 嵌套在卡片内 */}
    {isExpanded && (
      <div className="border-t border-white/10 px-3 py-3">
        {/* 各个信息区块 */}
      </div>
    )}
  </div>
</div>
```

**关键变化**：
- 移除外层 `<div className="relative">`
- 卡片容器包裹主行和展开内容
- 去除 `ml-9 mt-2` 和 `bg-black/30`
- 使用 `border-t border-white/10` 作为分隔线
- 添加 `overflow-hidden` 确保圆角正确

#### 2. 创建信息展示组件

在 `cloud/frontend/src/features/channel/components/Timeline/sections/` 下创建 6 个子组件：

**BasicInfoSection.tsx**
- 接收：messageId, msgShortId, status, contentType, createdAt, isEdited
- 显示：ID、状态、类型、时间戳、是否编辑

**AgentExecutionSection.tsx**
- 接收：AgentExecutionMetadata (thinking, tool_logs, execution_mode, streaming_status, started_at, completed_at)
- 显示：执行模式、状态、时长、思考过程（可展开）、工具调用列表
- 工具状态图标：✓ success | ✗ error | ⟳ running | ⏸ pending

**PerformanceMetricsSection.tsx**
- 接收：TokenUsage (tokens, cache, cost, latency, model)
- 显示：模型、token 使用（千位分隔符）、缓存统计（百分比 1 位小数）、延迟、成本（4 位小数）

**RelatedInfoSection.tsx**
- 接收：mentions[], references[], threadId, isThreadRoot, reactions[]
- 显示：@mentions、引用、线程信息、表情反应

**SystemEventSection.tsx**
- 接收：type, level, message, metadata, stack
- 显示：事件类型、级别标签、消息、metadata（JSON 格式化）、堆栈（仅 error）

**EditHistorySection.tsx**
- 接收：edit_history[]
- 显示：按时间倒序的编辑记录（时间、编辑者、历史内容）

**统一样式约定**：
```tsx
// 区块标题
<div className="text-xs font-semibold text-gray-400 mb-2">
  📊 基础信息
</div>

// 树形列表
<div className="text-sm space-y-1">
  <div className="text-gray-300">
    <span className="text-gray-500">├─ 字段:</span> 值
  </div>
</div>
```

#### 3. 更新 CompactTimelineNode Props

添加 `messageData` prop，包含完整的 `MessageEntityJSON` 数据：
```tsx
interface CompactTimelineNodeProps {
  // ... 现有字段
  messageData?: {
    message_id: string;
    msg_short_id: string;
    sender_type: SenderType;
    status: MessageStatus;
    content_type: ContentType;
    content_format: ContentFormat;
    created_at: string;
    updated_at: string;
    is_edited: boolean;
    edit_history?: MessageEditHistory[];
    mentions?: MessageMention[];
    references?: MessageReference[];
    thread_id?: string;
    is_thread_root: boolean;
    reactions?: MessageReaction[];
    agent_execution_metadata?: AgentExecutionMetadata;
  };
}
```

#### 4. 条件渲染逻辑

在展开内容中根据消息类型和数据可用性动态渲染：
```tsx
{isExpanded && (
  <div className="border-t border-white/10 px-3 py-3 space-y-4">
    {/* 基础信息 - 所有消息 */}
    {messageData && <BasicInfoSection {...} />}
    
    {/* Agent 执行 + 性能 - 仅 Agent 消息 */}
    {messageData?.sender_type === 'agent' && messageData.agent_execution_metadata && (
      <>
        <AgentExecutionSection metadata={messageData.agent_execution_metadata} />
        {messageData.agent_execution_metadata.usage && (
          <PerformanceMetricsSection usage={messageData.agent_execution_metadata.usage} />
        )}
      </>
    )}
    
    {/* 关联信息 - 有数据时 */}
    {(messageData?.mentions?.length > 0 || ...) && <RelatedInfoSection {...} />}
    
    {/* 系统事件 - 仅 system 消息 */}
    {type === 'system' && systemDetails && <SystemEventSection {...} />}
    
    {/* 编辑历史 - 已编辑消息 */}
    {messageData?.is_edited && messageData.edit_history?.length > 0 && <EditHistorySection {...} />}
  </div>
)}
```

#### 5. 格式化工具函数

创建 `cloud/frontend/src/features/channel/components/Timeline/utils/format.ts`：

```tsx
// 千位分隔符
export function formatTokens(n: number): string {
  return n.toLocaleString('en-US');
}

// 百分比（1位小数）
export function formatPercentage(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

// 成本（4位小数）
export function formatCost(c: number): string {
  return `$${c.toFixed(4)}`;
}

// 延迟（<1000ms显示ms，否则s）
export function formatLatency(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms/1000).toFixed(2)}s`;
}

// 时间戳
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// 截断长文本
export function truncateText(text: string, max = 100) {
  if (text.length <= max) return { truncated: text, isTruncated: false };
  return { truncated: text.slice(0, max) + '...', isTruncated: true };
}

// 工具状态图标
export function getToolStatusIcon(status: string): string {
  return { pending: '⏸', running: '⟳', success: '✓', error: '✗' }[status] || '';
}
```

#### 6. 性能优化

- 所有子组件用 `React.memo` 包裹
- 长文本（thinking、stack）提供"展开全文"按钮
- 使用条件渲染，默认折叠状态不渲染展开内容

#### 7. 数据传递检查

检查 `useTimelineNodes.ts` 确保：
- `TimelineNode.data` 包含完整的 message 对象
- `agent_execution_metadata` 正确传递
- 字段命名正确（snake_case 或 camelCase）

### 验证标准

**UI 验证**：
- ✅ 展开内容在卡片内部，无独立黑色卡片
- ✅ 使用 `border-t` 分隔，而非 `bg-black/30`
- ✅ 展开/收起动画流畅

**数据验证**：
- ✅ 基础信息完整（ID、状态、类型、时间）
- ✅ Agent 消息显示执行元数据和性能指标
- ✅ 格式化正确（千位分隔符、百分比、成本、延迟）
- ✅ 关联信息、系统事件、编辑历史正确显示

**测试场景**：
1. Human 消息：展开查看基础信息和关联信息
2. Agent 消息：展开查看 Agent 执行、性能指标、thinking 可展开
3. System 事件：展开查看事件详情、metadata、stack
4. 编辑消息：展开查看编辑历史

### 注意事项

1. **空值处理**：使用 `?.` 可选链，并非所有消息都有 `agent_execution_metadata`
2. **向后兼容**：保留现有系统事件展开功能
3. **类型安全**：使用 TypeScript 严格类型，避免 `any`
4. **UI 一致性**：与现有深色主题保持一致

### 期望输出

完成后，时间轴节点展开效果应该是：
```
┌─────────────────────────────────────┐
│  [●] sender • metadata     time  ▼  │ ← 主行
├─────────────────────────────────────┤  ← border-t 分隔线
│  📊 基础信息                        │
│  ├─ ID: msg-xxx                     │
│  └─ 状态: sent                      │
│                                     │
│  🤖 Agent 执行                      │  ← 仅 Agent 消息
│  ├─ 模式: API                       │
│  └─ 工具: 3 个 [✓✓✓]               │
│                                     │
│  ⚡ 性能指标                        │  ← 仅 Agent 消息
│  ├─ Tokens: 1,234 + 3,567          │
│  └─ 成本: $0.0234                  │
└─────────────────────────────────────┘
```

所有内容在同一个卡片容器内，视觉紧凑、信息全面。

---

**Prompt 版本**: 1.0  
**适用 Agent**: 前端开发 Agent / Code Generator Agent  
**预计工作量**: 2-3 小时
