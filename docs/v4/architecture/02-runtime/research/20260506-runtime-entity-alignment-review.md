# Runtime 层与 Entity 层对齐审查报告

**日期**: 2026-05-06  
**审查人**: @Runtime_Engineer  
**审查范围**: `02-runtime/` vs `01-entities/`

---

## 一、对齐问题汇总

### 🔴 P0：Entity 不存在但被 Runtime 引用

#### 问题 1：ConversationEntity 未定义

**位置**: `02-runtime/examples/daemon/daemon.yaml` → `service_entities`

```yaml
# daemon.yaml 中
service_entities:
  - "AgentEntity"
  - "ConversationEntity"   # ❌ 01-entities/ 中不存在此实体
  - "MessageEntity"
  - "ExecutionEntity"
```

**Entity 层实际情况**:
- `01-entities/` 中无 `ConversationEntity` 目录
- 对话上下文以文件形式存储在 `agents/{id}/workspace/conversation/conv-xxx.jsonl`
- `channel.yaml` 中有 `conversation_pool` 字段，但 conversation 不是独立实体

**修复方案**（二选一）:
- **方案 A（推荐）**: 从 `daemon.yaml` 的 `service_entities` 中删除 `ConversationEntity`，对话上下文通过 `MessageEntity` 和 workspace 文件管理
- **方案 B**: 在 `01-entities/` 中正式定义 `ConversationEntity`，明确其数据结构

---

#### 问题 2：MemberEntity 未定义

**位置**: `02-runtime/examples/channel-runtime/channel-runtime.yaml` → `service_entities`

```yaml
# channel-runtime.yaml 中
service_entities:
  - "ChannelEntity"
  - "MessageEntity"
  - "MemberEntity"   # ❌ 01-entities/ 中不存在此实体
```

**Entity 层实际情况**:
- `01-entities/` 中无 `MemberEntity` 目录
- 成员信息内嵌在 `channel.yaml` 的 `members[]` 数组中，不是独立实体

```yaml
# channel.yaml 中 members 是内嵌数组
members:
  - member_id: "user-001"
    member_type: "human"
    role: "owner"
```

**修复方案**（二选一）:
- **方案 A（推荐）**: 将 `service_entities` 中的 `MemberEntity` 改为 `ChannelEntity`（成员通过 ChannelEntity 管理）
- **方案 B**: 在 `01-entities/` 中正式定义 `MemberEntity`，将成员从 ChannelEntity 中抽离

---

### ✅ 已对齐（Alice 审查后已修复）

| 问题 | 状态 |
|------|------|
| ChannelRuntime `member_name` 字段 | ✅ 已存在 |
| ChannelRuntime `current_activity` 字段 | ✅ 已存在（非 `last_active`）|
| ExecutionRuntime `errors_and_warnings` 字段 | ✅ 已正确（非 `errors_realtime`）|
| trigger_type 字段命名 | ✅ 与 Entity 层一致 |
| features 字段命名 | ✅ 与 Entity 层一致（非 capabilities）|
| name kebab-case 规范 | ✅ 已对齐 |

---

### 🟡 P1：路径引用偏差

**位置**: `design/runtime-layer.md` 第 62-68 行

```yaml
# 文档中引用的路径（旧路径）
docs/v4/architecture/runtime/examples/
```

**实际路径**:
```
docs/v4/architecture/02-runtime/examples/
```

**修复**: 更新 `runtime-layer.md` 中的示例文件路径引用。

---

## 二、Runtime 生命周期图

### 2.1 AgentDaemon 生命周期

```
                    ┌─────────────────────────────────────────────┐
                    │              AgentDaemon 生命周期             │
                    └─────────────────────────────────────────────┘

  [系统启动 / 触发器触发 / 手动启动]
           │
           ▼
    ┌─────────────┐
    │  STARTING   │  环境检查 → 配置验证 → Skills 加载 → 组件初始化
    └──────┬──────┘
           │ 成功
           ▼
    ┌─────────────┐     收到消息/触发器
    │   RUNNING   │◄────────────────────────────────────┐
    └──────┬──────┘                                     │
           │                                            │
     ┌─────┴──────┐                                     │
     │            │                                     │
     ▼            ▼                                     │
┌─────────┐  ┌─────────┐                               │
│ 处理消息 │  │ 执行触发 │                               │
│(Inbox)  │  │  器任务  │                               │
└────┬────┘  └────┬────┘                               │
     │            │                                     │
     ▼            ▼                                     │
┌─────────────────────┐                                │
│   ExecutionRuntime  │  (子生命周期，见 2.4)            │
└──────────┬──────────┘                                │
           │ 完成                                       │
           └───────────────────────────────────────────┘
           
           │ 无任务时
           ▼
    ┌─────────────┐
    │  SLEEPING   │  心跳维持，等待唤醒
    └──────┬──────┘
           │ 收到消息
           └──────────────────────────────────────────►（回到 RUNNING）

           │ 收到停止信号
           ▼
    ┌─────────────┐
    │  STOPPING   │  保存状态检查点 → 等待执行完成 → 注销心跳
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   STOPPED   │
    └─────────────┘

  崩溃恢复路径：
    RUNNING ──[崩溃]──► 检测心跳超时 ──► 读取检查点 ──► STARTING（重启）
```

**关键约束**（来自 Entity 层）:
- `status` 值：`starting | running | sleeping | stopping | stopped`（与 daemon.yaml 一致）
- 心跳间隔：30s，超时：90s（来自 daemon.yaml `heartbeat_thread`）
- 最大并发执行：`runtime.yaml` 中 `resources.max_concurrent_tasks`（默认 5）

---

### 2.2 ChannelRuntime 生命周期

```
                    ┌─────────────────────────────────────────────┐
                    │            ChannelRuntime 生命周期            │
                    └─────────────────────────────────────────────┘

  [Channel 创建 / 系统启动]
           │
           ▼
    ┌─────────────┐
    │   ACTIVE    │  WebSocket 监听 + 消息队列处理 + 成员状态同步
    └──────┬──────┘
           │
     ┌─────┴──────────────────────────────┐
     │                                    │
     ▼                                    ▼
┌──────────────────┐              ┌──────────────────┐
│  消息入队         │              │  成员状态更新      │
│  (MessageEntity) │              │  (online_members) │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│  路由到目标成员   │              │  WebSocket 推送   │
│  (Agent/Human)   │              │  presence 事件    │
└──────────────────┘              └──────────────────┘

  WebSocket 连接生命周期：
    连接建立 ──► 注册到 online_members ──► 心跳维持
         │
         ▼
    断开检测 ──► 从 online_members 移除 ──► 通知其他成员

  Channel 归档：
    ACTIVE ──[归档操作]──► INACTIVE ──► ARCHIVED（不可写）
```

**关键约束**（来自 Entity 层）:
- `status` 值：`active | inactive | archived`（与 channel.yaml 一致）
- `online_members[].member_type`：`human | agent`（来自 channel.yaml `members[].member_type`）
- `online_members[].current_activity`：运行时状态，不存储在 Entity 层

---

### 2.3 WorkflowRuntime 生命周期

```
                    ┌─────────────────────────────────────────────┐
                    │           WorkflowRuntime 生命周期            │
                    └─────────────────────────────────────────────┘

  [OKR KR 触发 / 手动触发]
           │
           ▼
    ┌─────────────┐
    │   PENDING   │  加载 WorkflowEntity → 解析 DAG → 分配 Agent
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   RUNNING   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────────────────────────────────┐
    │                  步骤调度循环                     │
    │                                                 │
    │  step[0] ──► step[1] ──► step[2] ──► ...        │
    │     │           │           │                   │
    │  [串行]      [并行分支]   [条件分支]              │
    │                 │                               │
    │          step[2a] + step[2b]                    │
    │          (同时执行，等待全部完成)                  │
    └──────────────────────┬──────────────────────────┘
                           │ 所有步骤完成
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │  更新 OKR KR 进度
                    └─────────────┘

  异常路径：
    RUNNING ──[步骤失败]──► 重试（max_retries 次）──► 仍失败 ──► FAILED
    RUNNING ──[手动暂停]──► PAUSED ──[恢复]──► RUNNING
```

**关键约束**（来自 Entity 层）:
- `status` 值：`pending | running | paused | completed | failed`（与 workflow-runtime.yaml 一致）
- `kr_id` 关联 OKREntity（WorkflowEntity 通过 OKR KR 触发）
- 每个步骤对应一个 `ExecutionRuntime`（子生命周期）

---

### 2.4 ExecutionRuntime 生命周期

```
                    ┌─────────────────────────────────────────────┐
                    │           ExecutionRuntime 生命周期           │
                    └─────────────────────────────────────────────┘

  [AgentDaemon 调度 / WorkflowRuntime 触发]
           │
           ▼
    ┌─────────────┐
    │   PENDING   │  创建 workspace 沙箱 → 加载上下文 → 初始化日志流
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   RUNNING   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────────────────────────────────┐
    │                  工具调用循环                     │
    │                                                 │
    │  thinking ──► tool_call ──► tool_result ──►     │
    │      │                                          │
    │      └──► 写入 execution.jsonl（JSONL 格式）     │
    │                                                 │
    │  每次工具调用：                                   │
    │  - 更新 realtime_state.current_tool             │
    │  - 更新 token_usage_realtime                    │
    │  - 追加 file_changes_realtime（如有文件变更）     │
    └──────────────────────┬──────────────────────────┘
                           │ 输出消息生成完毕
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │  写入 ExecutionEntity metadata.yaml
                    └─────────────┘  更新 AgentDaemon 统计

  超时路径：
    RUNNING ──[超时]──► SIGTERM ──[grace 5s]──► SIGKILL ──► FAILED
    
  取消路径：
    RUNNING ──[用户取消]──► SIGTERM ──► CANCELLED
```

**关键约束**（来自 Entity 层）:
- `status` 值：`pending | running | completed | failed | cancelled`（与 execution-entity.md 一致）
- 日志格式：JSONL，每行一个 JSON 对象（来自 ExecutionEntity 定义）
- 日志类型：`execution_start | thinking | tool_call | skill_invoke | log | file_change | error | token_usage | cost | execution_end`
- workspace 路径：`agents/{agent_id}/workspace/`（与 Entity 层对齐）

---

## 三、修复建议

### 立即修复（P0）

**修复 1**: `daemon.yaml` 删除 `ConversationEntity`

```yaml
# 修改前
service_entities:
  - "AgentEntity"
  - "ConversationEntity"   # 删除
  - "MessageEntity"
  - "ExecutionEntity"

# 修改后
service_entities:
  - "AgentEntity"
  - "MessageEntity"
  - "ExecutionEntity"
```

**修复 2**: `channel-runtime.yaml` 删除 `MemberEntity`

```yaml
# 修改前
service_entities:
  - "ChannelEntity"
  - "MessageEntity"
  - "MemberEntity"   # 删除

# 修改后
service_entities:
  - "ChannelEntity"
  - "MessageEntity"
```

### 短期修复（P1）

**修复 3**: 更新 `design/runtime-layer.md` 中的示例文件路径引用（旧路径 → 新路径）

---

## 四、总体评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 字段命名对齐 | 95/100 | trigger_type、features、kebab-case 全部对齐 |
| Entity 引用准确性 | 75/100 | ConversationEntity、MemberEntity 未定义 |
| 生命周期状态值 | 100/100 | 所有 status 值与 Entity 层完全一致 |
| 路径引用 | 85/100 | 少量旧路径引用需更新 |
| **总体** | **89/100** | 主要问题是引用了未定义的 Entity |

---

**审查完成时间**: 2026-05-06  
**下一步**: 修复 P0 问题（删除未定义 Entity 引用），更新路径引用
