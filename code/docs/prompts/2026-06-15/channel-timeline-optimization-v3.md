# Channel 时间轴优化

## 任务

优化时间轴调试工具：
1. UI：展开内容从卡片下方移到卡片内部，去除黑色背景
2. 信息：补充 Agent 执行、性能指标、关联信息、编辑历史

## 探索范围

**主要文件**：
- `cloud/frontend/src/features/channel/components/Timeline/CompactTimelineNode.tsx` (重点 111-217 行)
- `cloud/frontend/src/features/channel/hooks/useTimelineNodes.ts`
- `cloud/backend/src/domain/models/message/message.types.ts` (参考数据结构)

**理解现状**：
- 找到展开内容的代码位置 (关键词：`isExpanded`, `bg-black/30`)
- 分析 DOM 结构：为什么在下方？兄弟元素还是子元素？
- 检查数据流：`MessageEntityJSON` 包含哪些字段？是否完整传递？

## UI 重构

**问题**：展开内容是主卡片的兄弟元素 + `ml-9 mt-2 bg-black/30`

**目标**：展开内容在卡片内部，使用 `border-t border-white/10` 分隔

**结构调整**：
```
当前：外层 div > [主行卡片] + [展开内容(兄弟)]
目标：外层 div > [卡片容器 > [主行] + [展开内容(子元素)]]
```

**要求**：
- 去除 `ml-9 mt-2` 和 `bg-black/30`
- 卡片容器添加 `overflow-hidden`
- 展开内容使用 `border-t border-white/10` 分隔
- 添加展开动画 (`transition-all duration-200`)

## 信息架构

**6 大信息维度**（根据消息类型条件显示）：

**📊 基础信息** (所有消息)
- ID、状态、类型、时间、是否编辑
- 数据：`message_id`, `status`, `content_type`, `created_at`, `is_edited`

**🤖 Agent 执行** (仅 Agent 消息)
- 执行模式、状态、时长、thinking (可展开)、工具调用列表
- 数据：`agent_execution_metadata` (可能不存在，需要空值检查)
- 工具图标：✓ success | ✗ error | ⟳ running | ⏸ pending

**⚡ 性能指标** (仅 Agent 消息)
- 模型、tokens、缓存、延迟、成本
- 数据：`agent_execution_metadata.usage`
- 格式化：tokens 千位分隔符、百分比 1 位小数、成本 4 位小数

**🔗 关联信息** (有数据时显示)
- Mentions、references、线程、反应
- 数据：`mentions`, `references`, `thread_id`, `reactions`

**🐛 系统事件** (仅 system 消息)
- 类型、级别、消息、metadata、stack
- 数据：`systemDetails` (已有，保持现有实现)

**📝 编辑历史** (已编辑消息)
- 时间、编辑者、历史内容
- 数据：`edit_history` (按时间倒序)

## 组件设计

建议拆分为 6 个子组件（`Timeline/sections/` 目录）：
- `BasicInfoSection.tsx`
- `AgentExecutionSection.tsx`
- `PerformanceMetricsSection.tsx`
- `RelatedInfoSection.tsx`
- `SystemEventSection.tsx`
- `EditHistorySection.tsx`

**样式统一**：
- 区块标题：`text-xs font-semibold text-gray-400 mb-2` + emoji
- 字段：树形结构 `├─` `└─`，标签 `text-gray-500`，值 `text-gray-300`
- JSON：`<pre>` + `bg-black/20` + `overflow-x-auto`

## 规范

**TypeScript**：
- 严格类型，避免 `any`
- 使用 `?.` 可选链访问嵌套属性
- 参考 `message.types.ts` 类型定义

**React**：
- 函数组件 + Hooks
- 子组件用 `React.memo` 包裹
- 条件渲染，默认折叠不渲染展开内容

**数据传递**：
- 在 `CompactTimelineNode` props 添加 `messageData?: MessageEntityJSON`
- 检查 `useTimelineNodes` 是否传递完整数据
- 所有嵌套字段用 `?.` 访问

**格式化**：
- Token：`n.toLocaleString('en-US')`
- 百分比：`(v * 100).toFixed(1) + '%'`
- 成本：`'$' + c.toFixed(4)`
- 延迟：< 1000ms 显示 ms，否则显示 s
- 时间：`new Date(iso).toLocaleString('zh-CN', {...})`
- 长文本：超过 100-200 字符截断 + "展开全文"按钮

**向后兼容**：
- 保留系统事件现有功能
- 数据不存在时不显示对应区块，不能报错
- 不删除现有 props

## 测试

**场景 A - Human 消息**：
发消息 → 点击展开 → 验证基础信息、关联信息

**场景 B - Agent 消息**：
@mention Agent → 等待回复 → 点击展开 → 验证 Agent 执行、性能指标、thinking 展开、工具图标、数字格式化

**场景 C - System 事件**：
断开 WebSocket → 点击展开 → 验证系统事件、metadata JSON、stack

**场景 D - 编辑消息**：
发消息 → 编辑 → 点击展开 → 验证编辑历史

**UI 检查**：
- 展开内容在卡片内部
- 使用 `border-t` 分隔，无 `bg-black/30`
- 动画流畅
- 响应式正常

**数据检查**：
- 所有字段正确显示
- 格式化正确
- 空值不报错
- 长文本截断正常

**回归检查**：
- 筛选、搜索、分组功能正常
- 系统事件展开正常
- WebSocket 实时更新正常

## 提交

```
feat(channel): 优化时间轴展开 UI 和信息展示

- UI：展开内容移到卡片内部，去除黑色背景
- 新增 6 大信息维度：基础/Agent执行/性能/关联/系统/编辑
- 格式化工具函数 + 长文本截断
- 性能优化：条件渲染 + memo

测试：Human/Agent/System/编辑 4 个场景通过
```

---

**版本**: 3.0 简洁版  
**时间**: 2026-06-15
