# System Timeline 验证清单

## 修复验证

### ✅ 第一步：确认构建成功
```bash
npm run build
# 应该看到: ✓ built in X.XXs
```
状态：✅ 已通过

### 🔄 第二步：刷新浏览器
1. 打开浏览器（localhost:5174）
2. 硬刷新页面（Cmd+Shift+R 或 Ctrl+Shift+R）
3. 检查控制台是否还有 "Maximum update depth exceeded" 错误

**预期结果**：无错误，应用正常加载

### 🔄 第三步：进入 Channel 页面
1. 点击任意 Channel
2. 观察页面是否正常加载
3. 检查是否有无限循环现象（风扇狂转、CPU 100%）

**预期结果**：页面正常，无性能问题

### 🔄 第四步：查看 Timeline
1. 找到右侧的 Timeline 面板
2. 点击顶部的 System 筛选器（AlertCircle 图标）
3. 观察是否显示系统事件

**预期结果**：
- 显示系统事件（蓝色/黄色/红色标签）
- 事件按时间倒序排列
- 可以点击展开查看详情

### 🔄 第五步：发送消息测试
1. 在 Composer 输入框输入消息
2. 发送消息
3. 切换到 Timeline 的 System 视图
4. 查看是否有以下系统事件：
   - `message.created_local` (创建本地消息)
   - `message.queued` (消息排队)
   - `websocket.message_received` (接收 WebSocket 事件)
   - `message.sent` (发送成功)
   - `state.subscribers_notified` (通知订阅者)

**预期结果**：能看到完整的消息生命周期事件

### 🔄 第六步：展开事件详情
1. 点击任意系统事件卡片
2. 查看是否显示 Metadata
3. 如果是错误事件，查看是否有 Stack Trace

**预期结果**：
- Metadata 以 JSON 格式展示
- 包含相关的事件数据（messageId, timestamp 等）

### 🔄 第七步：性能检查
1. 打开 Chrome DevTools
2. 切换到 Performance 标签
3. 录制 5 秒性能数据
4. 检查是否有异常的重复渲染

**预期结果**：
- 无异常的渲染循环
- CPU 使用率正常
- 内存稳定

## 常见问题排查

### Q1: 仍然看到无限循环错误
**排查步骤**：
1. 确认代码已更新：`git diff src/features/channel/components/Timeline/hooks/useTimelineNodes.ts`
2. 清除浏览器缓存：硬刷新（Cmd+Shift+R）
3. 重启开发服务器：`npm run dev`
4. 检查是否有其他 console.log 导致的循环

### Q2: Timeline 中看不到系统事件
**排查步骤**：
1. 确认在开发环境：`console.log(process.env.NODE_ENV)` 应该是 'development'
2. 检查 System 筛选器是否已启用（图标应该高亮）
3. 确认有触发相关操作（发送消息、WebSocket 连接等）
4. 打开浏览器控制台，应该能看到 `[message.xxx]` 格式的日志

### Q3: 系统事件显示但无法展开
**排查步骤**：
1. 检查事件是否有 metadata：某些事件可能没有附加数据
2. 检查 SystemNode 组件是否正确导入
3. 查看控制台是否有渲染错误

### Q4: 性能问题（卡顿、延迟）
**排查步骤**：
1. 检查系统事件数量：每个 channel 最多 100 条
2. 清理旧事件：`useSystemEventStore.getState().clearEvents(channelId)`
3. 临时禁用系统日志：`useSystemEventStore.getState().setEnabled(false)`

## 手动测试脚本

在浏览器控制台运行以下命令测试：

```javascript
// 1. 检查 store 是否正常
const store = window.__ZUSTAND_DEVTOOLS_STORE__;
console.log('Zustand stores:', store);

// 2. 获取系统事件
const { useSystemEventStore } = await import('/src/features/channel/stores/systemEventStore.ts');
const events = useSystemEventStore.getState().events;
console.log('System events:', events);

// 3. 手动添加测试事件
const { systemLog } = await import('/src/features/channel/stores/systemEventStore.ts');
systemLog.info('test-channel', 'message.sent', 'Test event', { test: true });

// 4. 检查事件是否添加成功
const testEvents = useSystemEventStore.getState().getEvents('test-channel');
console.log('Test events:', testEvents);

// 5. 清理测试事件
useSystemEventStore.getState().clearEvents('test-channel');
```

## 自动化测试（未来）

```typescript
// tests/system-timeline.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSystemEventStore } from '@/features/channel/stores/systemEventStore';

describe('SystemEventStore', () => {
  it('should not cause infinite loop', () => {
    const { result } = renderHook(() => {
      const eventsMap = useSystemEventStore((state) => state.events);
      return eventsMap.get('test-channel') || [];
    });
    
    expect(result.current).toEqual([]);
  });
  
  it('should add events correctly', () => {
    const { logEvent, getEvents } = useSystemEventStore.getState();
    
    logEvent('test-channel', 'message.sent', 'Test message');
    
    const events = getEvents('test-channel');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message.sent');
  });
});
```

## 成功标准

所有以下条件都满足才算验证通过：

- [ ] 无 "Maximum update depth exceeded" 错误
- [ ] Channel 页面正常加载
- [ ] Timeline 面板正常显示
- [ ] System 筛选器工作正常
- [ ] 能看到系统事件（发送消息后）
- [ ] 事件详情可以展开
- [ ] 性能正常（无卡顿）
- [ ] 控制台有对应的日志输出

## 下一步

验证通过后：
1. 提交代码：`git add . && git commit -m "fix: 修复 System Timeline 无限循环问题"`
2. 更新文档：确保所有文档都是最新的
3. 测试其他场景：WebSocket 断连、错误事件等
4. 考虑添加单元测试和 E2E 测试
