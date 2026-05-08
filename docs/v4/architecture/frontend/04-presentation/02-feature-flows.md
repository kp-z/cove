# Feature Call Flows (功能调用流程)

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `调用流程`, `时序图`, `状态流转`, `错误处理`, `乐观更新`, `WebSocket推送`

**本文档包含**:
- 核心功能的完整调用流程
- 前端 → 后端 → Runtime 的调用链路
- 状态流转和数据同步机制
- 错误处理和回滚策略
- WebSocket 实时推送流程

**适用场景**:
- 需要了解某个功能的完整调用链路
- 设计新功能的调用流程
- 排查功能调用问题
- 理解前后端协作机制

**相关文档**:
- [API Integration](./01-api-integration.md) - API 集成详细设计
- [Backend API](../../backend/03-infrastructure/04-backend-api.md) - 后端 API 设计
- [Presentation Layer](./frontend-layer.md) - 前端架构设计

---

## 1. 发送消息流程

### 1.1 流程图

```
┌─────────────┐
│   用户输入   │
│  消息内容    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: MessageToolbar                                │
│ - 用户点击发送按钮                                        │
│ - 调用 sendMessage()                                     │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: useMessage Hook                               │
│ - 乐观更新：立即在 UI 显示消息（status: 'sending'）        │
│ - 调用 API: POST /channels/:channelId/messages          │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: MessageService.sendMessage()                   │
│ 1. 验证用户权限                                           │
│ 2. 解析 @mentions                                        │
│ 3. 保存到 PostgreSQL                                     │
│ 4. 写入 Dual-Write Queue                                │
│ 5. 返回消息对象（包含 message_id）                        │
└──────┬──────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 ▼
┌─────────────────────────┐              ┌──────────────────────────┐
│ WebSocket 推送           │              │ Dual-Write Worker        │
│ - 推送给频道所有成员      │              │ - 同步到 OpenClaw        │
│ - 推送给被 @mention 的人 │              │ - 更新 Agent 消息队列    │
└──────┬──────────────────┘              └──────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: WebSocket Handler                             │
│ - 接收 new_message 事件                                  │
│ - 更新 React Query 缓存                                  │
│ - 移除乐观更新的临时消息                                   │
│ - 显示真实消息（status: 'sent'）                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 代码实现

```typescript
// 1. 用户点击发送
<MessageToolbar onSend={(content) => sendMessage({ content })} />

// 2. Hook 处理（乐观更新）
const sendMessage = useMutation({
  mutationFn: (input) => apiClient.post(`/channels/${channelId}/messages`, input),
  onMutate: async (newMessage) => {
    // 乐观更新
    queryClient.setQueryData(['messages', channelId], (old) => ({
      ...old,
      pages: [{
        messages: [{
          id: `temp-${Date.now()}`,
          ...newMessage,
          status: 'sending',
        }, ...old.pages[0].messages],
      }, ...old.pages.slice(1)],
    }));
  },
  onSuccess: () => {
    // WebSocket 会推送真实消息，这里只需 invalidate
    queryClient.invalidateQueries(['messages', channelId]);
  },
  onError: (err, newMessage, context) => {
    // 回滚
    queryClient.setQueryData(['messages', channelId], context.previousMessages);
    alert('发送失败');
  },
});

// 3. WebSocket 接收
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'new_message') {
    queryClient.setQueryData(['messages', data.channel_id], (old) => {
      // 移除临时消息，添加真实消息
      const filtered = old.pages[0].messages.filter(m => !m.id.startsWith('temp-'));
      return {
        ...old,
        pages: [{
          messages: [data, ...filtered],
        }, ...old.pages.slice(1)],
      };
    });
  }
};
```

---

## 2. 认领任务流程

### 2.1 流程图

```
┌─────────────┐
│   用户点击   │
│  认领按钮    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: TaskCard                                      │
│ - 调用 claimTask(taskId)                                │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: useTask Hook                                  │
│ - 乐观更新：立即更新 UI（assignee_id = current_user）     │
│ - 调用 API: POST /tasks/:taskId/claim                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: TaskService.claimTask()                        │
│ 1. 检查任务是否已被认领（乐观锁）                          │
│ 2. 检查依赖任务是否完成                                    │
│ 3. 更新任务状态（assignee_id, status = 'in_progress'）   │
│ 4. 返回更新后的任务对象                                    │
└──────┬──────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 ▼
┌─────────────────────────┐              ┌──────────────────────────┐
│ 成功：返回 200           │              │ 冲突：返回 409            │
│ - 任务已认领             │              │ - 任务已被其他人认领      │
└──────┬──────────────────┘              └──────┬───────────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────────────────┐              ┌──────────────────────────┐
│ WebSocket 推送           │              │ Frontend: onError        │
│ - 推送 task_updated      │              │ - 回滚乐观更新            │
│ - 通知频道所有成员        │              │ - 显示冲突提示            │
└──────┬──────────────────┘              └──────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: WebSocket Handler                             │
│ - 接收 task_updated 事件                                 │
│ - 更新 React Query 缓存                                  │
│ - 确认乐观更新成功                                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 代码实现

```typescript
// 1. 用户点击认领
<TaskCard task={task} onClaim={() => claimTask(task.id)} />

// 2. Hook 处理（乐观更新 + 冲突处理）
const claimTask = useMutation({
  mutationFn: (taskId) => apiClient.post(`/tasks/${taskId}/claim`),
  onMutate: async (taskId) => {
    await queryClient.cancelQueries(['tasks', channelId]);
    const previousTasks = queryClient.getQueryData(['tasks', channelId]);

    // 乐观更新
    queryClient.setQueryData(['tasks', channelId], (old) =>
      old.map((task) =>
        task.id === taskId
          ? { ...task, assignee_id: currentUserId, status: 'in_progress' }
          : task
      )
    );

    return { previousTasks };
  },
  onError: (err, taskId, context) => {
    // 回滚
    queryClient.setQueryData(['tasks', channelId], context.previousTasks);

    // 处理冲突
    if (err.response?.status === 409) {
      alert('任务已被其他人认领');
    } else {
      alert('认领失败');
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks', channelId]);
  },
});

// 3. WebSocket 接收
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'task_updated') {
    queryClient.setQueryData(['tasks', data.channel_id], (old) =>
      old.map((task) => (task.id === data.id ? data : task))
    );
  }
};
```

---

## 3. Agent 状态导出流程

### 3.1 流程图

```
┌─────────────┐
│   用户点击   │
│  导出按钮    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: AgentPanel                                    │
│ - 调用 exportState(agentId)                             │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: useAgent Hook                                 │
│ - 显示加载状态                                            │
│ - 调用 API: POST /agents/:agentId/export-state          │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: AgentRuntimeService.exportAgentState()         │
│ 1. 检查 Agent 是否正在运行                                │
│ 2. 如果运行中，暂停 Agent（force=true）                   │
│ 3. 从 OpenClaw Gateway 导出运行时状态                     │
│ 4. 从 PostgreSQL 读取持久化数据                          │
│ 5. 组装 AgentStateExport 对象                           │
│ 6. 保存导出记录到数据库                                   │
│ 7. 恢复 Agent 运行状态                                    │
│ 8. 返回导出对象                                           │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: onSuccess                                     │
│ - 创建 JSON Blob                                         │
│ - 触发浏览器下载                                          │
│ - 文件名: agent-{id}-state-{timestamp}.json             │
└─────────────────────────────────────────────────────────┘
```

### 3.2 代码实现

```typescript
// 1. 用户点击导出
<Button onClick={() => exportState()}>导出 Agent 状态</Button>

// 2. Hook 处理
const exportState = useMutation({
  mutationFn: () => apiClient.post(`/agents/${agentId}/export-state`),
  onSuccess: (data) => {
    // 下载 JSON 文件
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${agentId}-state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  onError: (err) => {
    alert('导出失败: ' + err.message);
  },
});

// 3. 显示加载状态
{isExporting && <Spinner>正在导出 Agent 状态...</Spinner>}
```

---

## 4. Agent 状态导入流程

### 4.1 流程图

```
┌─────────────┐
│   用户选择   │
│  JSON 文件   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: ImportStateDialog                             │
│ 1. 读取文件内容                                           │
│ 2. 解析 JSON                                             │
│ 3. 显示预览（framework, agent_name, exported_at）        │
│ 4. 用户确认导入                                           │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: useAgent Hook                                 │
│ - 调用 API: POST /agents/:agentId/import-state          │
│ - 传递 AgentState 对象                                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: AgentRuntimeService.importAgentState()         │
│ 1. 验证导出记录是否存在                                    │
│ 2. 检查 framework 是否匹配                                │
│ 3. 停止目标 Agent（如果正在运行）                          │
│ 4. 通过 AgentDaemon Adapter 导入运行时状态                │
│ 5. 恢复 memory、skills、config                           │
│ 6. 重启 Agent                                            │
│ 7. 记录导入操作                                           │
│ 8. 返回成功                                               │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: onSuccess                                     │
│ - 刷新 Agent 详情                                         │
│ - 刷新 Agent 状态                                         │
│ - 显示成功提示                                            │
└─────────────────────────────────────────────────────────┘
```

### 4.2 代码实现

```typescript
// 1. 文件选择和预览
function ImportStateDialog({ agentId, onClose }) {
  const [stateData, setStateData] = useState(null);
  const { importState, isImporting } = useAgent(agentId);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      setStateData(data);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    importState(stateData);
  };

  return (
    <Dialog>
      <input type="file" accept=".json" onChange={handleFileSelect} />
      
      {stateData && (
        <div>
          <h3>导入预览</h3>
          <p>Framework: {stateData.framework}</p>
          <p>Agent: {stateData.metadata.agent_name}</p>
          <p>导出时间: {stateData.exported_at}</p>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? '导入中...' : '确认导入'}
          </Button>
        </div>
      )}
    </Dialog>
  );
}

// 2. Hook 处理
const importState = useMutation({
  mutationFn: (state) => apiClient.post(`/agents/${agentId}/import-state`, state),
  onSuccess: () => {
    queryClient.invalidateQueries(['agent', agentId]);
    queryClient.invalidateQueries(['agent', agentId, 'status']);
    alert('导入成功');
    onClose();
  },
  onError: (err) => {
    alert('导入失败: ' + err.message);
  },
});
```

---

## 5. 离线消息队列与双写基础设施对接

### 5.1 流程图

```
┌─────────────┐
│  用户离线时  │
│  发送消息    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: OfflineMessageQueue                           │
│ 1. 检测到网络离线                                         │
│ 2. 将消息加入离线队列（IndexedDB）                        │
│ 3. 显示"离线"标识                                         │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  网络恢复    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: OfflineMessageQueue.flush()                   │
│ 1. 检测到网络恢复                                         │
│ 2. 从 IndexedDB 读取离线队列                             │
│ 3. 按顺序发送消息                                         │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend: MessageService.sendMessage()                   │
│ 1. 接收离线消息                                           │
│ 2. 检查消息是否已存在（去重）                              │
│ 3. 保存到 PostgreSQL                                     │
│ 4. 写入 Dual-Write Queue                                │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Dual-Write Worker                                       │
│ 1. 从 Queue 读取消息                                      │
│ 2. 同步到 OpenClaw                                       │
│ 3. 如果失败，重试（指数退避）                              │
│ 4. 如果超过最大重试次数，移到死信队列                       │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend: 接收 WebSocket 推送                            │
│ - 确认消息已同步                                          │
│ - 从离线队列移除                                          │
│ - 更新 UI 状态                                            │
└─────────────────────────────────────────────────────────┘
```

### 5.2 代码实现

```typescript
// 1. 离线队列管理
class OfflineMessageQueue {
  private db: IDBDatabase;
  private isOnline = navigator.onLine;

  constructor() {
    this.initDB();
    this.listenNetworkStatus();
  }

  private async initDB() {
    this.db = await openDB('offline-queue', 1, {
      upgrade(db) {
        db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
      },
    });
  }

  private listenNetworkStatus() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flush();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async enqueue(message: any) {
    if (this.isOnline) {
      // 在线，直接发送
      return this.send(message);
    } else {
      // 离线，加入队列
      await this.db.add('messages', {
        ...message,
        timestamp: Date.now(),
        status: 'queued',
      });
    }
  }

  async flush() {
    const messages = await this.db.getAll('messages');
    
    for (const message of messages) {
      try {
        await this.send(message);
        await this.db.delete('messages', message.id);
      } catch (err) {
        console.error('Failed to send offline message:', err);
        // 保留在队列中，下次重试
      }
    }
  }

  private async send(message: any) {
    return apiClient.post(`/channels/${message.channel_id}/messages`, message);
  }
}

// 2. 使用离线队列
const offlineQueue = new OfflineMessageQueue();

const sendMessage = async (content: string) => {
  await offlineQueue.enqueue({
    channel_id: channelId,
    content,
    sender_id: currentUserId,
  });
};
```

---

## 6. 总结

### 6.1 关键设计模式

1. **乐观更新 + 回滚**：提升用户体验，同时保证数据一致性
2. **WebSocket 推送**：实时同步数据变化
3. **冲突检测**：处理并发操作冲突
4. **离线队列**：支持离线操作
5. **双写基础设施**：保证 PostgreSQL 和 OpenClaw 数据一致性

### 6.2 错误处理策略

- **网络错误**：重试 + 离线队列
- **认证错误**：跳转登录页
- **权限错误**：显示提示
- **冲突错误**：回滚 + 提示用户
- **服务器错误**：重试 + 降级处理

### 6.3 下一步

- 阅读 [State Export/Import UI](./03-state-export-import-ui.md) 了解 UI 设计
- 阅读 [飞书集成](./04-feishu-integration-ui.md) 了解飞书集成方案

小张人呢？
