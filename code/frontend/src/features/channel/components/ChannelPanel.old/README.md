# ChannelPanel 组件

统一的 Agent Channel 对话面板，参考 claude_manager 的 UI 设计。

## 📋 组件结构

```
ChannelPanel/
├── types.ts              # 类型定义
├── ChannelHeader.tsx     # Channel 信息栏
├── ThreadTabs.tsx        # Thread 切换标签
├── AgentInfoBar.tsx      # Agent 信息展示
├── MessageList.tsx       # 消息列表
├── Composer.tsx          # 输入框
├── index.tsx             # 主组件
├── exports.ts            # 统一导出
└── README.md             # 本文档
```

## 🎨 UI 布局

```
┌─────────────────────────────────────┐
│ ChannelHeader                       │  ← Channel 名称、返回、关闭按钮
├─────────────────────────────────────┤
│ ThreadTabs                          │  ← Thread 切换标签栏
├─────────────────────────────────────┤
│ AgentInfoBar                        │  ← Agent 信息（可展开）
├─────────────────────────────────────┤
│                                     │
│ MessageList                         │  ← 消息列表（占据主要空间）
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Composer                            │  ← 输入框和发送按钮
└─────────────────────────────────────┘
```

## 🚀 使用方法

### 基本用法

```tsx
import { ChannelPanel } from '@/features/agent-channel/components/ChannelPanel';

function App() {
  return (
    <ChannelPanel
      channelId="channel-123"
      threadId="thread-456" // 可选
      onClose={() => console.log('Close panel')}
    />
  );
}
```

### 集成到侧边栏

```tsx
import { ChannelPanel } from '@/features/agent-channel/components/ChannelPanel';

function GlobalAgentSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);

  if (!isOpen || !channelId) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[480px] z-50">
      <ChannelPanel
        channelId={channelId}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
```

## 📦 组件说明

### 1. ChannelHeader

显示 Channel 基本信息和操作按钮。

**功能**：
- 显示 Channel 名称和类型图标（#、@、💬）
- 返回按钮（返回 Channel Hub）
- 关闭按钮（关闭整个面板）
- 显示 Channel 描述（可选）

**Props**：
```tsx
interface ChannelHeaderProps {
  channel: Channel;
  onBack: () => void;
  onClose: () => void;
}
```

### 2. ThreadTabs

显示 Thread 列表，支持切换和创建。

**功能**：
- "All" Tab（显示所有消息）
- Thread 列表（可滚动）
- 未读消息徽章
- 创建新 Thread 按钮

**Props**：
```tsx
interface ThreadTabsProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadChange: (threadId: string | null) => void;
  onCreateThread: () => void;
}
```

### 3. AgentInfoBar

显示 Agent 信息，支持展开/折叠。

**功能**：
- Agent 头像、名称、模型
- Agent 状态指示器（idle/running/error）
- 展开显示详细描述

**Props**：
```tsx
interface AgentInfoBarProps {
  agent: AgentInfo;
  expanded?: boolean;
  onToggleExpand?: () => void;
}
```

### 4. MessageList

显示消息列表，支持滚动和流式输出。

**功能**：
- 用户消息（右对齐，蓝色）
- Agent 消息（左对齐，深色）
- 系统消息（居中，灰色）
- 自动滚动到最新消息
- 流式输出动画
- 时间戳显示

**Props**：
```tsx
interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  className?: string;
}
```

### 5. Composer

消息输入框和功能按钮。

**功能**：
- 多行文本输入（自动扩展高度）
- Enter 发送，Shift+Enter 换行
- 发送按钮
- 停止生成按钮（流式输出时）
- 字符计数（可选）

**Props**：
```tsx
interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}
```

## 🔧 数据结构

### Channel

```tsx
interface Channel {
  channelId: string;
  type: 'team' | 'agent' | 'dm';
  name: string;
  description?: string;
  unreadCount: number;
  lastActivity: Date;
  isPinned: boolean;
  metadata?: {
    projectId?: string;
    workflowId?: string;
    okrId?: string;
    agentId?: string;
  };
}
```

### Thread

```tsx
interface Thread {
  threadId: string;
  channelId: string;
  title: string;
  isPinned: boolean;
  lastActivity: Date;
  messageCount: number;
  unreadCount: number;
}
```

### Message

```tsx
interface Message {
  messageId: string;
  threadId: string;
  sender: 'user' | 'agent' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}
```

### AgentInfo

```tsx
interface AgentInfo {
  agentId: string;
  name: string;
  avatar: string;
  model: 'opus' | 'sonnet' | 'haiku';
  status: 'idle' | 'running' | 'error';
  description?: string;
}
```

## 🎯 设计原则

### 1. 注释量 ≥ 代码量

每个组件都包含详细的注释：
- 组件功能说明
- Props 说明
- 函数说明
- 布局结构说明

### 2. 纯前端实现

当前版本使用 Mock 数据，不依赖后端 API。

实际使用时需要：
- 通过 API 获取 Channel、Thread、Message 数据
- 通过 WebSocket 接收实时消息
- 集成状态管理（Zustand）
- 集成 React Query 进行数据缓存

### 3. 性能优化

- 所有组件使用 `React.memo` 避免不必要的重渲染
- MessageList 支持虚拟滚动（TODO）
- 自动滚动使用 `smooth` 行为

### 4. 可访问性

- 所有按钮都有 `aria-label` 和 `title`
- 键盘快捷键支持（Enter 发送，Shift+Enter 换行）
- 语义化 HTML 标签

## 📝 TODO

- [ ] 集成后端 API
- [ ] 集成 WebSocket 实时通信
- [ ] 集成 Zustand 状态管理
- [ ] 集成 React Query 数据缓存
- [ ] MessageList 虚拟滚动（长列表优化）
- [ ] Markdown 渲染（消息内容）
- [ ] 代码高亮（代码块）
- [ ] 附件上传功能
- [ ] 消息搜索功能
- [ ] 消息引用功能
- [ ] 编写测试用例（覆盖率 80%+）

## 🎨 样式说明

### 颜色方案

- 背景色：`#0f111a`（深色背景）
- 边框色：`border-white/10`（半透明白色）
- 文本色：`text-white/90`（主要文本）、`text-white/50`（次要文本）
- 强调色：`bg-blue-500/20`（蓝色半透明）

### 间距系统

- 小间距：`gap-2`（8px）
- 中间距：`gap-3`（12px）
- 大间距：`gap-4`（16px）
- 内边距：`px-4 py-3`（水平 16px，垂直 12px）

### 圆角

- 小圆角：`rounded-lg`（8px）
- 中圆角：`rounded-xl`（12px）
- 大圆角：`rounded-2xl`（16px）
- 圆形：`rounded-full`

## 📚 参考

- claude_manager 的 `AgentChatSidebar` 组件
- claude_manager 的 `GlobalAgentChatPanel` 组件
- claude_manager 的 `AgentChatHeader` 组件
- claude_manager 的 `AgentChatMessageList` 组件
- claude_manager 的 `AgentChatComposer` 组件
