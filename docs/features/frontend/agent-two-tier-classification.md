# Agent 页面二层分类功能实现

## 实现日期
2026-05-15

## 功能概述
在 `/agents` 页面实现了二层分类系统：
- **第一层**：按 `scope` 分类（All, Built-in, User, Project, Admin）
- **第二层**：按 `tags` 分类（动态显示当前 scope 下的所有标签）

## 修改的文件
- `/Users/kp/项目/Proj/cove/code/frontend/src/features/agent/components/AgentPage.tsx`

## 主要变更

### 1. 更新 Scope 类型定义
```typescript
// 旧: 'all' | 'user' | 'project' | 'builtin' | 'plugin'
// 新: 'all' | 'built-in' | 'user' | 'project' | 'admin'
```
- 移除了 `'plugin'`
- 将 `'builtin'` 改为 `'built-in'`（与后端一致）
- 添加了 `'admin'`

### 2. 添加 Tag 过滤状态
```typescript
const [selectedTag, setSelectedTag] = useState<string>('all');
```

### 3. 启用 Scope 过滤
移除了之前被注释掉的 scope 过滤逻辑，现在可以正常按 scope 过滤 agents。

### 4. 实现 Tag 过滤逻辑
- `availableTags`: 根据当前选中的 scope 动态计算可用的 tags
- `tagCounts`: 计算每个 tag 下的 agent 数量
- 过滤逻辑同时支持 scope + tag + 搜索的组合

### 5. 添加重置逻辑
当切换 scope 时，自动重置 tag 为 'all'，避免出现空结果。

### 6. UI 改进
- 第一层：5 个 scope 过滤卡片（网格布局）
- 第二层：动态显示的 tag 过滤卡片（flex wrap 布局）
- 只有当前 scope 下有 tags 时才显示第二层过滤
- 所有卡片都显示对应的 agent 数量

## 使用方式

1. **选择 Scope**：点击第一层的 scope 卡片（All, Built-in, User, Project, Admin）
2. **选择 Tag**：如果当前 scope 下有 tags，会显示第二层的 tag 过滤卡片
3. **搜索**：可以在过滤的基础上继续使用搜索框
4. **重置**：点击 "All" 或 "All Tags" 可以重置对应层级的过滤

## 数据结构依赖

### 后端 Agent 实体
```typescript
scope: 'built-in' | 'user' | 'project' | 'admin'
tags: readonly string[]
```

### 前端 Agent 类型
通过 tRPC 自动推断，包含 `scope` 和 `tags` 字段。

## 测试建议

1. **Scope 过滤测试**
   - 点击不同的 scope，验证列表正确过滤
   - 验证每个 scope 的计数正确

2. **Tag 过滤测试**
   - 选择不同的 scope，验证 tag 列表动态更新
   - 点击不同的 tag，验证过滤正确
   - 验证 tag 计数正确

3. **组合过滤测试**
   - Scope + Tag
   - Scope + Tag + 搜索
   - 验证所有过滤条件同时生效

4. **边界情况测试**
   - 没有 tags 的 scope（第二层不显示）
   - 空的 scope（显示空状态）
   - 搜索无结果

## 技术细节

- 使用 `useMemo` 优化性能，避免不必要的重新计算
- 使用 `Set` 去重 tags
- Tags 按字母顺序排序
- 响应式布局，适配不同屏幕尺寸
- 保持与现有 UI 风格一致（GlassCard 组件）
