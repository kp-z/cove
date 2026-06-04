# Backend ↔ Local 端到端测试指南

## 🎯 测试目标

验证 Agent Execution Metadata 从 Local Device 到 Backend 的完整流程：
1. 用户发送消息
2. Backend 路由到 Local Device
3. Local Device 处理并收集 execution metadata
4. Local Device 调用 `saveResponse` 传递 metadata
5. Backend 保存到文件系统
6. API 正确返回给前端

---

## 🧪 测试方法

### 方法 1: 通过前端测试（推荐）

#### 前提条件
- ✅ Backend 运行在 `localhost:3002`
- ✅ Local Device 运行
- ✅ Frontend 运行在 `localhost:5174`

#### 测试步骤

**Step 1: 登录前端**
1. 打开浏览器访问 `http://localhost:5174`
2. 登录为"路飞"用户
3. 进入"路飞" Channel

**Step 2: 发送测试消息**
```
发送内容: "测试 execution metadata"
```

**Step 3: 等待 Agent 回复**
- 预计等待时间: 10-15 秒
- 观察 Local Device 终端日志

**Step 4: 验证数据保存**

打开终端执行：
```bash
# 1. 查找最新的 Agent 消息文件
ls -lt ~/.cove/storage/messages/message-*.json | head -1

# 2. 查看文件内容
MESSAGE_FILE=$(ls -t ~/.cove/storage/messages/message-*.json | head -1)
cat $MESSAGE_FILE | jq '.'

# 3. 检查 agentExecutionMetadata
cat $MESSAGE_FILE | jq '.agentExecutionMetadata'
```

**Step 5: 验证 API 返回**

在浏览器开发者工具（F12）→ Network 标签中：
1. 找到 `message.list` 请求
2. 查看 Response
3. 检查 Agent 消息是否包含 `agent_execution_metadata`

---

### 方法 2: 使用浏览器控制台测试

在前端页面打开浏览器控制台（F12），执行：

```javascript
// 1. 发送消息
const response = await fetch('/trpc/message.send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    channelId: 'channel-1780421868303-m68trcq',
    senderId: 'user-luffy-1780480874605',
    senderType: 'human',
    content: '测试 execution metadata ' + new Date().toLocaleTimeString()
  })
});

console.log('消息已发送:', await response.json());

// 2. 等待 15 秒后，获取最新消息
setTimeout(async () => {
  const listResponse = await fetch('/trpc/message.list?batch=1&input=%7B%220%22%3A%7B%22channelId%22%3A%22channel-1780421868303-m68trcq%22%2C%22limit%22%3A5%7D%7D', {
    credentials: 'include'
  });
  
  const result = await listResponse.json();
  const messages = result[0]?.result?.data?.messages || [];
  const latestAgent = messages.reverse().find(m => m.sender_type === 'agent');
  
  console.log('最新的 Agent 消息:', latestAgent);
  console.log('Execution Metadata:', latestAgent?.agent_execution_metadata);
}, 15000);
```

---

## ✅ 验证清单

### 数据收集（Local Device）
检查 Local Device 是否收集了以下数据：
- [ ] `thinking` - Agent 思考内容
- [ ] `toolUse.logs` - 工具使用记录
- [ ] `usage` - Token 使用统计
- [ ] `performance` - 性能指标
- [ ] `adapter` - Adapter 信息

### 数据传输（Local → Backend）
检查 Local Device 日志是否显示：
- [ ] 调用 `message.saveResponse`
- [ ] 传递 `execution` 字段
- [ ] 收到成功响应

### 数据保存（Backend）
检查文件系统：
```bash
# 查看最新的消息文件
cat $(ls -t ~/.cove/storage/messages/message-*.json | head -1) | jq '.agentExecutionMetadata'
```

应该看到：
- [ ] `thinking` 字段存在且有内容
- [ ] `tool_logs` 数组存在（如果使用了工具）
- [ ] `usage` 对象存在
- [ ] `execution_mode` = "CLI"

### API 返回（Backend → Frontend）
检查 API 响应：
- [ ] `agent_execution_metadata` 字段存在
- [ ] 所有子字段正确映射
- [ ] 数据格式符合预期

---

## 🔍 问题排查

### 问题 1: Agent 没有回复
**可能原因**:
- Local Device 未运行
- WebSocket 连接断开
- MessageOrchestrator 未正常工作

**排查方法**:
```bash
# 检查 Local Device 进程
ps aux | grep -E "npm.*dev.*local|tsx.*local"

# 检查 Local Device 日志
# 查看终端输出，应该看到 "message.process" 消息
```

### 问题 2: 文件中没有 agentExecutionMetadata
**可能原因**:
- Local Device 没有传递 `execution` 字段
- Backend 没有正确转换数据

**排查方法**:
```bash
# 检查 Local Device 是否发送了 execution 数据
# 查看 Local Device 终端日志中的 "saveResponse" 调用

# 检查 Backend 日志
tail -f /tmp/backend*.log | grep saveResponse
```

### 问题 3: API 返回中没有 agent_execution_metadata
**可能原因**:
- MessageEntity.toJSON() 没有序列化该字段
- Repository 没有加载该字段

**排查方法**:
```bash
# 直接检查文件，确认数据存在
cat $(ls -t ~/.cove/storage/messages/message-*.json | head -1) | jq '.agentExecutionMetadata'

# 如果文件中有数据但 API 不返回，说明是序列化问题
```

---

## 📊 预期结果

### 成功的测试结果

**1. Local Device 日志应显示:**
```
[DeviceClient] Processing message.process
Message enqueued for processing
Truncated history from X to 20 messages
[saveResponse] Sending execution metadata...
✅ Response saved successfully
```

**2. 文件内容应包含:**
```json
{
  "content": "Agent 的回复内容",
  "agentExecutionMetadata": {
    "thinking": "Agent 的思考过程...",
    "tool_logs": [
      {
        "id": "tool-1",
        "toolName": "bash",
        "action": "Execute command",
        "status": "success",
        "duration": 567,
        ...
      }
    ],
    "usage": {
      "inputTokens": 100,
      "outputTokens": 200,
      "totalTokens": 300
    },
    "execution_mode": "CLI",
    "streaming_status": "completed"
  }
}
```

**3. API 返回应包含:**
```json
{
  "message_id": "message-xxx",
  "sender_type": "agent",
  "content": "Agent 的回复内容",
  "agent_execution_metadata": {
    "thinking": "Agent 的思考过程...",
    "tool_logs": [...],
    "usage": {...},
    "execution_mode": "CLI"
  }
}
```

---

## 🎯 测试用例

### 用例 1: 简单问答（无工具使用）
**输入**: "你好"
**预期**:
- ✓ thinking 存在
- ✗ tool_logs 为空或不存在
- ✓ usage 存在

### 用例 2: 需要工具的任务
**输入**: "列出当前目录的文件"
**预期**:
- ✓ thinking 存在
- ✓ tool_logs 包含至少一条记录（bash 命令）
- ✓ usage 存在

### 用例 3: 复杂任务
**输入**: "创建一个 hello.txt 文件并写入 Hello World"
**预期**:
- ✓ thinking 存在
- ✓ tool_logs 包含多条记录（创建文件、写入内容）
- ✓ usage 存在
- ✓ 每条 tool_log 包含详细信息（params, result, duration）

---

## 📋 测试环境

### 配置信息
```
Realm:   realm-nexus
User:    user-luffy-1780480874605 (路飞)
Channel: channel-1780421868303-m68trcq (路飞)
Agent:   agent-1780421851014-7jfijf2 (路飞)
```

### 服务端口
```
Backend:  http://localhost:3002
Frontend: http://localhost:5174
```

---

## ✅ 测试完成标准

测试通过需要满足：
1. ✅ Agent 正常回复消息
2. ✅ 文件中包含 `agentExecutionMetadata`
3. ✅ API 返回包含 `agent_execution_metadata`
4. ✅ 至少包含 2 个字段（thinking + usage 或 tool_logs）
5. ✅ 数据格式正确，可以被前端解析

---

**文档版本**: 1.0  
**创建日期**: 2026-06-04  
**状态**: ✅ 准备就绪

