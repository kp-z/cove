# Mock 模式使用指南

## 概述

为了支持前端独立开发，我们提供了 Mock 版本的 API Client 和 WebSocket Client。

Mock 版本提供与真实版本**完全相同的接口**，但使用内存中的 Mock 数据，无需后端服务器。

## 文件说明

- `client.ts` - 真实的 API Client（连接后端 REST API）
- `client.mock.ts` - Mock 版本的 API Client（使用内存数据）
- `websocket.ts` - 真实的 WebSocket Client（连接后端 WebSocket）
- `websocket.mock.ts` - Mock 版本的 WebSocket Client（模拟推送）

## 使用方法

### 方式 1: 修改导入路径（推荐）

在 `ChannelPanel/index.tsx` 中，修改导入语句：

```tsx
// 开发模式：使用 Mock
import { apiClient } from '../../api/client.mock';
import { AgentChannelWebSocketClient } from '../../api/websocket.mock';

// 生产模式：使用真实 API
// import { apiClient } from '../../api/client';
// import { AgentChannelWebSocketClient } from '../../api/websocket';
```

### 方式 2: 使用环境变量

创建一个统一的导出文件 `api/index.ts`：

```tsx
// api/index.ts
const isDevelopment = import.meta.env.MODE === 'development';
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

if (isDevelopment && useMock) {
  // Mock 模式
  export { apiClient } from './client.mock';
  export { AgentChannelWebSocketClient } from './websocket.mock';
} else {
  // 真实 API
  export { apiClient } from './client';
  export { AgentChannelWebSocketClient } from './websocket';
}
```

然后在 `.env.development` 中设置：

```bash
VITE_USE_MOCK=true
```

在组件中统一导入：

```tsx
import { apiClient, AgentChannelWebSocketClient } from '../../api';
```

## Mock 数据说明

### API Client Mock

`client.mock.ts` 提供以下 Mock 数据：

- **3 条初始消息**：包含用户消息、Agent 响应、系统消息
- **1 个频道**：General 频道，包含 2 个成员（1 个用户 + 1 个 Agent）
- **1 个 Agent**：CodeAssistant，状态为 idle

### WebSocket Client Mock

`websocket.mock.ts` 提供以下功能：

- 模拟连接/断开
- 模拟订阅/取消订阅
- 支持事件监听
- **不会自动推送消息**（避免干扰开发）
- 可以手动触发消息推送（用于测试）

## 功能对比

| 功能 | 真实版本 | Mock 版本 |
|------|---------|----------|
| 发送消息 | ✅ 调用后端 API | ✅ 保存到内存 + 模拟 Agent 响应 |
| 获取消息 | ✅ 从后端获取 | ✅ 从内存获取 |
| WebSocket 推送 | ✅ 实时推送 | ✅ 模拟推送（手动触发） |
| 网络延迟 | ✅ 真实延迟 | ✅ 模拟 300ms 延迟 |
| 数据持久化 | ✅ 数据库 | ❌ 刷新页面后丢失 |

## 开发流程

### 1. 前端独立开发（使用 Mock）

```bash
# 1. 设置环境变量
echo "VITE_USE_MOCK=true" > .env.development

# 2. 启动前端开发服务器
npm run dev

# 3. 访问 ChannelPanel 组件
# 所有 API 调用都会使用 Mock 数据
```

### 2. 集成测试（使用真实 API）

```bash
# 1. 启动后端服务器
cd backend
npm run dev

# 2. 设置环境变量
echo "VITE_USE_MOCK=false" > .env.development

# 3. 启动前端开发服务器
npm run dev

# 4. 访问 ChannelPanel 组件
# 所有 API 调用都会连接到后端
```

## 注意事项

1. **Mock 数据不持久化**：刷新页面后，所有 Mock 数据会重置
2. **WebSocket 不自动推送**：Mock WebSocket 不会自动推送消息，避免干扰开发
3. **Agent 响应延迟**：Mock Agent 响应有 1 秒延迟，模拟真实场景
4. **接口完全一致**：Mock 版本与真实版本接口完全相同，切换无需修改代码

## 示例代码

### 使用 Mock API Client

```tsx
import { apiClient } from '@/features/channel/api/client.mock';

// 发送消息
const message = await apiClient.sendMessage({
  channelId: 'channel-1',
  senderId: 'user-1',
  senderType: 'human',
  content: 'Hello, world!',
});

// 获取消息列表
const { messages } = await apiClient.getMessages('channel-1', {
  limit: 100,
});
```

### 使用 Mock WebSocket Client

```tsx
import { AgentChannelWebSocketClient } from '@/features/channel/api/websocket.mock';

const client = new AgentChannelWebSocketClient('ws://localhost:3000/ws', 'user-1', 'human');

await client.connect();
client.subscribe('channel-1');
client.on('channel-1', (message) => {
  console.log('Received:', message);
});
```

## 切换到生产模式

当后端 API 准备好后，只需修改导入路径或环境变量：

```tsx
// 方式 1: 修改导入
import { apiClient } from '../../api/client';
import { AgentChannelWebSocketClient } from '../../api/websocket';

// 方式 2: 修改环境变量
VITE_USE_MOCK=false
```

组件代码无需任何修改，因为接口完全一致。
