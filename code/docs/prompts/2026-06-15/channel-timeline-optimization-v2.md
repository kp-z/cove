# Channel 时间轴工具优化 - Agent Prompt

**创建时间**: 2026-06-15  
**任务类型**: UI/UX 优化 + 功能增强  
**预计时长**: 2-3 小时

---

## 任务描述

优化 Channel 页面中间的时间轴调试工具，解决两个核心问题：

1. **UI 问题**：展开内容显示在卡片下方的独立黑色区域，视觉上分离，需要整合到卡片内部
2. **信息不足**：缺少关键调试信息（Agent 执行元数据、性能指标、关联信息等），无法全方位追踪对话链路

---

## 第一步：理解现状

### 1.1 探索当前实现

**主要文件位置**：
```
cloud/frontend/src/features/channel/components/Timeline/
├── CompactTimelineNode.tsx      # 核心组件（重点关注第 111-217 行）
├── index.tsx                    # Timeline 主组件
└── nodes/
    └── SystemNode.tsx           # 系统节点实现

cloud/frontend/src/features/channel/hooks/
└── useTimelineNodes.ts          # 数据转换逻辑

cloud/backend/src/domain/models/message/
└── message.types.ts             # 数据结构定义（参考）
```

**探索任务**：
- [ ] 阅读 `CompactTimelineNode.tsx`，理解当前的 DOM 结构和样式
- [ ] 找到展开内容的渲染位置（第 186 行附近，关键词：`isExpanded`、`bg-black/30`）
- [ ] 理解为什么展开内容显示在"下方"（提示：查看 DOM 层级关系，是兄弟元素还是子元素）
- [ ] 查看当前展开内容显示了哪些信息（systemDetails 包含什么）
- [ ] 检查 `useTimelineNodes.ts`，了解从后端到前端的数据流

### 1.2 分析数据结构

**后端数据结构**（参考 `message.types.ts`）：
- [ ] 了解 `MessageEntityJSON` 包含哪些字段
- [ ] 重点关注：
  - `agent_execution_metadata`（Agent 执行元数据）
  - `tool_logs`（工具调用日志）
  - `usage`（token 使用、成本、延迟）
  - `mentions`、`references`（关联信息）
  - `edit_history`（编辑历史）
  - `reactions`（表情反应）
- [ ] 确认这些字段是否已经传递到前端

### 1.3 识别问题根源

**UI 问题根源**：
- 找到导致"黑色卡片在下方"的 CSS 类：`ml-9 mt-2 bg-black/30`
- 理解 DOM 结构：展开内容是主卡片的**兄弟元素**还是**子元素**？
- 分析布局：使用了什么布局方式（grid、flex）？

**信息不足根源**：
- 当前只显示了系统事件的 `message`、`metadata`、`stack`
- Agent 消息的执行元数据、性能指标没有展示
- 普通消息的关联信息、编辑历史没有展示

---

## 第二步：设计优化方案

### 2.1 UI 重构目标

**核心原则**：展开内容应该在卡片**内部**，而不是下方的独立区域

**设计要求**：
- 主行和展开内容在**同一个视觉容器**内
- 使用**内边框**（`border-t`）分隔，而不是深色背景
- 保持**紧凑**：去除多余的 margin（`ml-9 mt-2`）
- 添加**动画**：平滑的展开/收起效果（建议使用 Tailwind 的 `transition`）

**布局结构建议**：
```
当前（问题）：
<div>
  <主行卡片 />
  <展开内容（兄弟元素，黑色背景）/>
</div>

优化后（目标）：
<div>
  <卡片容器>
    <主行 />
    <展开内容（子元素，内边框分隔）/>
  </卡片容器>
</div>
```

### 2.2 信息架构设计

设计 **6 大信息维度**，全方位追踪对话链路：

**维度 1：📊 基础信息**（所有消息）
- 显示内容：Message ID、Short ID、状态、类型、创建时间、是否编辑
- 数据来源：`message_id`、`msg_short_id`、`status`、`content_type`、`created_at`、`is_edited`

**维度 2：🤖 Agent 执行元数据**（仅 Agent 消息）
- 显示内容：
  - 执行模式（API/CLI/SDK）
  - 流式状态（thinking/tool_use/responding/completed）
  - 执行时长（started_at → completed_at）
  - 思考过程（thinking，可能很长，需要截断 + "展开全文"按钮）
  - 工具调用列表（tool_logs 数组）
    - 每个工具：名称、状态（图标：✓ success | ✗ error | ⟳ running | ⏸ pending）、时长、简要结果
- 数据来源：`agent_execution_metadata` 对象
- 注意：并非所有 Agent 消息都有这个字段，需要空值检查

**维度 3：⚡ 性能指标**（仅 Agent 消息）
- 显示内容：
  - 使用的模型（model）
  - Token 使用量（input/output/total，**千位分隔符**格式化）
  - 缓存统计（命中率**百分比 1 位小数**，缓存读取/创建 tokens）
  - 延迟指标（TTFT、总时长、tokens/s）
  - 成本明细（input/output/cache/total，**4 位小数**，美元符号）
- 数据来源：`agent_execution_metadata.usage` 对象
- 格式化要求：
  - Numbers: 千位分隔符（1,234）
  - Percentage: 1 位小数（85.3%）
  - Cost: 4 位小数（$0.0234）
  - Latency: < 1000ms 显示毫秒，>= 1000ms 显示秒

**维度 4：🔗 关联信息**（所有消息）
- 显示内容：
  - Mentions（@agent、@user、#channel、@task）
  - References（task、plan、agent、file、url）
  - 线程信息（是否根消息、回复数量）
  - 表情反应（emoji + 数量）
- 数据来源：`mentions`、`references`、`thread_id`、`is_thread_root`、`reactions`
- 条件显示：至少有一种数据才显示此区块

**维度 5：🐛 系统事件详情**（仅 system 消息）
- 显示内容：
  - 事件类型（websocket.*、message.*、error.* 等）
  - 事件级别（INFO/WARN/ERROR/DEBUG，彩色标签）
  - 事件消息
  - Metadata（JSON 格式化，使用 `<pre>` 标签）
  - Stack Trace（仅 error 级别，可折叠）
- 数据来源：`systemDetails` 对象（已有）
- 保持现有实现，不要破坏

**维度 6：📝 编辑历史**（已编辑的消息）
- 显示内容：
  - 编辑时间、编辑者、历史内容
  - 按时间倒序显示
- 数据来源：`edit_history` 数组
- 条件显示：`is_edited === true` 且 `edit_history.length > 0`

### 2.3 组件架构建议

**模块化设计**：
- 考虑将每个信息维度拆分为独立的子组件
- 建议目录结构：`Timeline/sections/` 下创建 6 个 Section 组件
- 每个 Section 组件接收对应的数据 props，负责渲染和格式化
- 使用 `React.memo` 优化性能

**条件渲染逻辑**：
- 根据 `sender_type` 判断是否显示 Agent 相关区块
- 根据数据可用性（`?.` 可选链）判断是否显示各个区块
- 所有区块都应该是**可选的**，不能假设数据一定存在

**样式统一**：
- 区块标题：小号字体（`text-xs`）、灰色（`text-gray-400`）、加粗、加 emoji 图标
- 字段标签：树形结构，使用 `├─` 和 `└─` 字符
- 字段值：正常灰白色（`text-gray-300`）
- JSON 数据：使用 `<pre>` 标签，等宽字体，深色背景（`bg-black/20`）

---

## 第三步：实施规范

### 3.1 代码规范

**TypeScript 类型要求**：
- 所有新增的 props 接口必须使用 TypeScript 严格类型
- 避免使用 `any`，使用 `unknown` 并进行类型守卫
- 使用 `?.` 可选链访问嵌套属性
- 参考 `message.types.ts` 中的类型定义

**React 最佳实践**：
- 使用函数组件 + Hooks
- 使用 `React.memo` 包裹子组件避免不必要的重渲染
- 使用 `useState` 管理展开/收起状态
- 使用条件渲染（`&&`、三元运算符）而不是 `display: none`

**样式规范**：
- 使用 Tailwind CSS 原子类，不要写自定义 CSS
- 保持与现有深色主题一致
- 响应式设计：考虑移动端的显示效果
- 动画：使用 `transition-all duration-200` 或 Tailwind 的 `animate-in`

**性能优化**：
- 默认折叠状态，展开内容不渲染（条件渲染）
- 长文本（thinking、stack）提供"展开/收起"按钮，默认截断
- 避免在渲染函数中创建新对象或数组

### 3.2 数据传递规范

**Props 设计**：
- 在 `CompactTimelineNode` 的 props 接口中添加 `messageData` 字段
- `messageData` 应该包含完整的 `MessageEntityJSON` 或至少包含所有展示需要的字段
- 保持向后兼容，不要删除现有的 props

**数据流检查**：
- 确认 `useTimelineNodes` 是否正确传递了完整的 message 数据
- 如果数据不完整，需要修改 `useTimelineNodes.ts` 的转换逻辑
- 注意字段命名：后端是 `snake_case`，前端可能是 `camelCase`

**空值处理**：
- 所有嵌套属性访问都要使用 `?.` 可选链
- 在条件渲染时检查数据是否存在
- 示例：`{messageData?.agent_execution_metadata?.thinking && <显示>}`

### 3.3 格式化规范

**数字格式化**：
- Token 数量：千位分隔符（`n.toLocaleString('en-US')`）
- 百分比：1 位小数（`(v * 100).toFixed(1) + '%'`）
- 成本：4 位小数 + 美元符号（`'$' + c.toFixed(4)`）
- 延迟：< 1000ms 显示毫秒，>= 1000ms 显示秒

**时间格式化**：
- ISO 8601 字符串转本地时间
- 格式：`YYYY-MM-DD HH:mm:ss`
- 使用 `new Date().toLocaleString('zh-CN', {...})`

**长文本处理**：
- 超过 100-200 字符的文本需要截断
- 提供"展开全文"/"收起"按钮
- 使用 `useState` 管理展开状态

**图标映射**：
- Tool 状态：pending → ⏸ | running → ⟳ | success → ✓ | error → ✗
- 建议创建工具函数统一管理

### 3.4 向后兼容

**保留现有功能**：
- 系统事件的展开功能必须保持正常工作
- 不要删除或修改现有的 `systemDetails` 相关代码
- 确保旧的时间轴筛选、搜索、分组功能不受影响

**渐进增强**：
- 新增的信息区块应该是**可选的**
- 如果数据不存在，不显示对应区块，不能报错
- 确保在没有 `messageData` 的情况下，组件仍能正常工作（显示基础信息）

---

## 第四步：测试验证

### 4.1 开发环境测试

**启动开发服务器**：
```bash
cd cloud/frontend
npm run dev
```

**测试场景 A：Human 消息**
- [ ] 在 channel 中发送普通文本消息
- [ ] 点击时间轴节点，检查是否能展开
- [ ] 验证展开内容在卡片**内部**，无独立黑色卡片
- [ ] 验证显示：基础信息区块
- [ ] 验证显示：关联信息区块（如果有 mentions/references）

**测试场景 B：Agent 消息**
- [ ] 触发 Agent 自动响应（@mention 或在 agentPool 的频道发消息）
- [ ] 等待 Agent 回复完成
- [ ] 点击 Agent 消息节点展开
- [ ] 验证显示：基础信息区块
- [ ] 验证显示：Agent 执行区块（模式、状态、时长、thinking、工具调用）
- [ ] 验证显示：性能指标区块（模型、tokens、缓存、延迟、成本）
- [ ] 验证数字格式化正确（千位分隔符、百分比、成本）
- [ ] 测试 thinking 的"展开全文"功能
- [ ] 测试工具调用列表的状态图标

**测试场景 C：System 事件**
- [ ] 触发系统事件（例如：断开 WebSocket，刷新页面）
- [ ] 点击系统事件节点展开
- [ ] 验证显示：系统事件区块（type、level、message、metadata）
- [ ] 验证 metadata JSON 格式化正确
- [ ] 如果是 error 级别，验证 stack trace 显示

**测试场景 D：编辑消息**
- [ ] 发送一条消息
- [ ] 编辑该消息内容（修改文本）
- [ ] 点击消息节点展开
- [ ] 验证显示：编辑历史区块
- [ ] 验证显示编辑时间、编辑者、历史内容

### 4.2 UI/UX 验证

**视觉检查**：
- [ ] 展开内容在卡片内部（不是下方的独立黑色区域）
- [ ] 使用 `border-t` 分隔线，颜色为 `border-white/10`
- [ ] 主行和展开内容背景一致（同一个卡片容器）
- [ ] 深色主题协调，没有突兀的颜色

**交互检查**：
- [ ] 点击主行能正常展开/收起
- [ ] 展开/收起动画流畅（约 200ms）
- [ ] "展开全文"/"收起"按钮工作正常
- [ ] 长文本截断正确，点击能展开完整内容

**响应式检查**：
- [ ] 在不同屏幕宽度下测试（桌面、平板、移动）
- [ ] 确保长文本（ID、thinking）不会溢出或破坏布局
- [ ] 确保 JSON 数据有横向滚动条（`overflow-x-auto`）

### 4.3 数据准确性验证

**字段显示检查**：
- [ ] 所有字段值与后端数据一致
- [ ] 时间戳格式正确（本地时间，非 UTC）
- [ ] Token 数量、成本计算正确
- [ ] 百分比计算正确（缓存命中率）

**空值处理检查**：
- [ ] 测试没有 `agent_execution_metadata` 的 Agent 消息
- [ ] 测试没有 `mentions`/`references` 的消息
- [ ] 测试没有 `edit_history` 的消息
- [ ] 确保在数据缺失时不会报错，对应区块不显示

**边界情况检查**：
- [ ] 测试非常长的 thinking（> 1000 字符）
- [ ] 测试工具调用数量很多的情况（> 10 个）
- [ ] 测试编辑历史很多的情况（> 5 次编辑）
- [ ] 测试消息 ID 很长的情况

### 4.4 性能验证

**渲染性能**：
- [ ] 打开 React DevTools Profiler
- [ ] 测试展开/收起操作，检查是否有不必要的重渲染
- [ ] 测试滚动时间轴列表，检查是否流畅（60fps）

**内存检查**：
- [ ] 打开 Chrome DevTools Memory
- [ ] 多次展开/收起，检查是否有内存泄漏
- [ ] 长时间使用时间轴，检查内存是否持续增长

### 4.5 回归测试

**现有功能检查**：
- [ ] 时间轴筛选功能正常（按类型、时间范围、搜索）
- [ ] 时间轴分组功能正常（today、yesterday、thisWeek、older）
- [ ] 系统事件的展开功能正常（没有被破坏）
- [ ] 点击消息节点能正确跳转到消息详情
- [ ] WebSocket 实时更新正常

---

## 第五步：提交标准

### 5.1 代码质量

- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告
- [ ] 代码格式化（Prettier）
- [ ] 无 `console.log` 调试语句
- [ ] 无注释掉的代码

### 5.2 文档

- [ ] 在 PR 描述中说明优化内容（UI 变化 + 新增信息维度）
- [ ] 提供优化前后的对比截图
- [ ] 列出测试过的场景
- [ ] 说明已知的限制或待优化点

### 5.3 Commit 规范

建议的 commit message：
```
feat(channel): 优化时间轴展开内容 UI 和信息展示

- 将展开内容从卡片下方移到卡片内部
- 去除独立黑色背景，改用内边框分隔
- 新增 6 大信息维度：基础信息、Agent 执行、性能指标、关联信息、系统事件、编辑历史
- 添加数字格式化工具函数
- 优化长文本展示（截断 + 展开全文）
- 性能优化：条件渲染 + React.memo

验证：
- 测试 Human/Agent/System 消息展开
- 验证数据准确性和格式化
- 确认现有功能无回归
```

---

## 注意事项

1. **不要过度设计**：只实现需求中提到的 6 大信息维度，不要添加额外功能
2. **保持简洁**：代码应该清晰易读，不要过度抽象
3. **优先可用性**：先实现功能，再优化性能和动画
4. **遇到问题及时沟通**：如果数据结构不符合预期，或遇到技术难点，及时反馈

---

**Prompt 版本**: 2.0  
**最后更新**: 2026-06-15  
**适用对象**: 前端开发 Agent / 人类开发者
