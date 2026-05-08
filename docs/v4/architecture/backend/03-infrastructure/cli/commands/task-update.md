# slock task update

更新任务状态或其他属性。

## 语法

```bash
slock task update --task-id <id> [options]
```

## 参数

| 参数 | 必需 | 说明 |
|------|------|------|
| `--task-id <id>` | 是 | 任务编号（如 `#5`） |
| `--status <status>` | 否 | 更新任务状态 |
| `--title <text>` | 否 | 更新任务标题 |
| `--assignee <user>` | 否 | 更新任务负责人 |

## 任务状态

| 状态 | 说明 |
|------|------|
| `todo` | 待处理 |
| `in_progress` | 进行中 |
| `in_review` | 审核中 |
| `done` | 已完成 |

## 状态流转规则

```
todo → in_progress → in_review → done
  ↑         ↓            ↓
  └─────────┴────────────┘
```

- `todo` → `in_progress`: 认领任务时自动转换
- `in_progress` → `in_review`: 工作完成，等待审核
- `in_review` → `done`: 审核通过
- 任何状态 → `todo`: 重新打开任务

## 示例

### 更新任务状态

```bash
# 标记为审核中
slock task update --task-id 5 --status in_review

# 标记为完成
slock task update --task-id 5 --status done

# 重新打开任务
slock task update --task-id 5 --status todo
```

### 更新任务标题

```bash
slock task update --task-id 5 --title "Fix login bug (urgent)"
```

### 更新负责人

```bash
# 分配给其他人
slock task update --task-id 5 --assignee "@alice"

# 取消分配
slock task update --task-id 5 --assignee ""
```

### 组合更新

```bash
# 同时更新状态和负责人
slock task update --task-id 5 --status in_progress --assignee "@bob"
```

## 输出

**成功**:
```
✓ Updated task #5
  Status: in_progress → in_review
```

**JSON 格式** (`--json`):
```json
{
  "ok": true,
  "data": {
    "task_id": 5,
    "title": "Fix login bug",
    "status": "in_review",
    "assignee": "@bob",
    "updated_at": "2026-05-08T13:42:00Z"
  }
}
```

## 权限

- 任何人都可以更新 `status` 为 `in_review` 或 `done`
- 只有任务负责人或管理员可以更新 `assignee`
- 只有任务创建者或管理员可以更新 `title`

## 错误

| 错误码 | 说明 |
|--------|------|
| `UPDATE_FAILED` | 更新失败 |
| `TASK_NOT_FOUND` | 任务不存在 |
| `INVALID_STATUS` | 无效的状态值 |
| `PERMISSION_DENIED` | 权限不足 |

## 工作流程示例

```bash
# 1. 认领任务
slock task claim --task-id 5

# 2. 工作中...（在任务线程中更新进度）
slock message send --target "#general:a1b2c3d4" <<'EOF'
Completed step 1/3
EOF

# 3. 完成工作，标记为审核中
slock task update --task-id 5 --status in_review

# 4. 审核通过后，标记为完成
slock task update --task-id 5 --status done
```

## 相关命令

- [task list](./task-list.md) - 查看任务列表
- [task claim](./task-claim.md) - 认领任务
- [task unclaim](./task-unclaim.md) - 释放任务
