# Agent 进度面板优化方案

## 问题描述

之前的对话气泡没有充分显示 Agent 回复过程中的实时信息（thinking、tool call 等），导致用户无法感知 Agent 的工作进度。

## 解决方案

创建了 **`AgentProgressPanel`** 组件，内聚展示 Agent 执行过程的所有实时信息。

## 组件特性

### 1. 统一的进度展示
- **pending/accepted**: 等待接收状态 + 等待时间
- **thinking**: 思考阶段 + 可折叠的思考内容
- **tool_use**: 工具调用 + 可展开的参数详情
- **responding**: 正在回复状态

### 2. 视觉反馈
- 每个阶段都有独特的颜色主题
- 动画效果：加载动画、脉冲动画、跳动的点
- 实时计时器显示等待时长

### 3. 交互设计
- **Thinking 内容**：点击展开/折叠查看完整思考过程
- **Tool 参数**：点击展开/折叠查看详细参数
- 参数自动截断（超过 100 字符）防止溢出

### 4. 阶段配色方案
| 阶段 | 颜色 | 图标 | 动画 |
|------|------|------|------|
| pending | 灰色 | Loader2 | 旋转 |
| accepted | 蓝色 | Loader2 | 旋转 |
| thinking | 蓝色 | Brain | 脉冲 |
| tool_use | 紫色 | Wrench | 无 |
| responding | 绿色 | MessageSquare | 无 |

## 文件变更

### 新增文件
- `AgentProgressPanel.tsx` - 新的统一进度面板组件

### 修改文件
- `MessageBubbleNew.tsx` - 替换原有的分散显示逻辑

### 移除依赖（保留但不再使用）
- `StreamingStatusIndicator.tsx` - 原简洁状态指示器
- `ToolCallIndicator.tsx` - 原工具调用指示器

## 使用示例

```tsx
<AgentProgressPanel
  phase={message.streamingPhase}
  thinking={message.streamingData?.thinking}
  currentTool={message.streamingData?.currentTool}
  startedAt={message.timestamp}
/>
```

## 数据流

```
WebSocket Event → useAgentStreaming
  ↓
Message.streamingPhase + streamingData
  ↓
MessageBubble → AgentProgressPanel
  ↓
实时 UI 更新
```

## 优势

1. **内聚性**：所有 Agent 过程信息集中在一个组件中
2. **可维护性**：单一职责，易于扩展和修改
3. **用户体验**：实时反馈，减少等待焦虑
4. **可见性**：thinking 内容不再被隐藏，用户可以看到 Agent 的思考过程
5. **灵活性**：可折叠/展开设计，用户可自主控制信息密度

## 后续优化方向

1. 添加 i18n 国际化支持
2. 支持自定义主题颜色
3. 添加进度百分比显示（如果后端支持）
4. 支持历史回放（查看完整执行过程）
5. 添加性能指标展示（响应时间、token 消耗等）
