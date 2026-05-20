# ChannelPanel 组件

Agent Channel 对话面板，完整对接 Phase 3 Infrastructure Layer 的 REST API 和 WebSocket。

## 📁 文件结构

```
frontend/src/features/agent-channel/
├── api/
│   ├── client.ts          # REST API 客户端（15个端点）
│   └── websocket.ts       # WebSocket 客户端（实时推送）
└── components/
    └── ChannelPanel/
        ├── index.tsx      # 主组件（整合所有子组件）
        ├── types.ts       # 类型定义
        ├── ChannelTabs.tsx    # Channel Tab + Thread Tabs
        ├── MessageList.tsx    # 消息列表
        ├── Composer.tsx       # 消息输入框
        └── README.md          # 本文档
```

## 🚀 功能特性

### 1. REST API 集成
- ✅ 发送消息（POST /api/channels/:channelId/messages）
- ✅ 获取消息列表（GET /api/channels/:channelId/messages）
- ✅ 获取频道详情（GET /api/channels/:channelId）
- ✅ 获取频道成员（GET /api/channels/:channelId/members）
- ✅ 获取频道 Agent Pool（GET /api/channels/:channelId/agents）
- ✅ 消息更新、删除、反应等（完整支持 15 个端点）

### 2. WebSocket 实时推送
- ✅ 自动连接和重连（最多 5 次，指数退避）
- ✅ 频道订阅/取消订阅
- ✅ 实时消息推送
- ✅ 心跳保活（30 秒间隔）
- ✅ 事件监听（支持频道、消息类型、全局监听）

### 3. UI 组件
- ✅ **ChannelTabs**: Channel Tab 固定 + Thread Tabs 可滚动
- ✅ **MessageList**: 用户/Agent/系统消息，日期分隔，消息分组
- ✅ **Composer**: 消息输入框，草稿保存，快捷键支持

### 4. 用户体验
- ✅ 自动滚动到底部
- ✅ 草稿保存（localStorage）
- ✅ 快捷键（Cmd+Enter 发送）
- ✅ 流式输出动画
- ✅ 加载状态和空状态

## 📦 使用方法

### 1. 基本使用

```tsx
import { ChannelPanel } from '@/features/agent-channel/components/ChannelPanel';

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        打开 Agent Channel
      </button>

      {isOpen && (
        <ChannelPanel
          channelId="channel-123"
          threadId={null}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
```

### 2. API 客户端使用

```tsx
import { apiClient } from '@/features/agent-channel/api/client';

// 发送消息
const message = await apiClient.sendMessage({
  channelId: 'channel-123',
  senderId: 'user-456',
  senderType: 'human',
  content: 'Hello, Agent!',
});

// 获取消息列表
const { messages, total } = await apiClient.getMessages('channel-123', {
  limit: 50,
  offset: 0,
});

// 获取频道详情
const channel = await apiClient.getChannel('channel-123');
```

### 3. WebSocket 客户端使用

```tsx
import { createWebSocketClient } from '@/features/agent-channel/api/websocket';

// 创建客户端
const wsClient = createWebSocketClient(
  'ws://localhost:3000/ws',
  'user-456',
  'human'
);

// 连接
await wsClient.connect();

// 订阅频道
wsClient.subscribe('channel-123');

// 监听消息
wsClient.on('channel-123', (message) => {
  console.log('New message:', message);
});

// 取消订阅
wsClient.unsubscribe('channel-123');

// 断开连接
wsClient.disconnect();
```

## 🔧 配置

### 环境变量

```env
# REST API 基础 URL
VITE_API_BASE_URL=http://localhost:3000/api

# WebSocket URL
VITE_WS_URL=ws://localhost:3000/ws
```

### API 客户端配置

```tsx
import { AgentChannelApiClient } from '@/features/agent-channel/api/client';

// 自定义 baseUrl
const apiClient = new AgentChannelApiClient('http://localhost:3000/api');
```

### WebSocket 客户端配置

```tsx
import { AgentChannelWebSocketClient } from '@/features/agent-channel/api/websocket';

// 自定义配置
const wsClient = new AgentChannelWebSocketClient(
  'ws://localhost:3000/ws',
  'user-456',
  'human'
);

// 修改重连配置（需要扩展类）
wsClient.maxReconnectAttempts = 10;
wsClient.reconnectDelay = 2000;
```

## 📊 数据流

```
用户输入
  ↓
Composer 组件
  ↓
handleSendMessage()
  ↓
apiClient.sendMessage()
  ↓
POST /api/channels/:channelId/messages
  ↓
Backend (AgentService)
  ↓
EventBus.publish('message.sent')
  ↓
WebSocketServer.broadcast()
  ↓
WebSocket 推送
  ↓
wsClient.on('channel-123')
  ↓
handleWebSocketMessage()
  ↓
setMessages([...prev, newMessage])
  ↓
MessageList 组件更新
```

## 🎨 样式定制

组件使用 Tailwind CSS，支持暗色模式：

```tsx
<ChannelPanel
  channelId="channel-123"
  threadId={null}
  onClose={() => {}}
  className="custom-class"
/>
```

## 🧪 测试

### 单元测试（TODO）

```bash
npm run test:unit
```

### 集成测试（TODO）

```bash
npm run test:integration
```

### E2E 测试（TODO）

```bash
npm run test:e2e
```

## 📝 TODO

### P0 - 核心功能
- [ ] 从用户上下文获取真实的 userId
- [ ] 从配置获取 API 和 WebSocket URL
- [ ] 实现 Thread 创建 API 对接
- [ ] 实现停止生成 API 对接
- [ ] 实现未读数量计算

### P1 - 用户体验
- [ ] @mention 自动完成
- [ ] 消息历史记录（上下箭头切换）
- [ ] 消息编辑和删除
- [ ] 消息反应（emoji）
- [ ] 图片和文件上传

### P2 - 优化
- [ ] 虚拟滚动（长消息列表）
- [ ] 消息搜索
- [ ] 消息引用
- [ ] Thread 重命名和置顶
- [ ] 性能优化（React.memo, useMemo）

## 🐛 已知问题

1. **用户信息硬编码**: 当前使用 `'current-user-id'` 作为占位符，需要从用户上下文获取
2. **WebSocket URL 硬编码**: 需要从配置文件读取
3. **Thread 管理未完成**: Thread 创建、重命名、置顶等功能需要对接后端 API
4. **错误处理不完善**: 需要添加全局错误处理和用户友好的错误提示

## 📚 参考资料

- [Phase 3 Infrastructure Layer](../../../backend/03-infrastructure/)
- [REST API 文档](../../../backend/03-infrastructure/api/controllers/)
- [WebSocket 文档](../../../backend/03-infrastructure/websocket/)
- [claude_manager UI 参考](../../../../claude_manager/frontend/src/app/components/shared/)

## 🤝 贡献

Phase 4 - Presentation Layer 由 @OA_DESIGNER 负责实现。

如有问题或建议，请联系：
- @OA_DESIGNER - 前端 UI/UX
- @OA_DEV - 后端 Infrastructure
- @Runtime_Engineer - Application Layer
- @entity_assistant - Domain Layer

---

**状态**: ✅ MVP 完成，待集成测试

**最后更新**: 2026-05-11
