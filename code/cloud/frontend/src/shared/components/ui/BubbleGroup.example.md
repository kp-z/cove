# BubbleGroup 组件使用示例

## 基础用法

```tsx
import { BubbleGroup } from '@/shared/components/ui/BubbleGroup';

function MyComponent() {
  const items = [
    { id: '1', label: 'Active', state: 'active' as const, progress: 75 },
    { id: '2', label: 'Available', state: 'available' as const },
    { id: '3', label: 'Disabled', state: 'disabled' as const },
  ];

  return (
    <BubbleGroup
      items={items}
      variant="compact"
      onItemClick={(id) => console.log('Clicked:', id)}
    />
  );
}
```

## 带自定义 Tooltip

```tsx
import { BubbleGroup } from '@/shared/components/ui/BubbleGroup';

function MyComponent() {
  const items = [
    {
      id: '1',
      label: 'Item 1',
      state: 'active' as const,
      progress: 85,
      tooltip: (
        <div className="bg-black/95 rounded-lg px-3 py-2 text-[10px] text-white shadow-lg border border-white/10">
          <div className="font-bold mb-1">Item 1</div>
          <div className="text-gray-300">85% complete</div>
        </div>
      ),
    },
    {
      id: '2',
      label: 'Item 2',
      state: 'available' as const,
      tooltip: (
        <div className="bg-black/95 rounded-lg px-3 py-2 text-[10px] text-white shadow-lg border border-white/10">
          <div className="font-bold">Item 2</div>
          <div className="text-green-400 text-[8px]">Click to activate</div>
        </div>
      ),
    },
  ];

  return <BubbleGroup items={items} variant="comfortable" />;
}
```

## Comfortable 变体（更大的气泡）

```tsx
<BubbleGroup
  items={items}
  variant="comfortable"
  onItemClick={(id) => handleClick(id)}
/>
```

## 状态说明

- **active**: 蓝色发光，表示当前激活状态
- **available**: 绿色发光，可点击切换
- **disabled**: 灰色，不可交互

## 进度指示器

当提供 `progress` 属性（0-100）时，气泡内会显示水位动画：
- 绿色：剩余 50-100%
- 黄色：剩余 10-50%
- 红色：剩余 0-10%

## 响应式设计

组件自动适配移动端和桌面端：
- 移动端：较小的气泡，active 交互
- 桌面端：较大的气泡，hover 交互

## Props

```typescript
interface BubbleItem {
  id: string;              // 唯一标识
  label: string;           // 显示文本
  state: 'active' | 'available' | 'disabled';  // 状态
  progress?: number;       // 可选进度 (0-100)
  tooltip?: ReactNode;     // 自定义 tooltip
}

interface BubbleGroupProps {
  items: BubbleItem[];                    // 气泡列表
  variant?: 'compact' | 'comfortable';    // 变体（默认 compact）
  onItemClick?: (id: string) => void;     // 点击回调
  className?: string;                     // 自定义类名
}
```

## 最大气泡数量

- **compact**: 最多 8 个气泡
- **comfortable**: 最多 16 个气泡

超出数量的气泡会被自动截断。
