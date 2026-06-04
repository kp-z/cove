# System Timeline Bug Fixes

## 问题描述

启动应用时遇到 React 无限循环错误：
```
Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

## 根本原因

在 `useTimelineNodes` hook 中，直接使用 Zustand selector 获取系统事件：

```typescript
// ❌ 问题代码
const systemEvents = useSystemEventStore((state) => state.getEvents(channelId));
```

`getEvents` 方法每次调用都返回一个新的数组引用：
```typescript
getEvents: (channelId) => {
  return get().events.get(channelId) || [];  // 每次返回新数组
}
```

这导致：
1. `systemEvents` 引用每次都不同
2. `useMemo` 的依赖数组检测到变化
3. 触发 Timeline 重新渲染
4. Timeline 重新渲染又触发 `useTimelineNodes`
5. 形成无限循环

## 解决方案

### 方案 1: 使用 useMemo 缓存（已采用）

直接订阅 `events` Map，然后在 `useMemo` 中提取：

```typescript
// ✅ 修复后的代码
const systemEventsMap = useSystemEventStore((state) => state.events);
const systemEvents = useMemo(() => {
  return systemEventsMap.get(channelId) || [];
}, [systemEventsMap, channelId]);
```

**优点**：
- 只在 Map 引用变化时重新计算
- Map 引用只在有新事件时才变化
- 避免了不必要的重新渲染

### 方案 2: 自定义相等性比较（备选）

使用 Zustand 的自定义比较函数：

```typescript
const systemEvents = useSystemEventStore(
  (state) => state.events.get(channelId) || [],
  (a, b) => a.length === b.length && a.every((item, index) => item.id === b[index]?.id)
);
```

**缺点**：
- 每次都要遍历数组进行深比较
- 性能开销较大

### 方案 3: 使用 Zustand shallow（未采用）

```typescript
import { shallow } from 'zustand/shallow';

const systemEvents = useSystemEventStore(
  (state) => state.events.get(channelId) || [],
  shallow
);
```

**缺点**：
- `shallow` 只做浅比较，对数组无效
- 仍然会有相同的问题

## 修改的文件

```
src/features/channel/components/Timeline/hooks/useTimelineNodes.ts
```

## 验证步骤

1. 启动开发服务器
2. 打开任意 Channel 页面
3. 切换到 Timeline 面板
4. 不应该出现无限循环错误
5. Timeline 应该正常显示消息和系统事件

## 其他优化

在 `systemEventStore.ts` 中为 Zustand actions 添加了 action names：

```typescript
set({ events: newEvents }, false, 'logEvent');
set({ events: newEvents }, false, 'clearEvents');
set({ events: new Map() }, false, 'clearAllEvents');
set({ enabled }, false, 'setEnabled');
```

这样在 Redux DevTools 中可以更清晰地追踪状态变化。

## 防止类似问题

**最佳实践**：

1. **避免在 selector 中创建新对象/数组**
   ```typescript
   // ❌ 错误
   const data = useStore((state) => state.items.map(x => x.id));
   
   // ✅ 正确
   const items = useStore((state) => state.items);
   const ids = useMemo(() => items.map(x => x.id), [items]);
   ```

2. **使用 useMemo 缓存派生数据**
   ```typescript
   const rawData = useStore((state) => state.rawData);
   const processedData = useMemo(() => process(rawData), [rawData]);
   ```

3. **订阅最小化的状态切片**
   ```typescript
   // ❌ 订阅整个 store
   const store = useStore();
   const value = store.data[channelId];
   
   // ✅ 只订阅需要的部分
   const data = useStore((state) => state.data);
   const value = useMemo(() => data[channelId], [data, channelId]);
   ```

## 性能考虑

修复后的实现：
- 只在有新系统事件时才重新渲染
- Map 引用稳定，减少不必要的计算
- `useMemo` 缓存系统事件数组
- 整体性能良好

## 测试建议

1. **压力测试**：快速发送多条消息，观察 Timeline 是否稳定
2. **内存检查**：使用 Chrome DevTools Memory Profiler 检查是否有内存泄漏
3. **性能分析**：使用 React DevTools Profiler 检查渲染次数

## 相关 Issue

- Zustand issues: https://github.com/pmndrs/zustand/issues?q=infinite+loop
- React issues: https://github.com/facebook/react/issues?q=Maximum+update+depth

## 总结

通过使用 `useMemo` 缓存从 Map 中提取的数据，成功解决了无限循环问题。这是处理 Zustand store 中复杂数据结构（如 Map、Set）的推荐模式。
