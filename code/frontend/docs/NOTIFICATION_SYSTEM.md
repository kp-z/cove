# 通知系统架构说明

## 概述

Cove 前端使用**双通知系统**，各自负责不同类型的通知场景。

---

## 系统职责划分

### 1. Sonner Toast（操作反馈）

**用途**: 短暂的操作反馈提示

**使用场景**:
- ✅ 操作成功提示（保存成功、删除成功等）
- ❌ 操作失败提示（保存失败、网络错误等）
- ⚠️ 警告提示（权限不足、数据验证失败等）
- ℹ️ 信息提示（复制成功、刷新完成等）

**特点**:
- 自动消失（3-5秒）
- 不需要用户交互
- 位置固定（右上角）
- 轻量级，不打断用户操作

**使用方式**:
```typescript
import { toast } from 'sonner';

// 成功提示
toast.success('Channel pinned successfully');

// 错误提示
toast.error('Failed to save changes');

// 警告提示
toast.warning('You have unsaved changes');

// 信息提示
toast.info('Data refreshed');
```

**当前使用位置**:
- `src/features/settings/components/panels/AdaptersPanel.tsx`
- `src/features/channel/components/ChannelList/index.tsx`

---

### 2. NotificationStore（系统通知）

**用途**: 持久化的系统通知，需要用户查看和处理

**使用场景**:
- 📬 新消息通知（频道消息、私信等）
- 👥 协作通知（被@提及、任务分配等）
- 🔔 系统通知（系统维护、功能更新等）
- ⚡ 实时事件（Agent 完成任务、工作流执行结果等）

**特点**:
- 持久化存储（不会自动消失）
- 需要用户主动查看和关闭
- 显示在 TopBar 的通知气泡中
- 支持未读计数
- 可以点击跳转到相关内容

**使用方式**:
```typescript
import { notify } from '@/core/stores/notificationStore';

// 发送通知
notify({
  type: 'info',
  title: 'New Message',
  message: 'You have a new message from @alice',
  link: '/channels/general',
});

// 在组件中使用
import { useNotificationStore } from '@/core/stores/notificationStore';

function MyComponent() {
  const { notifications, unreadCount, markAsRead, removeNotification } = useNotificationStore();
  
  return (
    <div>
      <span>Unread: {unreadCount}</span>
      {notifications.map(notif => (
        <div key={notif.id}>
          {notif.title}
          <button onClick={() => markAsRead(notif.id)}>Mark as read</button>
        </div>
      ))}
    </div>
  );
}
```

**当前使用位置**:
- `src/shared/components/layout/TopBar/index.tsx` - 显示通知气泡
- `src/lib/trpc/hooks/channel.hooks.ts` - 频道操作通知
- `src/lib/trpc/hooks/agent.hooks.ts` - Agent 操作通知
- `src/lib/trpc/hooks/message.hooks.ts` - 消息操作通知
- `src/lib/trpc/hooks/user.hooks.ts` - 用户操作通知
- `src/lib/trpc/hooks/server.hooks.ts` - 服务器操作通知

---

## 选择指南

### 使用 Sonner Toast 的场景

```typescript
// ✅ 用户主动操作的即时反馈
toast.success('Settings saved');
toast.error('Failed to upload file');

// ✅ 不需要用户进一步操作
toast.info('Copied to clipboard');

// ✅ 短暂提示，不打断工作流
toast.warning('Connection unstable');
```

### 使用 NotificationStore 的场景

```typescript
// ✅ 需要用户查看的重要信息
notify({
  type: 'info',
  title: 'New Message',
  message: '@bob mentioned you in #general',
  link: '/channels/general',
});

// ✅ 异步事件完成通知
notify({
  type: 'success',
  title: 'Task Completed',
  message: 'Agent "DataAnalyzer" finished processing',
  link: '/agents/data-analyzer',
});

// ✅ 需要用户采取行动
notify({
  type: 'warning',
  title: 'Action Required',
  message: 'Your session will expire in 5 minutes',
});
```

---

## 最佳实践

### 1. 避免重复通知

```typescript
// ❌ 错误：同时使用两个系统
toast.success('Message sent');
notify({ type: 'success', title: 'Message sent', message: '...' });

// ✅ 正确：根据场景选择一个
toast.success('Message sent'); // 用户主动发送消息，即时反馈
```

### 2. 错误处理

```typescript
// ✅ 操作失败用 toast
try {
  await saveSettings();
  toast.success('Settings saved');
} catch (error) {
  toast.error('Failed to save settings');
}

// ✅ 系统级错误用 notify
if (serverError.code === 'MAINTENANCE') {
  notify({
    type: 'warning',
    title: 'System Maintenance',
    message: 'The system will be under maintenance in 10 minutes',
  });
}
```

### 3. 通知优先级

**高优先级（使用 NotificationStore）**:
- 安全相关（登录异常、权限变更）
- 协作相关（被@提及、任务分配）
- 系统级事件（维护通知、重要更新）

**低优先级（使用 Sonner Toast）**:
- 操作反馈（保存、删除、复制）
- 状态变化（连接状态、加载完成）
- 一般性提示（数据刷新、格式错误）

---

## 未来优化方向

### 短期（可选）
- 为 NotificationStore 添加分类过滤（消息、系统、协作）
- 添加通知声音和桌面通知支持
- 优化通知气泡的交互体验

### 长期（如果需要）
- 统一为一个通知系统，支持多种显示模式
- 添加通知偏好设置（用户可以选择哪些通知显示为 toast，哪些显示为持久通知）
- 集成 WebSocket 实时推送

---

## 相关文件

### Sonner Toast
- `src/App.tsx` - Toaster 组件配置
- 依赖: `sonner` npm 包

### NotificationStore
- `src/core/stores/notificationStore.ts` - Store 定义
- `src/core/stores/notificationStore.test.ts` - 单元测试
- `src/shared/components/ui/feedback/NotificationBubble.tsx` - 通知气泡组件
- `src/shared/components/layout/TopBar/index.tsx` - TopBar 集成

---

## 总结

| 特性 | Sonner Toast | NotificationStore |
|------|--------------|-------------------|
| 用途 | 操作反馈 | 系统通知 |
| 持久化 | ❌ 自动消失 | ✅ 持久化 |
| 用户交互 | ❌ 不需要 | ✅ 需要查看/关闭 |
| 显示位置 | 右上角浮层 | TopBar 通知气泡 |
| 使用场景 | 即时反馈 | 重要信息 |
| 优先级 | 低 | 高 |

**原则**: 如果不确定用哪个，问自己：**用户需要稍后查看这个通知吗？**
- 需要 → NotificationStore
- 不需要 → Sonner Toast
