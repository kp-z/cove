# Channel 时间轴工具优化 - Agent 执行 Prompt

**创建时间**: 2026-06-15  
**任务类型**: UI 优化 + 功能增强  
**相关组件**: Channel Timeline 调试工具

---

## 任务描述

优化 Channel 页面中的时间轴调试工具，解决两个核心问题：
1. **UI 问题**：展开内容显示在卡片下方的独立黑色卡片中，需要整合到卡片内部
2. **信息不足**：缺少 Agent 执行元数据、性能指标等关键调试信息，无法全方位把握对话链路

## 技术背景

**当前实现分析**：
- 文件：`cloud/frontend/src/features/channel/components/Timeline/CompactTimelineNode.tsx`
- 问题代码位置：第 186 行
- 当前结构：展开内容作为主卡片的兄弟元素，使用 `className="ml-9 mt-2 px-4 py-3 rounded-lg bg-black/30 border border-white/5"`
- 根本原因：DOM 结构设计为兄弟元素 + 深色背景样式

**数据结构**（参考 `cloud/backend/src/domain/models/message/message.types.ts`）：
- `MessageEntityJSON` 包含完整消息数据
- `AgentExecutionMetadata` 包含：thinking、tool_logs、usage、execution_mode、streaming_status
- `TokenUsage` 包含：tokens、cache、cost、latency
- `SystemEvent` 包含：type、level、message、metadata、stack

## 优化目标

### 1. UI 重构目标
- 展开内容从卡片外部移到卡片内部
- 去除独立的黑色背景（`bg-black/30`），改用内边框分隔线
- 保持视觉连贯性，提供紧凑一致的体验
- 添加平滑的展开/收起动画

### 2. 信息架构目标
设计 6 大信息维度，全方位追踪 channel 对话链路：

**📊 基础信息**（所有消息类型）
- Message ID / Short ID
- 消息状态（draft → sending → sent → failed）
- Content Type / Format
- 创建时间 / 更新时间
- 是否已编辑

**🤖 Agent 执行元数据**（仅 Agent 消息）
- 思考过程（thinking，可能很长，需要截断 + "展开全文"）
- 工具调用日志（tool_logs 数组）
  - 工具名称、状态（pending/running/success/error）
  - 参数、结果、执行时长
  - 图标：✓ success | ✗ error | ⟳ running | ⏸ pending
- 执行模式（API | CLI | SDK）
- 流式状态（thinking → tool_use → responding → completed）
- 执行时间范围（started_at → completed_at）

**⚡ 性能指标**（仅 Agent 消息）
- 使用的模型（model）
- Token 使用量
  - input_tokens、output_tokens、total_tokens
  - 千位分隔符格式化
- 缓存统计
  - 缓存命中率（hit_rate 百分比，保留 1 位小数）
  - 缓存读取 tokens、缓存创建 tokens
- 延迟指标
  - 首 token 延迟（first_token_ms，TTFT）
  - 总延迟（total_ms）
  - Token 生成速率（tokens_per_second）
- 成本明细
  - input_cost、output_cost、cache_cost、total_cost
  - 保留 4 位小数，美元符号

**🔗 关联信息**（所有消息类型）
- Mentions（@agent、@user、#channel、@task）
- References（task、plan、agent、file、url）
- 线程信息（thread_id、is_thread_root、回复数量）
- 表情反应（reactions 数组）

**🐛 系统事件详情**（仅 system 消息）
- 事件类型（websocket.*、message.*、error.* 等）
- 事件级别（INFO | WARN | ERROR | DEBUG）
- 事件消息
- Metadata（JSON 格式化显示）
- Stack Trace（仅 error 级别，可折叠）

**📝 编辑历史**（已编辑的消息）
- 编辑时间（edited_at）
- 编辑者（edited_by）
- 历史内容（previous_content）
- 按时间倒序显示

## 实施步骤

### Step 1: UI 结构重构

**文件**：`cloud/frontend/src/features/channel/components/Timeline/CompactTimelineNode.tsx`

**当前结构**（第 111-217 行）：
```tsx
<div className="relative">
  <div className="relative grid grid-cols-[24px_1fr] gap-3 group">
    {/* Timeline node */}
    {/* Content button */}
  </div>
  
  {/* 展开内容 - 兄弟元素 */}
  {isSystemEvent && isExpanded && systemDetails && (
    <div className="ml-9 mt-2 px-4 py-3 rounded-lg bg-black/30 border border-white/5">
      {/* 展开内容 */}
    </div>
  )}
</div>
```

**优化后结构**：
```tsx
<div className="relative grid grid-cols-[24px_1fr] gap-3 group">
  {/* Timeline Line */}
  {!isLast && (
    <div className="absolute left-3 top-6 bottom-[-8px] w-px bg-white/10" />
  )}
  
  {/* Timeline Node */}
  <div className="relative z-10 flex-shrink-0">
    <div className={`w-6 h-6 rounded-full border-2 ...`}>
      <Icon className="w-3 h-3" />
    </div>
  </div>
  
  {/* Card Container - 包含主行和展开内容 */}
  <div className={`
    rounded-lg border transition-all duration-200 overflow-hidden
    ${isActive 
      ? 'bg-white/10 border-white/20' 
      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
    }
  `}>
    {/* 主行按钮 */}
    <button
      onClick={handleClick}
      className="w-full px-3 py-2 flex items-center gap-2"
    >
      {/* 现有主行内容 */}
    </button>
    
    {/* 展开内容 - 嵌套在卡片内 */}
    {isExpanded && (
      <div className="border-t border-white/10 px-3 py-3 animate-in slide-in-from-top-2 duration-200">
        {/* 动态渲染各个 Section */}
      </div>
    )}
  </div>
</div>
```

**关键变化**：
1. 移除外层 `<div className="relative">`，直接使用 grid 容器
2. 将卡片容器从 `<button>` 提升为独立的 `<div>`
3. `<button>` 只负责主行内容，展开内容作为其兄弟元素但在同一卡片内
4. 去除 `ml-9 mt-2` 和 `bg-black/30`，改用 `border-t border-white/10` 分隔
5. 添加 `overflow-hidden` 确保圆角正确显示
6. 使用 Tailwind 的 `animate-in` 实现展开动画

### Step 2: 创建信息展示子组件

**目录结构**：
```
cloud/frontend/src/features/channel/components/Timeline/
├── sections/
│   ├── BasicInfoSection.tsx
│   ├── AgentExecutionSection.tsx
│   ├── PerformanceMetricsSection.tsx
│   ├── RelatedInfoSection.tsx
│   ├── SystemEventSection.tsx
│   └── EditHistorySection.tsx
├── CompactTimelineNode.tsx
└── index.tsx
```

**统一样式约定**：
```tsx
// 区块标题
<div className="mb-3">
  <div className="text-xs font-semibold text-gray-400 mb-2">
    📊 基础信息
  </div>
  {/* 内容 */}
</div>

// 字段显示（树形结构）
<div className="text-sm space-y-1">
  <div className="text-gray-300">
    <span className="text-gray-500">├─ ID:</span> msg-1234567890-abc
  </div>
  <div className="text-gray-300">
    <span className="text-gray-500">├─ 状态:</span> sent
  </div>
  <div className="text-gray-300">
    <span className="text-gray-500">└─ 类型:</span> text/markdown
  </div>
</div>

// JSON 数据显示
<pre className="text-xs text-gray-300 font-mono overflow-x-auto bg-black/20 p-2 rounded mt-1">
  {JSON.stringify(metadata, null, 2)}
</pre>
```

**子组件接口示例**：

```tsx
// BasicInfoSection.tsx
interface BasicInfoSectionProps {
  messageId: string;
  msgShortId: string;
  status: MessageStatus;
  contentType: ContentType;
  contentFormat: ContentFormat;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

// AgentExecutionSection.tsx
interface AgentExecutionSectionProps {
  metadata: AgentExecutionMetadata;
}

// PerformanceMetricsSection.tsx
interface PerformanceMetricsSectionProps {
  usage: TokenUsage;
}

// RelatedInfoSection.tsx
interface RelatedInfoSectionProps {
  mentions: MessageMention[];
  references: MessageReference[];
  threadId?: string;
  isThreadRoot: boolean;
  reactions: MessageReaction[];
}

// SystemEventSection.tsx
interface SystemEventSectionProps {
  type: SystemEventType;
  level: SystemEventLevel;
  message: string;
  metadata?: Record<string, any>;
  stack?: string;
}

// EditHistorySection.tsx
interface EditHistorySectionProps {
  history: MessageEditHistory[];
}
```

### Step 3: 更新 CompactTimelineNode Props

**文件**：`cloud/frontend/src/features/channel/components/Timeline/CompactTimelineNode.tsx`

```tsx
export interface CompactTimelineNodeProps {
  // 现有字段
  type: 'text' | 'image' | 'file' | 'thread' | 'system';
  icon: LucideIcon;
  sender: string;
  metadata: string;
  timestamp: string;
  isActive?: boolean;
  isLast?: boolean;
  onClick?: () => void;
  
  // 系统事件字段（保留）
  systemLevel?: 'info' | 'warn' | 'error' | 'debug';
  systemDetails?: {
    message: string;
    metadata?: Record<string, any>;
    stack?: string;
  };
  
  // 新增：完整消息数据
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

**展开内容渲染逻辑**：
```tsx
{isExpanded && (
  <div className="border-t border-white/10 px-3 py-3 space-y-4">
    {/* 基础信息 - 所有消息 */}
    {messageData && (
      <BasicInfoSection
        messageId={messageData.message_id}
        msgShortId={messageData.msg_short_id}
        status={messageData.status}
        contentType={messageData.content_type}
        contentFormat={messageData.content_format}
        createdAt={messageData.created_at}
        updatedAt={messageData.updated_at}
        isEdited={messageData.is_edited}
      />
    )}
    
    {/* Agent 执行 + 性能指标 - 仅 Agent 消息 */}
    {messageData?.sender_type === 'agent' && messageData.agent_execution_metadata && (
      <>
        <AgentExecutionSection metadata={messageData.agent_execution_metadata} />
        {messageData.agent_execution_metadata.usage && (
          <PerformanceMetricsSection usage={messageData.agent_execution_metadata.usage} />
        )}
      </>
    )}
    
    {/* 关联信息 - 有数据时显示 */}
    {messageData && (messageData.mentions?.length > 0 || messageData.references?.length > 0 || messageData.thread_id) && (
      <RelatedInfoSection
        mentions={messageData.mentions || []}
        references={messageData.references || []}
        threadId={messageData.thread_id}
        isThreadRoot={messageData.is_thread_root}
        reactions={messageData.reactions || []}
      />
    )}
    
    {/* 系统事件 - 仅 system 消息 */}
    {type === 'system' && systemDetails && (
      <SystemEventSection
        type={systemDetails.type}
        level={systemLevel || 'info'}
        message={systemDetails.message}
        metadata={systemDetails.metadata}
        stack={systemDetails.stack}
      />
    )}
    
    {/* 编辑历史 - 已编辑的消息 */}
    {messageData?.is_edited && messageData.edit_history && messageData.edit_history.length > 0 && (
      <EditHistorySection history={messageData.edit_history} />
    )}
  </div>
)}
```

### Step 4: 数据传递链路检查

**文件**：`cloud/frontend/src/features/channel/hooks/useTimelineNodes.ts`

**检查点**：
1. `useMessages(channelId)` hook 返回的数据是否包含完整的 `agent_execution_metadata`
2. `TimelineNode` 类型定义中的 `data` 字段是否足够传递所有信息
3. 转换逻辑是否正确映射后端字段（snake_case）到前端（camelCase）

**如果数据不完整**：
- 在 `useTimelineNodes` 中从 `messages` 数组提取完整的 message 对象
- 将完整 message 传递给 `CompactTimelineNode` 的 `messageData` prop

**数据流**：
```
Backend: MessageEntity
  ↓ (tRPC序列化)
Frontend: MessageEntityJSON (snake_case)
  ↓ (useMessages hook)
messages: Message[] (可能已转换为 camelCase)
  ↓ (useTimelineNodes 转换)
timelineNodes: TimelineNode[]
  ↓ (Timeline 组件渲染)
CompactTimelineNode (messageData prop)
```

### Step 5: 格式化工具函数

**文件**：`cloud/frontend/src/features/channel/components/Timeline/utils/format.ts`（新建）

```tsx
/**
 * 格式化 token 数量（千位分隔符）
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString('en-US');
}

/**
 * 格式化百分比（保留 1 位小数）
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * 格式化成本（美元，保留 4 位小数）
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * 格式化延迟
 * < 1000ms: 显示毫秒
 * >= 1000ms: 显示秒
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 截断长文本
 */
export function truncateText(text: string, maxLength: number = 100): {
  truncated: string;
  isTruncated: boolean;
} {
  if (text.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }
  return {
    truncated: text.slice(0, maxLength) + '...',
    isTruncated: true,
  };
}

/**
 * 获取工具状态图标
 */
export function getToolStatusIcon(status: 'pending' | 'running' | 'success' | 'error'): string {
  const icons = {
    pending: '⏸',
    running: '⟳',
    success: '✓',
    error: '✗',
  };
  return icons[status];
}
```

### Step 6: 性能优化

**1. React.memo 包裹子组件**：
```tsx
export const BasicInfoSection = React.memo<BasicInfoSectionProps>(({ ... }) => {
  // 组件实现
});
```

**2. 长文本展开/收起**：
```tsx
const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
const { truncated, isTruncated } = truncateText(thinking, 200);

return (
  <div>
    <div className="text-gray-300">{isThinkingExpanded ? thinking : truncated}</div>
    {isTruncated && (
      <button
        onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
        className="text-xs text-blue-400 hover:text-blue-300 mt-1"
      >
        {isThinkingExpanded ? '收起' : '展开全文'}
      </button>
    )}
  </div>
);
```

**3. 虚拟滚动**（可选，如果时间轴列表很长）：
```bash
npm install @tanstack/react-virtual
```

## 验证清单

### UI 验证
- [ ] 展开内容在卡片内部，无独立黑色卡片
- [ ] 主行和展开内容在同一视觉容器内
- [ ] 使用内边框（`border-t`）分隔，而非深色背景
- [ ] 展开/收起动画流畅（约 200ms）
- [ ] 不同消息类型的图标和颜色正确

### 数据验证
- [ ] 基础信息字段完整（ID、状态、类型、时间戳）
- [ ] Agent 消息显示执行元数据（thinking、tool_logs、mode、status）
- [ ] 性能指标格式正确（千位分隔符、百分比、成本、延迟）
- [ ] 关联信息正确（mentions、references、thread、reactions）
- [ ] 系统事件显示完整（type、level、message、metadata、stack）
- [ ] 编辑历史按时间倒序显示

### 交互验证
- [ ] 点击主行可展开/收起
- [ ] 展开内容中的"展开全文"按钮工作正常
- [ ] 长文本（thinking、stack）正确截断
- [ ] JSON 数据格式化显示美观
- [ ] 工具调用状态图标正确（✓ ✗ ⟳ ⏸）

### 性能验证
- [ ] 初次渲染时只渲染折叠状态，展开内容不渲染
- [ ] 展开时渲染流畅，无明显卡顿
- [ ] 滚动时间轴列表流畅（如果列表很长，考虑虚拟滚动）

## 测试步骤

**1. 启动开发服务器**：
```bash
cd cloud/frontend
npm run dev
```

**2. 测试场景**：

**场景 A：Human 消息**
- 在 channel 中发送普通文本消息
- 点击时间轴节点展开
- 验证：基础信息、关联信息区块显示

**场景 B：Agent 消息**
- 触发 Agent 自动响应（@mention 或 agentPool）
- 等待 Agent 回复完成
- 点击 Agent 消息节点展开
- 验证：基础信息、Agent 执行、性能指标、关联信息区块显示
- 验证：thinking 长文本可展开/收起
- 验证：tool_logs 列表正确，状态图标正确
- 验证：tokens、cache、latency、cost 格式正确

**场景 C：System 事件**
- 触发系统事件（如断开 WebSocket）
- 点击系统事件节点展开
- 验证：系统事件区块显示，包含 type、level、message、metadata
- 验证：如果是 error 级别，stack trace 可展开查看

**场景 D：编辑消息**
- 发送一条消息
- 编辑该消息内容
- 点击消息节点展开
- 验证：编辑历史区块显示，包含编辑时间、编辑者、历史内容

**3. 浏览器测试**：
- Chrome DevTools 检查 DOM 结构
- 确认展开内容在卡片 div 内部，不是兄弟元素
- 确认无 `bg-black/30` 样式
- 确认使用 `border-t border-white/10` 分隔线

## 风险和注意事项

1. **数据可用性**：
   - 并非所有 Agent 消息都有完整的 `agent_execution_metadata`
   - 需要对每个字段进行空值检查（`?.`可选链）
   - 使用条件渲染确保只在数据存在时显示对应区块

2. **性能影响**：
   - 展开内容包含大量嵌套结构和格式化逻辑
   - 使用 `React.memo` 避免不必要的重渲染
   - 默认折叠状态，只在展开时渲染内容（条件渲染）

3. **UI 一致性**：
   - 确保新样式与现有深色主题匹配
   - 字体大小、颜色、间距与其他组件保持一致
   - 使用项目中已有的 Tailwind 配置

4. **向后兼容**：
   - 保留现有的系统事件展开功能
   - 确保时间轴的其他功能（筛选、搜索、分组）不受影响

5. **类型安全**：
   - 所有 props 接口使用 TypeScript 严格类型
   - 避免使用 `any`，使用 `unknown` 并进行类型守卫

## 后续优化方向

1. **搜索和过滤增强**：
   - 基于 tool_name 过滤（"显示所有 Read 工具调用"）
   - 基于 execution_mode 过滤（"只显示 CLI 执行的消息"）
   - 基于 model 过滤（"只显示 opus-4-7 的回复"）
   - 基于成本范围过滤（"显示成本 > $0.01 的消息"）

2. **数据导出**：
   - 导出时间轴为 JSON 格式
   - 导出为 CSV 格式（用于 Excel 分析）
   - 导出选中的消息或时间范围

3. **可视化增强**：
   - Token 使用趋势图（折线图）
   - 成本累积图（柱状图）
   - 延迟分布图（直方图）
   - 缓存命中率饼图

4. **实时更新**：
   - 监听 `agent.response.streaming` 事件
   - 实时更新展开内容中的 tool_logs
   - 实时更新 usage 统计（streaming 过程中）

5. **快捷操作**：
   - 复制 message_id 到剪贴板
   - 跳转到引用的 task/plan
   - 直接回复或 @mention
   - 标记消息为重要/固定

---

**文档版本**: 1.0  
**最后更新**: 2026-06-15
