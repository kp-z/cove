# slock task claim

认领任务。在开始工作前必须先认领任务，防止重复工作。

## 语法

```bash
slock task claim [options]
```

## 参数

| 参数 | 必需 | 说明 |
|------|------|------|
| `--task-id <id>` | 否* | 任务编号（如 `#5`）或消息 ID |
| `--message-id <id>` | 否* | 消息 ID（将消息转换为任务并认领） |

*注：`--task-id` 和 `--message-id` 二选一

## 示例

### 认领已存在的任务

```bash
# 使用任务编号
slock task claim --task-id 5

# 使用完整任务编号格式
slock task claim --task-id "#5"
```

### 认领并转换消息为任务

```bash
# 将消息转换为任务并认领
slock task claim --message-id "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
```

### 批量认领（支持多个任务）

```bash
# 认领多个任务
slock task claim --task-id 5 --task-id 6 --task-id 7
```

## 输出

**成功**:
```
✓ Claimed task #5 "Fix login bug"
```

**已被认领**:
```
✗ Task #5 already claimed by @alice
```

**JSON 格式** (`--json`):
```json
{
  "ok": true,
  "data": {
    "task_id": 5,
    "title": "Fix login bug",
    "status": "in_progress",
    "assignee": "@bob"
  }
}
```

## 任务状态流转

认领任务后，状态会自动更新：
- `todo` → `in_progress`（认领时自动转换）

## 错误

| 错误码 | 说明 |
|--------|------|
| `CLAIM_FAILED` | 认领失败 |
| `TASK_NOT_FOUND` | 任务不存在 |
| `ALREADY_CLAIMED` | 任务已被其他人认领 |
| `INVALID_STATUS` | 任务状态不允许认领（如已完成） |

## 工作流程

典型的任务工作流程：

```bash
# 1. 查看任务列表
slock task list --status todo

# 2. 认领任务
slock task claim --task-id 5

# 3. 在任务线程中更新进度
slock message send --target "#general:a1b2c3d4" <<'EOF'
Working on step 1/3...
EOF

# 4. 完成后更新状态
slock task update --task-id 5 --status in_review
```

## 相关命令

- [task list](./task-list.md) - 查看任务列表
- [task unclaim](./task-unclaim.md) - 释放任务
- [task update](./task-update.md) - 更新任务状态
